
from fastapi import Depends, HTTPException, APIRouter
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from models import User, Novel
from utils.auth_utils import get_current_user
from auth.auth_router import check_verified

from . import user_crud, user_schema
from utils.redis_utils import get_redis
from database import get_db
from typing import List
from redis import Redis

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

router = APIRouter(
    prefix='/api/v1/users',
)


@router.get('/', description="전체 사용자 조회", response_model=list[user_schema.User])
def get_users(db:Session=Depends(get_db)):
    users = user_crud.get_users(db)
    return users

@router.get('/logged-in', description="현재 사용자 정보 조회", response_model=user_schema.User)
def get_user(current_user: User = Depends(get_current_user)):
    return current_user

@router.get('/detail', description="현재 로그인된 사용자 상세 조회(마이 페이지 데이터 출력용)", response_model=user_schema.UserDetail)
def get_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return user_crud.get_user_profile(db, user=current_user)


@router.put('/', description="현재 사용자 정보 수정", response_model=user_schema.User)
async def update_user(
    updated_user: user_schema.UpdateUserForm,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    redis_client: Redis = Depends(get_redis)
):
    
    if updated_user.phone:
        if not current_user.phone or updated_user.phone != current_user.phone:
            try:
                await check_verified(updated_user.phone, redis_client)
            except Exception as e:
                raise

    updated_user = user_crud.update_user(db, current_user, updated_user)
    return updated_user


@router.delete('/{user_id}', description='사용자 계정 삭제')
def delete_user(
    user_id: int,
    credentials: user_schema.DeleteUserForm,
    db: Session = Depends(get_db)
):
    # 사용자 조회
    user = user_crud.get_user(db, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not Found")

    # 이메일 검증
    if user.email != credentials.email:
        raise HTTPException(status_code=401, detail="Invalid email")

    # 비밀번호 검증
    if not pwd_context.verify(credentials.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid password")

    # 사용자 삭제
    user_crud.delete_user(db, user)
    return {"message": "User deleted successfully"}



@router.get("/novels-written", description="로그인한 사용자가 작성한 소설 목록 조회", response_model=List[user_schema.UserWrittenNovel])
async def get_novels_written(current_user: User = Depends(get_current_user), db:Session=Depends(get_db)):
    """
    사용자가 작성한 소설 목록을 가져옴
    """
    novels_written = db.query(Novel).filter(Novel.user_pk == current_user.user_pk).all()
    return novels_written


@router.get("/recent-novels", description="로그인한 사용자가 최근 본 소설 목록 조회")
async def get_recent_novels(current_user: User = Depends(get_current_user)):
    """
    사용자가 최근에 조회한 소설 목록을 가져옴
    """
    if not current_user.recent_novels:
        return {"message": "Recently seen novels do not exist"}

    return {
        "recent_novels": [
            {
                "novel_pk": novel.novel_pk,
                "title": novel.title,
                "synopsis": novel.synopsis,
                "novel_img": novel.novel_img,
            }
            for novel in current_user.recent_novels
        ]
    }


# episode 정보를 조회할 때 로직과 합쳐야 할 듯.
@router.post("/recent-novel/{novel_pk}", description="로그인한 사용자가 조회한 소설 저장")
async def save_recent_novel(
    novel_pk: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    로그인한 사용자가 조회한 소설을 최근 본 소설 목록에 저장
    """
    return user_crud.save_recent_novel(db, current_user.user_pk, novel_pk)