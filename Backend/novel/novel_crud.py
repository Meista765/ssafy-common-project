from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status, Request, Response

from sqlalchemy import select, func
from . import novel_schema
from models import Novel, Episode, Comment, CoComment, Character, Genre, novel_genre_table, user_like_table, User, user_recent_novel_table
from user.user_schema import RecentNovel
from typing import Optional, Dict, Any

# from sqlalchemy import select
from datetime import datetime, timedelta
from collections import Counter
import os
from dotenv import load_dotenv
from fastapi import File, UploadFile 
import httpx

# .env 파일 로드
load_dotenv()

# 구글 드라이브에 저장하는 기능 
from googleapiclient.http import MediaFileUpload
from google.oauth2 import service_account
import os
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload


def get_novel(novel_pk: int, db: Session):
    novel = db.query(Novel).filter(Novel.novel_pk == novel_pk).first()
    if not novel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="소설을 찾을 수 없습니다."
        )
    return novel

# main page
def get_recent_novels(db: Session, user_pk: int) -> list[RecentNovel]:
    """
    주어진 user_pk에 대한 최근 본 소설 목록을 반환
    """
    recent_novels = (
        db.execute(
            select(
                Novel.novel_pk, Novel.title, Novel.novel_img, Novel.is_completed, user_recent_novel_table.c.viewed_date
            )
            .join(user_recent_novel_table, Novel.novel_pk == user_recent_novel_table.c.novel_pk)
            .filter(user_recent_novel_table.c.user_pk == user_pk)
            .order_by(user_recent_novel_table.c.viewed_date.desc())
        )
        .fetchall()
    )

    return [
        RecentNovel(
            novel_pk=row.novel_pk,
            title=row.title,
            novel_img=row.novel_img,
            is_completed=row.is_completed
        )
        for row in recent_novels
    ]


def get_all_novel(db: Session):
    novels = db.query(Novel).options(joinedload(Novel.genres)).all()
    
    # SQLAlchemy 객체를 Pydantic 모델로 변환
    return [
        novel_schema.NovelShowBase(
            novel_pk=novel.novel_pk,
            title=novel.title,
            summary = novel.summary, 
            created_date=novel.created_date,
            updated_date=novel.updated_date,
            novel_img=novel.novel_img,
            views=novel.views,
            likes=novel.likes,
            is_completed=novel.is_completed,
            genre=[novel_schema.GenreGetBase(
                genre_pk=genre.genre_pk,
                genre=genre.genre
                ) for genre  in novel.genres]
        )
        for novel in novels
    ]


# 소설 검색 (pk 기반, 테스트 용도라 추후 삭제)
def search_novel(novel_pk: int, db: Session):
    # return db.query(Novel).filter(Novel.novel_pk == novel_pk).all()
    return (
        db.query(Novel)
        .options(joinedload(Novel.genres))  # Novel과 Genre를 join
        .filter(Novel.novel_pk == novel_pk)
        .all()
    )


def create_novel(novel_info: novel_schema.NovelCreateBase, user_pk: int, db: Session):
    novel = Novel(
        title=novel_info.title,
        user_pk=user_pk,
        worldview=novel_info.worldview,
        synopsis=novel_info.synopsis, 
        summary = novel_info.summary
    )
    
    db.add(novel)
    db.flush()  # 이 시점에서 novel_pk가 생성됩니다.
    
    for genre_name in novel_info.genres:
        print("genre_name_is",genre_name)
        genre_data = db.query(Genre).filter(Genre.genre == genre_name).first()
        if genre_data:
            db.execute(novel_genre_table.insert().values(
                novel_pk=novel.novel_pk,
                genre_pk=genre_data.genre_pk
            ))
        else:
            print(f"Genre not found: {genre_name}")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="존재하지 않는 장르입니다.")
    db.commit()
    db.refresh(novel)

    # novel.genres를 문자열 리스트로 변환
    # genre_names = [genre.genre for genre in novel.genres]
    genre_names = [
        novel_schema.GenreGetBase(genre_pk=genre.genre_pk, genre=genre.genre)
        for genre in novel.genres
    ]

    # 스키마 객체 생성
    novel_base = novel_schema.NovelShowBaseCreate( # NovelShowBase 스키마 사용
        novel_pk=novel.novel_pk,
        title=novel.title,
        worldview=novel.worldview,
        synopsis=novel.synopsis,
        summary=novel.summary,
        novel_img=novel.novel_img, # 추가 (기본 이미지 URL 설정)
        views=novel.views,
        likes=novel.likes,
        is_completed=novel.is_completed,
        genres=genre_names # GenreGetBase 리스트 할당
    )
    
    return novel_base

