from pydantic import BaseModel, Field, EmailStr, field_validator
from fastapi import HTTPException
from typing import List, Optional
from datetime import datetime

# 사용자 조회
class User(BaseModel):
    user_pk: int
    email: str
    name: str
    nickname: str
    phone: Optional[str] = None
    user_img: str

    class Config:
        from_attributes = True

# 사용자 정보 수정
class UpdateUserForm(BaseModel):
    nickname: str = Field(None, min_length=1, max_length=50, description="수정할 닉네임")
    phone: str = Field(None, description="수정할 전화번호")
    user_img: str = Field(None, description="수정할 유저 이미지")


    class Config:
        extra = "forbid"  # 정의되지 않은 필드는 허용하지 않음

    @field_validator('phone')
    @classmethod
    def check_phone_format(cls, v):
        if v and (not v.startswith("010") or len(v) != 13 or '-' not in v):
            raise HTTPException(status_code=422, detail="전화번호는 '010-XXXX-XXXX' 형식으로 입력해야 합니다.")
        return v


class DeleteUserForm(BaseModel):
    email: EmailStr = Field(..., description="사용자 이메일")
    password: str = Field(..., description="사용자 비밀번호")


# 사용자가 최근 본 Novel, 좋아요한 Novel, Comment, Cocomment
class RecentNovel(BaseModel):
    novel_pk: int
    title: str
    novel_img: str
    is_completed: bool

    class Config:
        from_attributes = True

class UserNovel(BaseModel):
    novel_pk: int
    title: str
    novel_img: str
    is_completed: bool

    class Config:
        from_attributes = True

class UserComment(BaseModel):
    comment_pk: int
    novel_pk: int
    ep_pk: int
    content: str
    created_date: datetime
    cocomment_cnt: int
    likes: int
    novel_title: str
    ep_title: str

    class Config:
        from_attributes = True

class UserCocomment(BaseModel):
    cocomment_pk: int
    comment_pk: int
    content: str
    created_date: datetime
    likes: int
    novel_title: str
    ep_title: str
    novel_pk: int
    ep_pk: int

    class Config:
        from_attributes = True

class UserWrittenNovel(BaseModel):
    novel_pk: int
    title: str
    synopsis: str
    novel_img: str
    created_date: datetime
    updated_date: datetime
    num_episode: int
    likes: int
    views: int
    is_completed: bool

    class Config:
        from_attributes = True

# 사용자 상세 정보 조회 스키마
class UserDetail(BaseModel):
    user_pk: int
    name: str
    nickname: str
    user_img: str
    recent_novels: Optional[List[RecentNovel]]
    liked_novels: List[UserNovel]
    liked_comments: List[UserComment]
    liked_cocomments: List[UserCocomment]
    comments: List[UserComment]
    cocomments: List[UserCocomment] 
    novels_written: List[UserWrittenNovel] 

    class Config:
        from_attributes = True