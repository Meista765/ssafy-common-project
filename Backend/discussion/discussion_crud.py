from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import uuid4
import os

from models import Discussion, Novel, User, Episode, user_discussion_table
from . import discussion_schema

def get_discussions(db: Session) -> List[Discussion]:
    """
    모든 토론 방 목록 조회
    """
    discussions = db.query(Discussion).all()

    discussion_list = []
    for discussion in discussions:
        # 1. Novel 조회
        novel = db.query(Novel).filter(Novel.novel_pk == discussion.novel_pk).first()
        if not novel:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Novel not found")

        # 2. Episode 조회 (ep_pk가 존재하는 경우만)
        episode = None
        if discussion.ep_pk:
            episode = db.query(Episode).filter(Episode.ep_pk == discussion.ep_pk).first()
            if not episode:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Episode not found")

        # 3. Participants 조회 (참여자 리스트)
        participants = db.query(User).join(user_discussion_table).filter(
            user_discussion_table.c.discussion_pk == discussion.discussion_pk
        ).all()

        discussion_list.append({
            "discussion_pk": discussion.discussion_pk,
            "session_id" : discussion.session_id,
            "novel": {"novel_pk": novel.novel_pk, "title": novel.title},  # ✅ novel 정보 포함
            "episode": {"ep_pk": episode.ep_pk, "ep_title": episode.ep_title} if episode else None,
            "topic": discussion.topic,
            "start_time": discussion.start_time,
            "end_time": discussion.end_time,
            "participants": [{"user_pk": user.user_pk, "name": user.name, "nickname": user.nickname} for user in participants],
            "is_active": discussion.is_active
        })

    return discussion_list


def get_discussion(db: Session, discussion_pk: int):
    """
    특정 토론 방 조회 (관계 설정 없이 novel, episode 직접 조회)
    """
    # 1. Discussion 조회
    discussion = db.query(Discussion).filter(Discussion.discussion_pk == discussion_pk).first()
    if not discussion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discussion not found")

    # 2. Novel 조회
    novel = db.query(Novel).filter(Novel.novel_pk == discussion.novel_pk).first()
    if not novel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Novel not found")

    # 3. Episode 조회
    episode = None
    if discussion.ep_pk:
        episode = db.query(Episode).filter(Episode.ep_pk == discussion.ep_pk).first()
        if not episode:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Episode not found")

    # 4. Participants 조회 (참여자 리스트)
    participants = db.query(User).join(user_discussion_table).filter(
        user_discussion_table.c.discussion_pk == discussion.discussion_pk
    ).all()

    return {
        "discussion_pk": discussion.discussion_pk,
        "session_id" : discussion.session_id,
        "novel": {"novel_pk": novel.novel_pk, "title": novel.title},
        "episode": {"ep_pk": episode.ep_pk, "ep_title": episode.ep_title} if episode else None,
        "topic": discussion.topic,
        "start_time": discussion.start_time,
        "end_time": discussion.end_time,
        "participants": [{"user_pk": user.user_pk, "name": user.name, "nickname": user.nickname} for user in participants],
        "is_active": discussion.is_active
    }


def get_discussion_sessionid(db: Session, discussion_pk: int, user_pk:int):
    """
    특정 토론 방 접속 : user가 해당 토론 방에 예약된 participant인지 확인 후, 예약된 방의 session_id 반환
    """
    # 1. 해당 discussion 조회
    discussion = db.query(Discussion).filter(Discussion.discussion_pk == discussion_pk).first()
    if not discussion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discussion not found")

    # 2. user 조회
    user = db.query(User).filter(User.user_pk == user_pk).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # 3. 유저가 해당 토론에 참여 중인지 확인
    if user not in discussion.participants:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is not a participant in this discussion")

    # 4. session_id 반환
    return {
        "discussion_pk": discussion.discussion_pk,
        "session_id": discussion.session_id,
        "topic": discussion.topic,
        "start_time": discussion.start_time,
        "user": {
            "user_pk": user.user_pk,
            "nickname": user.nickname,
            "email": user.email
        }
    }


def generate_session_id():
    """
    토론방 참여를 위한 세션 ID를 생성하는 함수
    """
    return str(uuid4())