# 소설 부분 업데이트. 이건 전체 저장 용도로 쓰면 될듯.
def update_novel(novel_pk: int, update_data: novel_schema.NovelUpdateBase, db: Session):
    novel = db.query(Novel).filter(Novel.novel_pk == novel_pk).first()

    if not novel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="소설을 찾을 수 없습니다.")

    update_data_dict = update_data.model_dump(exclude_unset=True)

    #필드 업데이트
    for key, value in update_data_dict.items():
        if key != "genre":
            setattr(novel, key, value)

        # 2. 장르 업데이트
        else :
            new_genres = update_data_dict["genre"]

            # *** Correct way to update genres ***
            novel.genres = []  # Clear existing genres
            for genre_name in new_genres:
                genre = db.query(Genre).filter(Genre.genre == genre_name).first()
                if genre:
                    novel.genres.append(genre)
                else:
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{genre_name} 장르를 찾을 수 없습니다.")


    db.commit()
    db.refresh(novel)  # Refresh after commit
    
    return novel  # Return the updated novel

#소설 삭제(장르 중계 테이블도 삭제해줘야 함.)
def delete_novel(novel_pk: int, user: User, db: Session):
    novel = db.query(Novel).filter(Novel.novel_pk == novel_pk).first()
    
    if not novel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Novel not found"
        )
    
    if novel.user_pk != user.user_pk:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this novel"
        )
    
    db.delete(novel)
    db.commit()
    
    return Response(status_code=status.HTTP_204_NO_CONTENT)



async def like_novel(novel_pk: int, user_pk: int, db: Session):
    novel = db.query(Novel).filter(Novel.novel_pk == novel_pk).first()
    if not novel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="소설을 찾을 수 없습니다."
        )
    
    user = db.query(User).filter(User.user_pk == user_pk).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자를 찾을 수 없습니다."
        )

    try:
        if user in novel.liked_users:
            novel.liked_users.remove(user)
            novel.likes -= 1
        else:
            novel.liked_users.append(user)
            novel.likes += 1
        
        db.commit()
        db.refresh(novel)
        
        return {
            "status": "success",
            "liked": user in novel.liked_users,
            "total_likes": novel.likes
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="좋아요 처리 중 오류가 발생했습니다."
        )

# 메인 화면 추천 서비스 

# 실시간 인기

def recent_hit(days: int, db: Session) -> Optional[Dict[str, Any]]:
    """
    최근 N일 동안 가장 많이 좋아요를 받은 소설 정보 반환
    """
    today = datetime.now()
    day_n_back = today - timedelta(days=days)

    hit_novel = (
        db.query(Novel)
        .join(user_like_table)
        .filter(user_like_table.c.liked_date >= day_n_back)
        .group_by(Novel.novel_pk)
        .order_by(func.count(user_like_table.c.user_pk).desc())
        .first()
    )

    if hit_novel:
        return {
            "title": hit_novel.title,
            "pk": hit_novel.novel_pk
        }
    return None
    

