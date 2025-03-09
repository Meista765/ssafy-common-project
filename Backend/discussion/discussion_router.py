import datetime
import json
import logging
import os
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import List

import aiofiles
import speech_recognition as sr
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models import Discussion, Novel, Note, User
from utils.auth_utils import get_current_user
from . import discussion_crud, discussion_schema
from .discussion_func.discussion_rag import GeminiDiscussionAssistant

GEMINI_API_KEY = os.environ["GEMINI_API_KEY"]
DOCUMENT_PATH = "./document_path"  # txt 파일 저장 디렉토리

router = APIRouter(
    prefix="/api/v1/discussion",
)

@router.get("/", description="토론 방 전체 조회", response_model=List[discussion_schema.Discussion])
def get_all_discussions(db: Session = Depends(get_db)):
    """
    모든 토론 방 목록 조회.
    """
    return discussion_crud.get_discussions(db)


@router.get("/{discussion_pk}", response_model=discussion_schema.Discussion)
def get_discussion(discussion_pk: int, db: Session = Depends(get_db)):
    """
    특정 토론 방 조회
    """
    return discussion_crud.get_discussion(db, discussion_pk)


@router.get("/enter-room/{discussion_pk}")
def enter_discussion_room(
    discussion_pk: int, user_pk: int, db: Session = Depends(get_db)
):
    """
    특정 토론 방 접속 : user가 해당 토론 방에 예약된 participant인지 확인 후, 예약된 방의 session_id 던져주는 로직
    """
    return discussion_crud.get_discussion_sessionid(db, discussion_pk, user_pk)