def create_discussion_db(db: Session, discussion: discussion_schema.NewDiscussionForm, current_user: User) -> Discussion:
    """
    새로운 토론 방 생성
    """
    # 1. Novel, User 존재 확인
    novel = db.query(Novel).filter(Novel.novel_pk == discussion.novel_pk).first()
    user = db.query(User).filter(User.user_pk == current_user.user_pk).first()

    if not novel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Novel not found")
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # 소설 특정 회차에 대한 토론일 경우, episode 존재 여부 확인
    if discussion.ep_pk:
        episode = db.query(Episode).filter(Episode.ep_pk == discussion.ep_pk).first()
        if not episode:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Episode not found")

    session_id = generate_session_id()

    # 2. Discussion 생성
    new_discussion = Discussion(
        novel_pk=discussion.novel_pk,
        ep_pk=discussion.ep_pk if discussion.ep_pk else None,
        session_id=session_id,
        topic=discussion.topic,
        category=discussion.category,
        start_time=discussion.start_time,
        max_participants=discussion.max_participants,
    )

    # 3. 토론 생성자 자동 참여
    new_discussion.participants.append(user)

    db.add(new_discussion)
    db.commit()
    db.refresh(new_discussion)

    return new_discussion

DOCUMENT_PATH = "./document_path"  # txt 파일 저장 디렉토리

def create_novel_txt_file(discussion_pk: int, db: Session) -> dict:
    """
    AI 기능을 위해 토론 시작 시, 소설 폴더에 소설 내용을 담은 txt 파일을 생성하는 기능
    """
    # 소설 및 토론 정보 조회
    discussion = (
        db.query(Discussion).filter(Discussion.discussion_pk == discussion_pk).first()
    )
    novel = db.query(Novel).filter(Novel.novel_pk == discussion.novel_pk).first()

    if not novel:
        raise HTTPException(status_code=404, detail="Novel not found")

    if not discussion:
        raise HTTPException(status_code=404, detail="Discussion not found")

    # 소설의 모든 에피소드 조회 (생성 날짜순 정렬)
    episodes = (
        db.query(Episode)
        .filter(Episode.novel_pk == novel.novel_pk)
        .order_by(Episode.created_date)
        .all()
    )

    if not episodes:
        raise HTTPException(status_code=400, detail="No episodes found for this novel")

    # txt 파일 제목 설정 (토론 세션 ID + 소설 제목)
    txt_title = f"{novel.title}_{discussion.session_id}.txt"

    # 파일 저장 경로 설정
    os.makedirs(DOCUMENT_PATH, exist_ok=True)  # 폴더가 없으면 생성
    file_path = os.path.join(DOCUMENT_PATH, txt_title)

    # 소설 내용 구성
    content = f" 소설 제목: {novel.title}\n\n"

    for idx, episode in enumerate(episodes):
        content += f"\n\n {idx + 1}화 에피소드 : {episode.ep_title}\n\n{episode.ep_content}\n\n"

    # 파일 생성 및 저장
    try:
        with open(file_path, "w", encoding="utf-8") as file:
            file.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"파일 저장 실패: {str(e)}")

    return {
        "file_name": txt_title,
        "document_path": os.path.abspath(file_path),  # 절대 경로 반환
    }


def add_participant(db: Session, discussion_pk: int, user_pk: int):
    """
    토론 방에 유저 참여
    """
    # 1. Discussion, User 존재 확인
    discussion = db.query(Discussion).filter(Discussion.discussion_pk == discussion_pk).first()
    user = db.query(User).filter(User.user_pk == user_pk).first()

    if not discussion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discussion not found")
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # 2. 참여자 수 제한 확인
    if len(discussion.participants) >= discussion.max_participants:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Maximum number of participants reached")

    # 3. 이미 참여한 유저인지 확인
    if user in discussion.participants:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already participating in this discussion")

    # 4. 유저 참여
    discussion.participants.append(user)
    db.commit()
    db.refresh(discussion)

    # Novel 정보 추가
    novel = db.query(Novel).filter(Novel.novel_pk == discussion.novel_pk).first()
    if not novel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Novel not found")

    # Episode 정보 추가
    episode_data = None
    if discussion.ep_pk:
        episode = db.query(Episode).filter(Episode.ep_pk == discussion.ep_pk).first()
        if episode:
            episode_data = {"ep_pk": episode.ep_pk, "ep_title": episode.ep_title}

    # Participants 변환
    participants = [{"user_pk": u.user_pk, "name": u.name, "nickname": u.nickname} for u in discussion.participants]

    return {
        "discussion_pk": discussion.discussion_pk,
        "novel": {"novel_pk": novel.novel_pk, "title": novel.title},
        "episode": episode_data,
        "topic": discussion.topic,
        "start_time": discussion.start_time,
        "end_time": discussion.end_time,
        "participants": participants
    }