#추천 작품
def momoso_recommend(db : Session) :
    #일단 유저가 가장 많이 읽은 장르를 sorting함.  #novel_genre 테이블에서가장 많이 한 것 sorting
    #조회수 높은 기준으로 sorting함. 
    #조회수 대비 선호작이 가장 놓은 작품 sorting함.
    #이거 3개를 매번 sorting하면 됨.
    # liked, views
    
    genres = db.query(Genre).all()
    
    genres_count = []
    for genre in genres : 
        count = db.query(Novel).join(Novel.genres).filter(Genre.gerne_pk == genre.genre_pk)
        genres_count.append([count, genre.genre])
        
    genre = genres_count.sort()[0][1]

    #속도가 느릴 것 같아서 조금 더 고민해보자. 딱 한번만 더 모델을 바꾸면 진짜 최고인데....ㅠㅠㅠㅠ 하 진짜 
    # 아니면 선호작만 할까?
    # 선호작 대비해서 조회수를 계산하면 좋긴한데 좀 느림.

#에피소드

# 특정 소설의 에피소드 조회

# 이건 detail 의 에피소드 정보 보내자.
def novel_episode(novel_pk: int, db: Session):
    return db.query(Episode).filter(Episode.novel_pk == novel_pk).all()


# 에피소드 저장
def save_episode(novel_pk: int, episode_data: novel_schema.EpisodeCreateBase, db: Session):
    if not episode_data.ep_content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="에피소드 내용이 없습니다.")
    
    episode = Episode(
        ep_title=episode_data.ep_title,
        novel_pk=novel_pk,
        ep_content=episode_data.ep_content
    )
    db.add(episode)
    db.commit()
    db.refresh(episode)
    return episode

# 에피소드 수정
def change_episode(novel_pk: int, update_data: novel_schema.EpisodeUpdateBase, episode_pk : int, db: Session) :
    
    episode  = db.query(Episode).filter(Episode.ep_pk == episode_pk).first()
    if not episode :
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    update_data_dict = update_data.model_dump(exclude_unset=True)  # 변경된 데이터만 가져오기
    print(update_data_dict)
    for key, value in update_data_dict.items():
        setattr(episode, key, value)  # 필드 업데이트
    db.commit()
    db.refresh(episode)
    return episode 


# 에피소드 삭제
def delete_episode(novel_pk: int, episode_pk: int, current_user: User, db: Session):
    # 에피소드 존재 여부 확인
    episode = db.query(Episode).filter(Episode.ep_pk == episode_pk).first()
    if not episode:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Episode not found"
        )
    
    # 소설 존재 여부 및 작성자 확인
    novel = db.query(Novel).filter(Novel.novel_pk == novel_pk).first()
    if not novel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Novel not found"
        )
    
    # 현재 유저가 소설의 작성자인지 확인
    if novel.user_pk != current_user.user_pk:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this episode"
        )
    
    # 에피소드 삭제
    db.delete(episode)
    db.commit()
    
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# 특정 에피소드의 모든 댓글 조회
def get_all_ep_comment(novel_pk: int, ep_pk: int, db: Session):
    return db.query(Comment).filter(Comment.ep_pk == ep_pk).options(joinedload(Comment.user)).all()

# 특정 소설의 모든 댓글 조회
def get_novel_comment(novel_pk: int, db: Session):
    return db.query(Comment).filter(Comment.novel_pk == novel_pk).options(joinedload(Comment.user)).all()

# 댓글 작성
def create_comment(comment_info: novel_schema.CommentBase, novel_pk: int, ep_pk: int, user_pk: int, db: Session):
    comment = Comment(
        novel_pk=novel_pk,
        ep_pk=ep_pk,
        user_pk=user_pk,
        content=comment_info.content,
        likes=comment_info.likes
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment

# 댓글 수정
def update_comment(content: str, comment_pk: int, user_pk: int, db: Session):
    comment = db.query(Comment).filter(
        Comment.comment_pk == comment_pk,
        Comment.user_pk == user_pk  # 작성자 확인
    ).first()
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="댓글을 찾을 수 없습니다.")
    
    comment.content = content
    db.commit()
    db.refresh(comment)
    return comment

