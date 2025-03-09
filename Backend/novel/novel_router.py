from fastapi import Depends, HTTPException, status, APIRouter
from sqlalchemy.orm import Session
from database import get_db
from novel import novel_crud, novel_schema
from models import Novel, User, Discussion
from typing import List, Optional
from utils.auth_utils import get_optional_user
from user.user_crud import save_recent_novel
from fastapi import File, UploadFile # 삭제 예정 
import os
from dotenv import load_dotenv
import httpx
import random


# AI 이미지 생성 
from ai.gen_image import ImageGenerator
from ai.gen_novel import NovelGenerator
from PIL import Image
from fastapi.responses import Response
import requests
from io import BytesIO
from .novel_schema import WorldviewRequest, SynopsisRequest, CharacterRequest, CreateChapterRequest, SummaryRequest
from .novel_crud import get_previous_chapters
from utils.auth_utils import get_current_user


from fastapi import File, UploadFile

from PIL import Image
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
from fastapi.responses import Response
import requests
import os
from io import BytesIO
from fastapi.staticfiles import StaticFiles


router = APIRouter(
    prefix='/api/v1',
)
router.mount("/static", StaticFiles(directory="static"), name="static")


# router.py
@router.get("/main", response_model=novel_schema.MainPageResponse)
async def main_page(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    메인 페이지: 최근 인기 소설, 최근 본 소설 정보 반환
    """
    response_data = {
        "user": {
            "user_pk": current_user.user_pk,
            "name": current_user.name,
            "nickname": current_user.nickname,
            "recent_novels": novel_crud.get_recent_novels(db, current_user.user_pk)
        },
        "recent_best": novel_crud.recent_hit(2, db),
        "month_best": novel_crud.recent_hit(30, db)
    }
    
    return response_data


# 소설(Novel) CRUD
print("router has started")

# 모든 소설을 가져오기 에러 잡는 중
# 장르도 같이 제공해줘야 함.
@router.get("/novels", response_model=List[novel_schema.NovelShowBase])
def all_novel(db: Session = Depends(get_db)):
    return novel_crud.get_all_novel(db) 

# 디테일 페이지, 아직 미완
@router.get("/novel/{novel_pk}/detail")
def novel_detail(novel_pk : int, db : Session = Depends(get_db)) : 
    episode = novel_crud.novel_episode(novel_pk, db)
    novel_info  = novel_crud.search_novel(novel_pk, db)
    discussion = db.query(Discussion).filter(Discussion.novel_pk == novel_pk).all()
    comment = novel_crud.get_novel_comment(novel_pk, db)
    novel = novel_info[0]
    author = db.query(User).filter(User.user_pk == novel.user_pk).first()
    #, "author" : author
    return {"episode" : episode, "novel_info" : novel_info, "discussion": discussion, "comment" : comment, "author" : author.nickname} 

@router.get("/novel/{novel_pk}") 
def get_novel_info(novel_pk : int, db: Session = Depends(get_db)) :
    # novel정보 
    novel = novel_crud.search_novel(novel_pk, db)
    # 등장인물 정보
    character = novel_crud.get_character(novel_pk, db)
    return {"novel" : novel, "character" : character} 

@router.get("/novel/character/{novel_pk}")
def get_character_info(novel_pk : int, db: Session = Depends(get_db)) : 
    return novel_crud.get_character(novel_pk, db)

#등장인물 CUD
@router.post("/novel/character/{novel_pk}", response_model=novel_schema.CharacterBase)
def save_character(novel_pk : int, character_info : novel_schema.CharacterBase, db: Session = Depends(get_db)) :
    return novel_crud.save_character(novel_pk, character_info ,db)

@router.put("/novel/character/{character_pk}")
def update_character(character_pk : int, update_data: novel_schema.CharacterUpdateBase, db: Session = Depends(get_db)) : 
    return novel_crud.update_character(character_pk,update_data, db)

@router.delete("/novel/character/{character_pk}")
def delete_character(character_pk : int, db: Session = Depends(get_db)) : 
    return novel_crud.delete_character(character_pk, db )

# 소설(시놉시스) CUD

# 수정한 소설 저장하기
@router.put("/novel/{novel_pk}")
def update_novel(novel_pk: int, update_data: novel_schema.NovelUpdateBase,db: Session = Depends(get_db)):
    novel = novel_crud.update_novel(novel_pk, update_data, db)
    return novel

# 소설 생성
@router.post("/novel", response_model=novel_schema.NovelShowBaseCreate)
def create_novel(novel_info: novel_schema.NovelCreateBase, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    novel = novel_crud.create_novel(novel_info, user.user_pk, db)
    return novel

@router.delete("/novel/{novel_pk}")
def delete_novel(
    novel_pk: int, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return novel_crud.delete_novel(novel_pk=novel_pk, user=current_user, db=db)


#소설 좋아요 
@router.put("/novel/{novel_pk}/like")
async def like_novel(
    novel_pk: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await novel_crud.like_novel(novel_pk, current_user.user_pk, db)

# 에피소드 CRUD

# 특정 소설의 에피소드 조회
@router.get("/novel/{novel_pk}/episodes")
def novel_episode(novel_pk: int, db: Session = Depends(get_db)):
    return novel_crud.novel_episode(novel_pk, db)

@router.get("/novel/{novel_pk}/title", response_model=novel_schema.NovelTitleResponse)
def get_novel_title(
    novel_pk: int,
    db: Session = Depends(get_db)
):
    novel = novel_crud.get_novel(novel_pk, db)
    return novel_schema.NovelTitleResponse(
        novel_title=novel.title
    )

@router.get("/novel/{novel_pk}/episodes/{ep_pk}", response_model=novel_schema.EpisodeDetailResponse)
def get_episode_detail(
    novel_pk: int,
    ep_pk: int,
    current_user: Optional[User] = Depends(get_optional_user),  # 변경
    db: Session = Depends(get_db)
):
    novel, episode = novel_crud.get_episode_detail(novel_pk, ep_pk, db)
    
    # 로그인한 사용자인 경우에만 최근 본 소설 저장
    if current_user:
        save_recent_novel(db, current_user.user_pk, novel_pk)
    
    return novel_schema.EpisodeDetailResponse(
        novel_title=novel.title,
        ep_pk=episode.ep_pk,
        ep_title=episode.ep_title,
        ep_content=episode.ep_content,
        created_date=episode.created_date,
        updated_date=episode.updated_date,
    )

# 특정 소설에 에피소드 추가
@router.post("/novel/{novel_pk}/episode", response_model=novel_schema.EpisodeCreateBase)
def save_episode(novel_pk: int, episode_data: novel_schema.EpisodeCreateBase, db: Session = Depends(get_db)):
    return novel_crud.save_episode(novel_pk, episode_data, db)

# 에피소드 변경
@router.post("/novel/{novel_pk}/{ep_pk}",response_model=novel_schema.EpisodeCreateBase)
def change_episode(novel_pk: int, update_data: novel_schema.EpisodeUpdateBase, ep_pk : int, db: Session = Depends(get_db)) : 
    return novel_crud.change_episode(novel_pk, update_data, ep_pk, db)

#에피소드 삭제
@router.delete("/novel/{novel_pk}/{ep_pk}")
def delete_episode(
    novel_pk: int, 
    ep_pk: int, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) : 
    return novel_crud.delete_episode(novel_pk, ep_pk, current_user, db)

# 특정 에피소드의 댓글 조회
@router.get("/novel/{novel_pk}/episode/{ep_pk}/comments")
def ep_comment(novel_pk: int, ep_pk: int, db: Session = Depends(get_db)):
    all_ep_comment = novel_crud.get_all_ep_comment(novel_pk, ep_pk, db)
    return all_ep_comment

# 댓글 작성
@router.post("/novel/{novel_pk}/episode/{ep_pk}/comment", response_model=novel_schema.CommentBase)
def save_comment(
    comment_info: novel_schema.CommentBase, 
    novel_pk: int, 
    ep_pk: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # current_user의 user_pk를 사용
    comment = novel_crud.create_comment(comment_info, novel_pk, ep_pk, current_user.user_pk, db)
    if not comment:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="댓글 작성에 실패했습니다.")
    return comment

# 댓글 수정
@router.put("/novel/{novel_pk}/episode/{ep_pk}/comment/{comment_pk}")
def change_comment(
    content: str, 
    comment_pk: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    comment = novel_crud.update_comment(content, comment_pk, current_user.user_pk, db)
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="댓글을 찾을 수 없습니다.")
    return comment

# 댓글 삭제
@router.delete("/novel/{novel_pk}/episode/{ep_pk}/comment/{comment_pk}")
def delete_comment(
    comment_pk: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return novel_crud.delete_comment(comment_pk, current_user.user_pk, db)


# 댓글 좋아요
@router.put("/novel/comment/{comment_pk}/like")
def like_comment(
    comment_pk: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
): 
    return novel_crud.like_comment(comment_pk, current_user.user_pk, db)

# 대댓글 CRUD

# 대댓글 작성
@router.post("/novel/{novel_pk}/episode/{ep_pk}/comment/{comment_pk}/cocomment", response_model=novel_schema.CoComentBase)
def create_cocoment(comment_pk: int, user_pk: int, cocoment_info: novel_schema.CoComentBase, db: Session = Depends(get_db)):
    return novel_crud.create_cocoment(comment_pk, user_pk, cocoment_info, db)

# 대댓글 수정
@router.put("/novel/{novel_pk}/episode/{ep_pk}/comment/{comment_pk}/cocomment")
def update_cocomment(content: str, cocoment_pk: int, db: Session = Depends(get_db)):
    cocomment = novel_crud.update_cocomment(content, cocoment_pk, db)
    if not cocomment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="대댓글을 찾을 수 없습니다.")
    return cocomment

# 대댓글 삭제
@router.delete("/novel/{novel_pk}/episode/{ep_pk}/comment/{comment_pk}/cocomment")
def delete_cocomment(cocomment_pk: int, db: Session = Depends(get_db)):
    novel_crud.delete_cocomment(cocomment_pk, db)
    return HTTPException(status_code=status.HTTP_204_NO_CONTENT)


# 대댓글 좋아요
@router.put("/novel/{novel_pk}/episode/{ep_pk}/comment/{comment_pk}/cocomment/like")
def like_cocomment(cocomment_pk: int, user_pk: int, db: Session = Depends(get_db)):
    return novel_crud.like_cocomment(cocomment_pk, user_pk, db)

@router.get("/novel/{novel_pk}/episode/{ep_pk}/comment/{comment_pk}/cocomment")
def get_cocoment(comment_pk : int, db: Session = Depends(get_db) ) : 
    return novel_crud.get_cocoment(comment_pk,db)


@router.post("/save")
async def upload_image(user_novel: str, pk: int, file: UploadFile = File(...), db: Session = Depends(get_db)) : 
    if user_novel == "user" :
        drive_path = "1M6KHgGMhmN0AiPaf5Ltb3f0JhZZ7Bnm5"
        data = db.query(User).filter(User.user_pk == pk).first()
        img_info = data.user_img
    elif user_novel == "novel" : 
        data = db.query(Novel).filter(Novel.novel_pk == pk).first()
        drive_path = "1i_n_3NcwzKhESXw1tJqMtQRk7WVczI2N"
        img_info = data.novel_img
    else : 
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="need to choose user or novel")
    
    # Local static에 이미지 저장
    file_path = await novel_crud.image_upload(file)

    # 여기서 기존에 있던 이미지 삭제해야 함
    # if img_info :
    #     novel_crud.delete_image(img_info, drive_path)

    # else :
    #     print("삭제할 이미지 없음.") 
    
    # 원격 저장소에 이미지 저장
    # novel_crud.save_cover(user_novel, pk, file_path, drive_path, db)

    # Local static에서 이미지 삭제
    os.remove(file_path)

# @router.delete("/image")
# def delete_img(file_id : str, drive_folder_id : str, novel_pk : int , db: Session = Depends(get_db)) :
#     return novel_crud.delete_image(file_id, drive_folder_id)


@router.post("/ai/worldview")
def recommend_worldview(request: WorldviewRequest) : 
    print(request.model_dump())
    novel_gen = NovelGenerator(request.genre, request.title)
    worldview = novel_gen.recommend_worldview()
    return {"worldview": worldview}

@router.post("/ai/synopsis")
def recommend_synopsis(request: SynopsisRequest) : 
    novel_gen = NovelGenerator(request.genre, request.title, request.worldview)
    synopsis = novel_gen.recommend_synopsis()
    return {"synopsis": synopsis}

@router.post("/ai/summary")
def recommend_summary(request: SummaryRequest) : 
    novel_gen = NovelGenerator(request.genre, request.title, request.worldview, request.synopsis )
    summary = novel_gen.generate_introduction()
    return {"summary" : summary}

@router.post("/ai/characters-new")
def add_new_characters(request : CharacterRequest) : 
    novel_gen = NovelGenerator(request.genre, request.title, request.worldview, request.synopsis, request.summary, request.characters)
    new_characters = novel_gen.add_new_characters()
    return {"new_characters" : new_characters}

@router.post("/ai/characters")
def recommend_characters(request: CharacterRequest):
    novel_gen = NovelGenerator(request.genre, request.title, request.worldview, request.synopsis, request.summary)
    updated_characters = novel_gen.recommend_characters()
    return {"characters": updated_characters}

@router.post("/ai/episode")
def create_episode(request: CreateChapterRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    novel = None
    if request.novel_pk:
        novel = db.query(Novel).filter(Novel.novel_pk == request.novel_pk).first()
        if not novel:
            raise HTTPException(status_code=404, detail="해당 novel_pk에 대한 소설을 찾을 수 없습니다.")
        
        # 소설 작성자가 현재 로그인된 사용자인지 검증
        if novel.user_pk != current_user.user_pk:
            raise HTTPException(status_code=403, detail="이 소설을 수정할 권한이 없습니다.")

    # novel_pk가 없으면 새로운 소설 생성
    else:
        novel = Novel(
            user_pk=current_user.user_pk,
            title=request.title,
            worldview=request.worldview,
            synopsis=request.synopsis,
            num_episode=0
        )
        db.add(novel)
        db.commit()
        db.refresh(novel)
    
    previous_chapters = get_previous_chapters(db, novel.novel_pk)

    generator = NovelGenerator(
        genre=request.genre,
        title=request.title,
        worldview=request.worldview,
        synopsis=request.synopsis,
        characters=request.characters,
        previous_chapters=previous_chapters
    )

    new_chapter = generator.create_chapter()

    return {"title": request.title, "genre": request.genre, "new_chapter": new_chapter}



JUPYTER_URL = os.environ["JUPYTER_URL"]

# payload = {
#     "genre": "fantasy",
#     "style": "watercolor",
#     "title": "The Last Dragon",
#     "worldview": "high",
#     "keywords": ["dragon", "knight", "adventure"]
# }

# payload는 
@router.post("/image/generate")
async def AI_img_generate(req: novel_schema.ImageRequest) :
    headers = {"Content-Type": "application/json"}
    req_data = req.model_dump()

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{JUPYTER_URL}/api/v1/editor/image_ai", json=req_data, headers=headers, timeout=180.0)
            print(response)

            if response.status_code == 200:
                print("✅ 이미지 생성 성공!")
                img_data = BytesIO(response.content)
                image = Image.open(img_data)

                # 💾 이미지 저장
                img_name = f"{random.randrange(1, 10000)}.png"
                save_path = os.path.join(os.getcwd(), "static", img_name)
                try : 
                    image.save(save_path, format="PNG")
                    
                    print("📸 이미지가 저장되었습니다.")
                    return {"img_name" : img_name}

                except Exception as e: 
                    print(e) 
                
            
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Could not connect to image service: {str(e)}"
            )
        
        else:
            print(response.status)
            raise HTTPException(
                status_code=response.status_code,
                detail="Image generation failed"
            )


@router.post("/api/v1/editor/image_ai")
async def generate_image(req: novel_schema.ImageRequest):
    generator = ImageGenerator()
    generator.gen_image_pipline
    try:
        image = generator.gen_image_pipeline(
            req.genre, req.style, req.title, req.worldview, req.keywords
        )
        # ✅ BytesIO 버퍼 생성 후 이미지 변환
        img_buffer = BytesIO()
        image.save(img_buffer, format="PNG")
        img_buffer.seek(0)  # 버퍼의 시작 위치로 이동

        return Response(content=img_buffer.getvalue(), media_type="image/png")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# load_dotenv()

# IMGUR_CLIENT_ID = os.environ.get("IMGUR_CLIENT_ID")

@router.post("/upload-image/{novel_pk}")
async def upload_drive(novel_pk: int, image: UploadFile = File(...), db: Session = Depends(get_db)):
    try:
        # Imgur에 이미지 업로드 및 URL 얻기
        link_image = await novel_crud.upload_to_imgur(image)

        # Novel 모델 업데이트
        novel = db.query(Novel).filter(Novel.novel_pk == novel_pk).first()
        if novel is None:
            raise HTTPException(status_code=404, detail="Novel not found")
        novel.novel_img = link_image
        db.commit()
        db.refresh(novel)
        
        return {"message": "Image uploaded and linked successfully", "url": link_image}

    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail="이미지 업로드 실패")


@router.delete("/api/v1/delete-image/{delete_hash}")
async def delete_image(delete_hash: str):
    try:
        # Imgur에 이미지 삭제 요청
        imgur_url = f"https://api.imgur.com/3/image/{delete_hash}"
        headers = {"Authorization": f"Client-ID {IMGUR_CLIENT_ID}"}

        async with httpx.AsyncClient() as client:
            response = await client.delete(imgur_url, headers=headers)

        response.raise_for_status()
        data = response.json()

        if data["success"]:
            return {"message": "Image deleted successfully"}
        else:
            raise HTTPException(status_code=500, detail=data["data"]["error"])

    except httpx.HTTPStatusError as e:
        print(f"Imgur API error: {e}")
        raise HTTPException(status_code=500, detail="Imgur API 오류")
    except Exception as e:
        print(f"Delete failed: {e}")
        raise HTTPException(status_code=500, detail="이미지 삭제 실패")


@router.delete("/static_delete")
async def delete_static_img(img_name : str) : 
    image_path = os.path.join(os.getcwd(), "static", img_name)
    os.remove(image_path)
    return HTTPException(status_code=status.HTTP_204_NO_CONTENT)

@router.put("/save_gen_img/{novel_pk}")
async def save_gen_img(novel_pk : int, img_name : str,  db: Session = Depends(get_db)) : 
    image_path = os.path.join(os.getcwd(), "static", img_name)
    if not os.path.exists(image_path):
            raise HTTPException(status_code=400, detail="파일이 존재하지 않습니다.")

    filename = os.path.basename(image_path)  # 파일 이름 추출
    
    content_type = "image/jpeg"  # 기본 content type, 필요에 따라 수정

    # 파일 내용을 읽어서 bytes로 변환
    with open(image_path, "rb") as image_file:
        print(dir(image_file))
        image_bytes = image_file.BytesIO()

    # UploadFile 모방 객체 생성 (UploadFile은 직접 인스턴스화 할 수 없으므로)
    class FakeUploadFile:
        def __init__(self, filename: str, file: bytes, content_type: str):
            self.filename = filename
            self.file = file
            self.content_type = content_type

        async def read(self):
            return self.file

        async def close(self):
            pass  # 파일을 직접 닫을 필요가 없음

    try : 
        upload_file = FakeUploadFile(filename=filename, file=image_bytes, content_type=content_type)

        # Imgur에 업로드
        imgur_link = await novel_crud.upload_to_imgur(upload_file)
    except Exception as e : 
        print(e)

    novel  = db.query(Novel).filter(Novel.novel_pk == novel_pk).first()
    novel.novel_img = imgur_link
    
    # 임시 폴더에 있던 이미지 삭제
    os.remove(image_path)

    return {"link": imgur_link}

@router.post("/image/generate/{novel_pk}")
async def AI_img_generate_and_upload(
    novel_pk: int,
    req: novel_schema.ImageRequest,
    db: Session = Depends(get_db)
):
    headers = {"Content-Type": "application/json"}
    req_data = req.model_dump()

    async with httpx.AsyncClient() as client:
        try:
            # 1. Generate image
            response = await client.post(
                f"{JUPYTER_URL}/api/v1/editor/image_ai",
                json=req_data,
                headers=headers,
                timeout=180.0
            )

            if response.status_code == 200:
                print("✅ 이미지 생성 성공!")
                img_data = BytesIO(response.content)
                image = Image.open(img_data)

                # 2. Save image temporarily
                img_name = f"{random.randrange(1, 10000)}.png"
                save_path = os.path.join(os.getcwd(), "static", img_name)
                
                try:
                    image.save(save_path, format="PNG")
                    print("📸 이미지가 저장되었습니다.")

                    # 3. Upload to Imgur and update novel
                    try:
                        # Create UploadFile object from saved image
                        async with aiofiles.open(save_path, 'rb') as f:
                            content = await f.read()
                            file = UploadFile(
                                filename=img_name,
                                file=BytesIO(content),
                                content_type="image/png"
                            )
                            
                        # Upload to Imgur
                        link_image = await novel_crud.upload_to_imgur(file)

                        # Update Novel model
                        novel = db.query(Novel).filter(Novel.novel_pk == novel_pk).first()
                        if novel is None:
                            raise HTTPException(status_code=404, detail="Novel not found")
                        
                        novel.novel_img = link_image
                        db.commit()
                        db.refresh(novel)

                        # Clean up temporary file
                        os.remove(save_path)

                        return {
                            "message": "Image generated and uploaded successfully",
                            "url": link_image
                        }

                    except Exception as upload_error:
                        # Clean up temporary file in case of upload error
                        if os.path.exists(save_path):
                            os.remove(save_path)
                        print(f"Upload failed: {upload_error}")
                        raise HTTPException(status_code=500, detail="이미지 업로드 실패")

                except Exception as save_error:
                    print(f"Save failed: {save_error}")
                    raise HTTPException(status_code=500, detail="이미지 저장 실패")

        except httpx.RequestError as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Could not connect to image service: {str(e)}"
            )
        
        else:
            print(response.status)
            raise HTTPException(
                status_code=response.status_code,
                detail="Image generation failed"
            )
            
            
            
@router.post("/image/generate/{novel_pk}/newfunction")
async def AI_img_generate_new(novel_pk: int, req: novel_schema.ImageRequest, db: Session = Depends(get_db)):
    headers = {"Content-Type": "application/json"}
    req_data = req.model_dump()

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{JUPYTER_URL}/api/v1/editor/image_ai", json=req_data, headers=headers, timeout=180.0)
            print(response)

            if response.status_code == 200:
                print("✅ 이미지 생성 성공!")
                img_data = BytesIO(response.content)
                image = Image.open(img_data)

                # 💾 이미지 저장
                img_name = f"{random.randrange(1, 10000)}.png"
                save_path = os.path.join(os.getcwd(), "static", img_name)
                try:
                    image.save(save_path, format="PNG")
                    print("📸 이미지가 저장되었습니다.")

                    # Upload API 호출을 위한 파일 준비
                    files = {'image': ('image.png', open(save_path, 'rb'), 'image/png')}
                    
                    # Upload API 호출
                    # upload_response = await client.post(
                    #     f"{"http://localhost:8000"}/api/v1/editor/upload-image/{novel_pk}",
                    #     files=files
                    # )
                    
                    link_image = await novel_crud.upload_to_imgur(image)

                    # Novel 모델 업데이트
                    novel = db.query(Novel).filter(Novel.novel_pk == novel_pk).first()
                    if novel is None:
                        raise HTTPException(status_code=404, detail="Novel not found")
                    novel.novel_img = link_image
                    db.commit()
                    db.refresh(novel)

                    # 임시 파일 삭제
                    os.remove(save_path)

                    if upload_response.status_code == 200:
                        return upload_response.json()
                    else:
                        raise HTTPException(
                            status_code=upload_response.status_code,
                            detail="Upload failed"
                        )

                except Exception as e:
                    if os.path.exists(save_path):
                        os.remove(save_path)
                    print(e)
                    raise HTTPException(status_code=500, detail="이미지 처리 실패")

        except httpx.RequestError as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Could not connect to image service: {str(e)}"
            )
        
        else:
            print(response.status)
            raise HTTPException(
                status_code=response.status_code,
                detail="Image generation failed"
            )