def remove_participant(db: Session, discussion_pk: int, user_pk: int):
    """
    토론 방에서 유저 삭제
    """
    # 1. Discussion, User 존재 확인
    discussion = db.query(Discussion).filter(Discussion.discussion_pk == discussion_pk).first()
    user = db.query(User).filter(User.user_pk == user_pk).first()

    if not discussion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discussion not found")
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # 2. 유저가 토론 방에 참여하고 있는지 확인
    if user not in discussion.participants:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is not participating in this discussion")

    # 3. 유저 삭제
    discussion.participants.remove(user)
    db.commit()
    db.refresh(discussion)

    # Novel 정보 추가
    novel = db.query(Novel).filter(Novel.novel_pk == discussion.novel_pk).first()
    if not novel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Novel not found")

    # Episode 정보 추가
    episode_data = None
    if discussion.ep_pk:
        episode = db.query(Episode).filter(Episode.ep_pk == discussion.ep_pk).first()
        if episode:
            episode_data = {"ep_pk": episode.ep_pk, "ep_title": episode.ep_title}

    # Participants 변환
    participants = [{"user_pk": u.user_pk, "name": u.name, "nickname": u.nickname} for u in discussion.participants]

    return {
        "discussion_pk": discussion.discussion_pk,
        "novel": {"novel_pk": novel.novel_pk, "title": novel.title},
        "episode": episode_data,
        "topic": discussion.topic,
        "start_time": discussion.start_time,
        "end_time": discussion.end_time,
        "participants": participants
    }



def update_discussion(db: Session, discussion_pk: int, discussion_update: discussion_schema.NewDiscussionForm):
    """
    토론 방 정보 수정
    """
    discussion = db.query(Discussion).filter(Discussion.discussion_pk == discussion_pk).first()
    if not discussion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discussion not found")

    # Update discussion attributes
    discussion.novel_pk = discussion_update.novel_pk
    discussion.topic = discussion_update.topic
    discussion.category = discussion_update.category
    discussion.start_time = discussion_update.start_time
    discussion.max_participants = discussion_update.max_participants

    db.commit()
    db.refresh(discussion)

    # Novel 정보 추가
    novel = db.query(Novel).filter(Novel.novel_pk == discussion.novel_pk).first()
    if not novel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Novel not found")

    # Episode 정보 추가 (필요할 때만)
    episode_data = None
    if discussion.ep_pk:
        episode = db.query(Episode).filter(Episode.ep_pk == discussion.ep_pk).first()
        if episode:
            episode_data = {"ep_pk": episode.ep_pk, "ep_title": episode.ep_title}

    # Participants 추가
    participants = db.query(User).join(user_discussion_table).filter(
        user_discussion_table.c.discussion_pk == discussion.discussion_pk
    ).all()

    return {
        "discussion_pk": discussion.discussion_pk,
        "novel": {"novel_pk": novel.novel_pk, "title": novel.title},
        "episode": episode_data,
        "topic": discussion.topic,
        "start_time": discussion.start_time,
        "end_time": discussion.end_time,
        "participants": [{"user_pk": user.user_pk, "name": user.name, "nickname": user.nickname} for user in participants]
    }


def delete_discussion(db: Session, discussion_pk: int):
    """
    토론 방 삭제
    """
    discussion = db.query(Discussion).filter(Discussion.discussion_pk == discussion_pk).first()
    if not discussion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discussion not found")

    db.delete(discussion)
    db.commit()
    
    return None 