# 댓글 삭제
def delete_comment(comment_pk: int, user_pk: int, db: Session):
    comment = db.query(Comment).filter(
        Comment.comment_pk == comment_pk,
        Comment.user_pk == user_pk  # 작성자 확인
    ).first()
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="댓글을 찾을 수 없습니다.")
    
    db.delete(comment)
    db.commit()
    return HTTPException(status_code=status.HTTP_204_NO_CONTENT)

"""
여기서 부터 만들면 됨.
"""

# 댓글 좋아요 및 좋아요 취소
def like_comment(comment_pk: int,user_pk : int,db: Session):
    comment = db.query(Comment).filter(Comment.comment_pk == comment_pk).first()
    user = db.query(User).filter(User.user_pk == user_pk).first()
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="댓글을 찾을 수 없습니다.")
    if not user : 
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail= "해당 유저를 찾을 수 없습니다.")

    if user in comment.liked_users:
        comment.liked_users.remove(user)
        comment.likes -= 1
    else:
        comment.liked_users.append(user)
        comment.likes += 1

    db.commit()
    db.refresh(comment)  # 변경된 comment 객체를 DB에서 다시 로드

    return comment


# 대댓글 작성
def create_cocoment(comment_pk: int, user_pk: int, cocoment_info: novel_schema.CoComentBase, db: Session):
    
    comment = db.query(Comment).filter(Comment.comment_pk == comment_pk).first()
    print("______________________comment________")
    print(comment)
    
    if not comment : 
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="no such comment")

    cocoment = CoComment(
        user_pk=user_pk,
        comment_pk=comment_pk,
        content=cocoment_info.content,
        likes=cocoment_info.likes
    )
    db.add(cocoment)
    db.commit()
    db.refresh(cocoment)
    return cocoment

# 대댓글 좋아요
def like_cocomment(cocomment_pk: int, user_pk: int, db: Session):
    cocomment = db.query(CoComment).filter(CoComment.cocomment_pk == cocomment_pk).first()
    if not cocomment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="대댓글을 찾을 수 없습니다.")

    user = db.query(User).filter(User.user_pk == user_pk).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다.")

    if user in cocomment.liked_users:
        cocomment.liked_users.remove(user)
        cocomment.likes -= 1
    else:
        cocomment.liked_users.append(user)
        cocomment.likes += 1

    db.commit()
    db.refresh(cocomment)
    return cocomment

# 대댓글 수정
def update_cocomment(content: str, cocoment_pk: int, db: Session):
    cocomment = db.query(CoComment).filter(CoComment.cocomment_pk == cocoment_pk).first()
    if not cocomment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="대댓글을 찾을 수 없습니다.")
    
    cocomment.content = content
    db.commit()
    db.refresh(cocomment)
    return cocomment



# 대댓글 삭제
# 여기에 그 소설 댓글의 대댓글 갯수를 -1하는걸 만들어야 함
# 흠 왜 안될까?
def delete_cocomment(cocomment_pk: int, db: Session):
    cocomment = db.query(CoComment).filter(CoComment.cocomment_pk == cocomment_pk).first()
    if not cocomment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="대댓글을 찾을 수 없습니다.")
    
    db.delete(cocomment)
    db.commit()
    return HTTPException(status_code=status.HTTP_204_NO_CONTENT)


def get_cocoment(comment_pk : int,db: Session ) : 
    return db.query(CoComment).filter(CoComment.comment_pk == comment_pk).all()


# 전체 등장인물 불러오기
def get_character(novel_pk: int, db: Session):
    return db.query(Character).filter(Character.novel_pk == novel_pk).all()

