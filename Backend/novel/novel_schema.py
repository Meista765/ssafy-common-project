from pydantic import BaseModel, field_validator, Field
from typing import Optional, Dict, List
from datetime import datetime
from user.user_schema import RecentNovel

# 메인 페이지 스키마
class UserRecentNovel(BaseModel):
    user_pk: int
    name: str
    nickname: str
    recent_novels: Optional[List[RecentNovel]]

    class Config:
        from_attributes = True

class NovelInfo(BaseModel):
    title: str
    pk: int

class MainPageResponse(BaseModel):
    user: UserRecentNovel
    recent_best: Optional[NovelInfo] = None
    month_best: Optional[NovelInfo] = None

    class Config:
        from_attributes = True


class CharacterBase(BaseModel) : 
    # novel_pk : int
    name : str
    role : str
    age : str 
    sex : str
    job : str
    profile : str



class GenreGetBase(BaseModel) : 
    genre_pk: int
    genre : str

    class Config:
        from_attributes = True

class NovelShowBase(BaseModel) : 
    novel_pk : int
    title: str
    created_date : datetime  
    updated_date : datetime   # 이거 뭐로 해야 하냐? 
    summary : Optional[str] = None
    novel_img : str 
    views : int
    likes : int
    is_completed : bool
    genre: List[GenreGetBase] 
    
    class Config:
        from_attributes = True

class NovelShowBaseCreate(BaseModel) : 
    novel_pk : int
    title: str
    created_date : Optional[datetime] = None  
    updated_date : Optional[datetime] = None   # 이거 뭐로 해야 하냐? 
    summary : Optional[str] = None
    novel_img : str 
    views : int
    likes : int
    is_completed : bool
    genres: List[GenreGetBase] 
    
    class Config:
        from_attributes = True



class NovelCreateBase(BaseModel):
    title: str
    worldview: str
    synopsis: str
    summary : Optional[str] = None
    genres: List[str] = Field(description="List of genre names")

    class Config:
        from_attributes = True


# class NovelShowBase(BaseModel) : 
#     novel_pk : int
#     title: str
#     worldview: str
#     synopsis: str
#     summary : Optional[str] = None
#     genres: List[str] = Field(description="List of genre names")

#     class Config:
#         from_attributes = True


# 소설 기본 정보 (응답용)
class NovelBase(NovelCreateBase):
    novel_pk: int
    num_episode: int = 0
    likes: int = 0
    views: int = 0
    is_completed: bool = False

    class Config:
        from_attributes = True

    


# 소설 부분 업데이트 요청
class NovelUpdateBase(BaseModel):
    title: Optional[str] = None
    summary : Optional[str] = None
    worldview: Optional[str] = None
    synopsis: Optional[str] = None
    genre: Optional[List[str]] = None
    is_completed: Optional[bool] = None
    
    #아래 부분 삭제해도 정상 작동하는지 확인
    @field_validator("title", "worldview", "synopsis")
    @classmethod
    def validate_not_empty(cls, v):
        if v is not None and not v.strip():
            raise ValueError("제목, 세계관, 시놉시스 필드는 비워둘 수 없습니다.")
        return v
    
    @field_validator("genre")
    @classmethod
    def validate_genre_not_empty(cls, v):
        if v is not None and not v: #none과 비어있는 리스트 모두 허용 불가
            raise ValueError("장르 필드는 비워둘 수 없습니다.")
        return v
    

# 에피소드 생성 요청
class EpisodeCreateBase(BaseModel):
    ep_title: str
    ep_content: str

    @field_validator("ep_title", "ep_content")
    @classmethod
    def validate_not_empty(cls, v):
        if not v.strip():
            raise ValueError("이 필드는 비워둘 수 없습니다.")
        return v

# 에피소드 기본 정보 (응답용)
class EpisodeBase(EpisodeCreateBase):
    ep_pk: int
    novel_pk: int
    views: int = 0
    comment_cnt: int = 0

    class Config:
        from_attributes = True


class EpisodeUpdateBase(BaseModel) : 
    ep_title: Optional[str] = None
    ep_content: Optional[str] = None


# 댓글 생성 요청
class CommentBase(BaseModel):
    content: str
    likes: Optional[int] = 0

    @field_validator("content")
    @classmethod
    def validate_not_empty(cls, v):
        if not v.strip():
            raise ValueError("댓글 내용을 입력하세요.")
        return v

# 대댓글 생성 요청
class CoComentBase(BaseModel):
    content: str
    likes: Optional[int] = 0

    @field_validator("content")
    @classmethod
    def validate_not_empty(cls, v):
        if not v.strip():
            raise ValueError("대댓글 내용을 입력하세요.")
        return v

class CharacterBase(BaseModel) : 
    # novel_pk : int
    name : str
    role : str
    age : str 
    sex : str
    job : str
    profile : str

class CharacterUpdateBase(BaseModel) :
    name: Optional[str] = None
    role: Optional[str] = None
    age: Optional[str] = None  # int -> str
    sex: Optional[str] = None  # bool -> str
    job: Optional[str] = None
    profile: Optional[str] = None

    @field_validator("name","role", "age","sex","job","profile")
    @classmethod
    def validate_not_empty(cls, v):
        if v is None or not v.strip():
            raise ValueError("이 필드는 비워둘 수 없습니다.")
        return v  # 값을 반환해야 함
    
    


# 소설 생성 AI 모델 응답용 스키마

class WorldviewRequest(BaseModel):
    genre: str
    title: str

class SynopsisRequest(BaseModel):
    genre: str
    title: str
    worldview: str

class SummaryRequest(BaseModel):
    genre: str
    title: str
    worldview: str
    synopsis : str

class CharacterModel(BaseModel):
    name: str
    sex: str
    age: str
    role: str
    job: str
    profile: str

class CharacterRequest(BaseModel):
    genre: str
    title: str
    worldview: str
    summary : Optional[str] = None
    synopsis: str
    characters: List[CharacterModel] = []  # 기존 캐릭터가 있으면 함께 전달 가능


class CreateChapterRequest(BaseModel):
    novel_pk: Optional[int] = None 
    title: str
    genre: str
    synopsis: str
    worldview: str
    characters: List[Dict] = []


class ImageRequest(BaseModel):
    genre: str
    style: str
    title: str
    worldview: str
    keywords: List[str]


class EpisodeDetailResponse(BaseModel):
    # Novel info
    novel_title: str
    # Episode info
    ep_title: str
    ep_content: str
    created_date: datetime
    updated_date: datetime

    class Config:
        from_attributes = True


class NovelTitleResponse(BaseModel):
    novel_title: str