@router.post("/", response_model=discussion_schema.GetNewDiscussion, status_code=status.HTTP_201_CREATED)
def create_discussion(
    discussion: discussion_schema.NewDiscussionForm,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    새로운 토론 방 생성 (로그인한 사용자만 가능)
    토론방 생성 후 자동으로 소설 txt 파일도 생성
    """
    # 1. 토론방 생성
    new_discussion = discussion_crud.create_discussion_db(db, discussion, current_user)
    
    # 2. txt 파일 생성
    discussion_crud.create_novel_txt_file(new_discussion.discussion_pk, db)

    return new_discussion


@router.post("/{discussion_pk}/participants/{user_pk}", response_model=discussion_schema.Discussion, description="토론방 유저 추가")
def add_participant(discussion_pk: int, user_pk: int, db: Session = Depends(get_db)):
    """
    토론 방에 유저 추가.
    """
    return discussion_crud.add_participant(db, discussion_pk, user_pk)


@router.delete( "/{discussion_pk}/participants/{user_pk}", response_model=discussion_schema.Discussion, description="토론방 유저 삭제")
def remove_participant(discussion_pk: int, user_pk: int, db: Session = Depends(get_db)):
    """
    토론 방에서 유저 삭제.
    """
    return discussion_crud.remove_participant(db, discussion_pk, user_pk)


@router.put("/{discussion_pk}", response_model=discussion_schema.Discussion)
def update_discussion(
    discussion_pk: int,
    discussion_update: discussion_schema.NewDiscussionForm,
    db: Session = Depends(get_db),
):
    """
    토론 방 정보 수정.
    """
    updated_discussion = discussion_crud.update_discussion(
        db, discussion_pk, discussion_update
    )
    return updated_discussion


@router.delete("/{discussion_pk}", status_code=status.HTTP_200_OK)
def delete_discussion(discussion_pk: int, db: Session = Depends(get_db)):
    """
    토론 방 삭제.
    """
    discussion_crud.delete_discussion(db, discussion_pk)
    return {"message": "토론 방 삭제 완료"}

UPLOAD_DIR = Path("audio_uploads")

def process_audio_sync(file_path):
    """
    동기식 음성 처리 함수
    ThreadPoolExecutor에서 실행될 함수
    """
    recognizer = sr.Recognizer()
    try:
        with sr.AudioFile(str(file_path)) as source:
            audio_data = recognizer.record(source)
            text = recognizer.recognize_google(audio_data, language="ko-KR")
        return text
    except sr.UnknownValueError:
        print(f"음성을 인식할 수 없습니다: {file_path}")
        return ""
    except sr.RequestError as e:
        print(f"Google 음성 인식 서비스 오류: {e}")
        return "음성 인식 서비스 오류"
    except Exception as e:
        print(f"음성 처리 중 오류 발생: {e}")
        return "음성 처리 오류"


def get_thread_pool(request: Request) -> ThreadPoolExecutor:
    thread_pool = request.app.state.thread_pool
    if not thread_pool:
        raise RuntimeError("ThreadPoolExecutor is not initialized")
    return thread_pool


async def process_audio_to_text(
    file_path: str, thread_pool: ThreadPoolExecutor = Depends(get_thread_pool)
):
    import asyncio

    # ThreadPoolExecutor에서 동기 함수 실행
    loop = asyncio.get_event_loop()
    text = await loop.run_in_executor(thread_pool, process_audio_sync, file_path)
    return text


@router.post("/audio")
async def receive_audio(
    request: Request,
    audio: UploadFile = File(...),
    roomName: str = Form(...),
    userName: str = Form(...),
):
    try:
        # 방 폴더 생성
        room_dir = UPLOAD_DIR / roomName
        room_dir.mkdir(parents=True, exist_ok=True)

        # 사용자 폴더 생성
        user_dir = room_dir / userName
        user_dir.mkdir(exist_ok=True)

        # transcriptions 폴더 생성
        transcription_dir = user_dir / "transcriptions"
        transcription_dir.mkdir(exist_ok=True)

        # 오디오 파일 저장
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        audio_filename = f"audio_{timestamp}.wav"
        audio_path = user_dir / audio_filename

        # 파일 저장
        async with aiofiles.open(audio_path, "wb") as out_file:
            content = await audio.read()
            await out_file.write(content)

        # ThreadPoolExecutor를 사용하여 STT 변환
        thread_pool = request.app.state.thread_pool
        text = await process_audio_to_text(str(audio_path), thread_pool)

        # 변환된 텍스트 저장
        if text:
            text_filename = f"audio_{timestamp}.txt"
            text_path = transcription_dir / text_filename
            async with aiofiles.open(text_path, "w", encoding="utf-8") as f:
                await f.write(text)

        return {
            "message": "Audio processed successfully",
            "room": roomName,
            "user": userName,
            "filename": audio_filename,
            "text": text,
            "timestamp": timestamp,
        }

    except Exception as e:
        print(f"Error processing audio: {e}")
        return {"error": str(e)}


def get_assistant(document_path: str = None):
    return GeminiDiscussionAssistant(document_path, GEMINI_API_KEY)

@router.post("/meeting-minutes")
async def create_meeting_minutes(
    discussion_pk: int = Form(...),
    room_name: str = Form(...),
    host_name: str = Form(...),
    start_time: str = Form(...),
    end_time: str = Form(...),
    duration: float = Form(...),
    participants: str = Form(...),
    messages: str = Form(...),    
    db: Session = Depends(get_db)
):
    try:
        # 1. Discussion 조회 및 비활성화 처리
        discussion = (
            db.query(Discussion)
            .filter(Discussion.discussion_pk == discussion_pk)
            .first()
        )
        if not discussion:
            raise HTTPException(status_code=404, detail="Discussion not found")
            
        discussion.is_active = 0  # 토론 비활성화
        discussion.end_time = datetime.datetime.now()  # 종료 시간 업데이트

        # Novel 조회
        novel = db.query(Novel).filter(Novel.novel_pk == discussion.novel_pk).first()
        if not novel:

            raise HTTPException(status_code=404, detail="Novel not found")  
        # 2. 회의록 생성 및 요약
        try:
            participants_list = json.loads(participants)
            messages_list = json.loads(messages)
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=400, detail=f"Invalid JSON format: {str(e)}")

        # 회의록 데이터 구성
        meeting_data = {
            "id": str(uuid.uuid4()),
            "room_name": room_name,
            "host_name": host_name,
            "start_time": start_time,
            "end_time": end_time,
            "duration": duration,
            "participants": participants_list,
            "messages": messages_list,
        }

        # 토론 텍스트 파일 경로 확인
        txt_filename = f"{novel.title}_{discussion.session_id}.txt"
        txt_file_path = os.path.join(DOCUMENT_PATH, txt_filename)

        if not os.path.exists(txt_file_path):
            raise HTTPException(
                status_code=404,
                detail=f"토론 파일을 찾을 수 없습니다: {txt_filename}",
            )

        # Gemini Assistant를 통한 요약 생성
        try:
            assistant = GeminiDiscussionAssistant(txt_file_path, GEMINI_API_KEY)
            meeting_json = json.dumps(meeting_data, ensure_ascii=False)
            summary_response = assistant.generate_meeting_notes(meeting_json)
            summary = (
                summary_response.content
                if hasattr(summary_response, "content")
                else str(summary_response)
            )

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"요약 생성 실패: {str(e)}")

        try:
            new_note = Note(
                novel_pk=novel.novel_pk,
                user_pk=novel.user_pk,
                discussion_pk=discussion.discussion_pk,
                summary=summary,
            )
            db.add(new_note)

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"요약본 저장 실패: {str(e)}")
        
        # 3. txt 파일 삭제
        if os.path.exists(txt_file_path):
            try:
                os.remove(txt_file_path)
            except Exception as e:
                pass
        # 모든 변경사항 커밋
        try:
            db.commit()
            db.refresh(new_note)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"데이터베이스 저장 실패: {str(e)}")

        return {
            "message": "토론이 종료되었으며, 요약본이 성공적으로 저장되었습니다.",
            "note": new_note,
            "file_deleted": not os.path.exists(txt_file_path)
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/note/{note_id}", description="토론 요약본 상세 조회")
async def get_note_summary(note_id: int, db: Session = Depends(get_db)):
    # Join을 통해 Note, Discussion 및 Novel 정보를 한 번에 조회
    note = (
        db.query(Note)
        .options(
            joinedload(Note.discussion),  # discussion 정보 로드
        )
        .filter(Note.note_pk == note_id)
        .first()
    )

    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    # Novel 정보 별도 조회
    novel = db.query(Novel).filter(Novel.novel_pk == note.discussion.novel_pk).first()

    if not novel:
        raise HTTPException(status_code=404, detail="Novel not found")

    return {
        "novel": {"novel_pk": novel.novel_pk, "title": novel.title},
        "topic": note.discussion.topic,
        "start_time": note.discussion.start_time,
        "summary_text": note.summary,
    }

@router.get(
    "/user/notes", description="로그인한 사용자의 소설에 대한 토론 요약본 목록 조회"
)
async def get_user_discussion_summaries(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    try:
        # Novel과 User 관계를 기준으로 먼저 쿼리
        notes = (
            db.query(Note)
            .join(Discussion, Note.discussion_pk == Discussion.discussion_pk)
            .join(Novel, Novel.novel_pk == Discussion.novel_pk)
            .filter(Novel.user_pk == current_user.user_pk)
            .all()
        )

        result = []
        for note in notes:
            # 각 note에 대해 novel 정보를 별도로 조회
            novel = (
                db.query(Novel)
                .filter(Novel.novel_pk == note.discussion.novel_pk)
                .first()
            )

            if novel:
                result.append(
                    {
                        "noteId": note.note_pk,
                        "novel": {"novel_pk": novel.novel_pk, "title": novel.title},
                        "topic": note.discussion.topic,
                        "category": (
                            "WHOLE_NOVEL"
                            if not note.discussion.category
                            else "SPECIFIC_EPISODE"
                        ),
                        "start_time": note.discussion.start_time,
                    }
                )

        return result

    except Exception as e:
        print(f"Error: {str(e)}")  # 서버 로그에 에러 출력
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/subject", description="토론 주제 추천")
def create_discussion_subject(
    discussion_pk: int = Form(...),
    room_name: str = Form(...),
    host_name: str = Form(...),
    start_time: str = Form(...),
    end_time: str = Form(...),
    duration: float = Form(...),
    participants: str = Form(...),
    messages: str = Form(...),
    db: Session = Depends(get_db)
):
    """FormData를 받아 토론 주제를 추천"""
    try:
        # 1. 입력값 검증 및 로깅
        print(f"Received discussion_pk: {discussion_pk}")
        print(f"Received messages: {messages[:100]}...")  # 메시지 앞부분만 로깅

        if not messages or messages == "[]":
            raise HTTPException(status_code=400, detail="메시지 내용이 비어있습니다.")

        try:
            participants_list = json.loads(participants)
            messages_list = json.loads(messages)
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=400, detail=f"JSON 파싱 실패: {str(e)}")

        if not messages_list:
            raise HTTPException(status_code=400, detail="메시지 파싱 결과가 비어있습니다.")

        # 2. Discussion 조회
        try:
            discussion = (
                db.query(Discussion)
                .filter(Discussion.discussion_pk == discussion_pk)
                .first()
            )
            if not discussion:
                raise HTTPException(status_code=404, detail=f"Discussion not found: {discussion_pk}")
            print(f"Found discussion: {discussion.discussion_pk}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Discussion 조회 실패: {str(e)}")

        # 3. Novel 조회
        try:
            novel = db.query(Novel).filter(Novel.novel_pk == discussion.novel_pk).first()
            if not novel:
                raise HTTPException(status_code=404, detail=f"Novel not found: {discussion.novel_pk}")
            print(f"Found novel: {novel.title}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Novel 조회 실패: {str(e)}")

        # 4. 파일 경로 확인
        txt_filename = f"{novel.title}_{discussion.session_id}.txt"
        file_path = os.path.join(DOCUMENT_PATH, txt_filename)
        print(f"Checking file path: {file_path}")

        if not os.path.exists(file_path):
            raise HTTPException(
                status_code=404,
                detail=f"종료된 토론이므로 기능 사용이 불가합니다.: {file_path}"
            )

        # 5. 데이터 구성
        discussion_data = {
            "room_name": room_name,
            "host_name": host_name,
            "start_time": start_time,
            "end_time": end_time,
            "duration": duration,
            "participants": participants_list,
            "messages": messages_list,
        }

        # 6. Gemini Assistant를 통한 주제 추천
        try:
            assistant = GeminiDiscussionAssistant(file_path, GEMINI_API_KEY)
            discussion_json = json.dumps(discussion_data, ensure_ascii=False)
            subject_response = assistant.recommend_discussion_topic(discussion_json)
            subject = (
                subject_response if isinstance(subject_response, str) else str(subject_response)
            )
            print(f"Generated subject: {subject[:100]}...")  # 생성된 주제 앞부분만 로깅
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"주제 추천 생성 실패: {str(e)}")

        return {
            "status": "success",
            "message": "토론 주제가 성공적으로 생성되었습니다.",
            "subject": subject
        }

    except HTTPException as he:
        # 이미 처리된 HTTP 예외는 그대로 전달
        raise he
    except Exception as e:
        # 예상치 못한 에러는 상세 로그 출력
        print(f"Unexpected error: {str(e)}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500, 
            detail=f"서버 내부 오류: {str(e)}"
        )


@router.post("/fact-check", description="토론 팩트 체크")
def create_discussion_factcheck(
    discussion_pk: int = Form(...),
    content: str = Form(...),
    db: Session = Depends(get_db)
):
    
    """
    토론 중 제기된 주장에 대한 팩트 체크 수행
    """
    if not content:
        raise HTTPException(status_code=400, detail="메시지 내용이 비어있습니다.")

    # 2. Discussion 조회
    try:
        discussion = (
            db.query(Discussion)
            .filter(Discussion.discussion_pk == discussion_pk)
            .first()
        )
        if not discussion:
            raise HTTPException(status_code=404, detail=f"Discussion not found: {discussion_pk}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Discussion 조회 실패: {str(e)}")

    # 3. Novel 조회
    try:
        novel = db.query(Novel).filter(Novel.novel_pk == discussion.novel_pk).first()
        if not novel:
            raise HTTPException(status_code=404, detail=f"Novel not found: {discussion.novel_pk}")
        print(f"Found novel: {novel.title}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Novel 조회 실패: {str(e)}")

    # 4. 파일 경로 확인
    txt_filename = f"{novel.title}_{discussion.session_id}.txt"
    file_path = os.path.join(DOCUMENT_PATH, txt_filename)
    print(f"Checking file path: {file_path}")

    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=404,
            detail=f"종료된 토론이므로 기능 사용이 불가합니다.: {file_path}"
        )

    # 6. Gemini Assistant를 통한 주제 추천
    try:
        assistant = GeminiDiscussionAssistant(file_path, GEMINI_API_KEY)
        factcheck = assistant.fact_check(content)

        return {
            "status": "success",
            "message": "팩트 체크가 성공적으로 진행되었습니다.",
            "factcheck": factcheck
        }

    except Exception as e:

        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