# 특정 등장 인물 생성 
def save_character(novel_pk: int, character_info : novel_schema.CharacterBase, db: Session) -> novel_schema.CharacterBase: 
    new_character = Character(
        novel_pk=novel_pk,
        name=character_info.name,
        role=character_info.role,
        age=character_info.age,
        sex=character_info.sex,
        job=character_info.job,
        profile=character_info.profile,
    )
    db.add(new_character)
    db.commit()
    return new_character

# 특정 등장인물 정보 수정
def update_character(character_pk : int, update_data: novel_schema.CharacterUpdateBase, db: Session) : 
    character = db.query(Character).filter(Character.character_pk == character_pk).first()
    if not character:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="등장 인물을 찾을 수 없습니다.")

    update_data_dict = update_data.model_dump(exclude_unset=True)  # 변경된 데이터만 가져오기

    print(update_data_dict)
    for key, value in update_data_dict.items():
        setattr(character, key, value)  # 필드 업데이트

    db.commit()
    db.refresh(character)
    return character

#등장인물 삭제
def delete_character(character_pk : int, db: Session) : 
    character = db.query(Character).filter(Character.character_pk == character_pk).first()
    if not character : 
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="존재하지 않는 캐릭터입니다.")
    else :
        db.delete(character)
        db.commit()
        return HTTPException(status_code=status.HTTP_204_NO_CONTENT)

"""
SCOPES = ['https://www.googleapis.com/auth/drive.file']

# 표지 저장
def save_cover(user_or_nov : str, pk : int, image_path : str, drive_folder_id : str, db: Session) : 
    # image_path = os.path.join(os.getcwd(), "static", file_name+".jpg")
    """
    # 이미지를 Google Drive에 업로드합니다.

    # Args:
    #     image_path (str): 업로드할 이미지 파일 경로.
    #     drive_folder_id (str): 이미지를 저장할 Google Drive 폴더 ID.

    # Returns:
    #     dict: 업로드 성공 시 파일 ID를 포함한 결과 반환.
    #     None: 업로드 실패 시 None 반환.
"""
    json_key_path = os.path.join(os.getcwd(), "momoso-450108-0d3ffb86c6ef.json")

    # JSON 파일 존재 여부 확인
    if not os.path.exists(json_key_path):
        print(f"JSON 키 파일이 존재하지 않습니다: {json_key_path}")
        return None
    try:
        print("Json 파일 인식 완료함. ")
        # Credentials 객체 생성 (from_service_account_file 사용)
        creds = service_account.Credentials.from_service_account_file(json_key_path, scopes=SCOPES)

        # Google Drive API 서비스 객체 생성
        print("객체 생성함. ")
        service = build('drive', 'v3', credentials=creds)

        # 파일 존재 여부 확인
        print("파일 존재 여부 확인")
        if not os.path.exists(image_path):
            print(f"파일이 존재하지 않습니다: {image_path}")
            return None

        # 파일 메타데이터 설정
        print("파일 메타 데이터 설정시작")
        file_metadata = {
            'name': os.path.basename(image_path),
            'parents': [drive_folder_id]
        }

        # 미디어 파일 업로드 객체 생성]
        print("업로드 객체 생성 시작")
        media = MediaFileUpload(image_path, mimetype='image/jpg', resumable=False)

        print("업로드 실행 시작")
        file = service.files().create(body=file_metadata, media_body=media, fields='id').execute()
        

        print(f"파일이 업로드되었습니다. 응답 데이터: {file.get('id')}")
        file_id = file.get('id')

        if user_or_nov == "user" : 
            data = db.query(User).filter(User.user_pk == pk).first()
            if data.user_img : 
                delete_image(data.user_img, drive_folder_id)
            data.user_img = file_id
        elif user_or_nov == "novel" : 
            data = db.query(Novel).filter(Novel.novel_pk == pk).first()
            if data.novel_img : 
                delete_image(data.novel_img, drive_folder_id)
            data.novel_img = file_id
        else :
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="user 이나 novel 둘 중 하나를 선택해주세요.")
        
        db.add(data)
        db.commit()
        db.refresh(data)

        return data

    except Exception as e:
        print(f"업로드 실패: {e}")
        return None


def delete_image(file_id : str, drive_folder_id : str):
    # JSON 파일 절대 경로로 변환
    json_key_path = os.path.join(os.getcwd(), "momoso-450108-0d3ffb86c6ef.json")

    creds = service_account.Credentials.from_service_account_file(json_key_path, scopes=SCOPES)

    service = build('drive', 'v3', credentials=creds)
    try:
        service.files().delete(fileId=file_id).execute()
        print(f"파일(ID: {file_id})이 성공적으로 삭제되었습니다.")
    except Exception as e:
        print(f"파일 삭제 중 오류 발생: {e}")


"""



#로컬에서 파일 업로드 하는 기능

async def image_upload(file: UploadFile = File(...)) : 
    
    if not file:
        raise HTTPException(status_code=400, detail="No file provided")

    try:
        filename = file.filename
        filepath = os.path.join(os.getcwd(), "static", filename)

        # 파일 저장
        with open(filepath, "wb") as f:
            contents = await file.read()  # 파일 내용을 읽음 (await 사용!)
            f.write(contents)
        return filepath

    except Exception as e:
        #  os.remove(filepath)  <- 파일이 없는 경우 에러 발생 가능성
        if os.path.exists(filepath): # 파일이 존재하는지 확인
            os.remove(filepath)
        raise HTTPException(status_code=500, detail=str(e))

def get_previous_chapters(db: Session, novel_pk: int) -> str:
    """DB에서 해당 소설의 모든 챕터 내용을 불러와 하나의 문자열로 합칩니다."""
    episodes = (
        db.query(Episode)
        .filter(Episode.novel_pk == novel_pk)
        .order_by(Episode.ep_pk.asc())  # 챕터 순서대로 정렬
        .all()
    )
    return "\n\n---\n\n".join([ep.ep_content for ep in episodes]) if episodes else ""

IMGUR_CLIENT_ID = os.environ.get("IMGUR_CLIENT_ID")


async def upload_to_imgur(image: UploadFile):
    """Imgur에 이미지를 업로드하고 링크를 반환합니다."""
    try:
        imgur_url = "https://api.imgur.com/3/image"
        headers = {"Authorization": f"Client-ID {IMGUR_CLIENT_ID}"}
        files = {"image": (image.filename, await image.read(), image.content_type)}

        async with httpx.AsyncClient() as client:
            response = await client.post(imgur_url, headers=headers, files=files)

        response.raise_for_status()
        data = response.json()

        if data["success"]:
            return data["data"]["link"]
        else:
            raise HTTPException(status_code=500, detail=data["data"]["error"])

    except httpx.HTTPStatusError as e:
        print(f"Imgur API error: {e}")
        raise HTTPException(status_code=500, detail="Imgur API 오류")
    except Exception as e:
        print(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail="이미지 업로드 실패")
    
def get_episode_detail(novel_pk: int, ep_pk: int, db: Session):
    """
    Get detailed information about a specific episode of a novel
    
    Args:
        novel_pk (int): Primary key of the novel
        ep_pk (int): Primary key of the episode
        db (Session): Database session
        
    Returns:
        tuple: Novel and Episode objects
        
    Raises:
        HTTPException: If novel or episode is not found
    """
    # Query both novel and episode
    novel = db.query(Novel).filter(Novel.novel_pk == novel_pk).first()
    if not novel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Novel not found"
        )
    
    episode = db.query(Episode).filter(
        Episode.novel_pk == novel_pk,
        Episode.ep_pk == ep_pk
    ).first()
    if not episode:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Episode not found"
        )
    
    # Increment view count
    episode.views += 1
    db.commit()
    db.refresh(episode)
    
    return novel, episode