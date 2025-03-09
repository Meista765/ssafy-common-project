from sqlalchemy import Column, Integer, String, Boolean, Text, ForeignKey, DateTime, Table
from sqlalchemy.orm import relationship, Mapped
from sqlalchemy.sql import func
from sqlalchemy.ext.declarative import declarative_base
from fastapi_users.db import SQLAlchemyBaseOAuthAccountTable



Base = declarative_base()

# User와 최근 본 Novel의 M:N 관계를 위한 연결 테이블
user_recent_novel_table = Table(
    "user_recent_novel",
    Base.metadata,
    Column("user_pk", Integer, ForeignKey("users.user_pk", ondelete="CASCADE"), primary_key=True),
    Column("novel_pk", Integer, ForeignKey("novel.novel_pk", ondelete="CASCADE"), primary_key=True),
    Column("viewed_date", DateTime, default=func.now())  # 최근 본 날짜 저장
)

# User와 Discussion의 M:N 관계 설정
user_discussion_table = Table(
    "user_discussion",
    Base.metadata,
    Column("user_pk", Integer, ForeignKey("users.user_pk"), primary_key=True),
    Column("discussion_pk", Integer, ForeignKey("discussion.discussion_pk"), primary_key=True),
)

# User와 Novel의 M:N 관계를 위한 연결 테이블
user_like_table = Table(
    "userlike",
    Base.metadata,
    Column("novel_pk", Integer, ForeignKey("novel.novel_pk", ondelete="CASCADE"), primary_key=True),
    Column("user_pk", Integer, ForeignKey("users.user_pk", ondelete="CASCADE"), primary_key=True),
    Column("liked_date", DateTime, default=func.now()) # 선호작을 한 시간 
)

# User와 Comment 간의 M:N 관계를 위한 연결 테이블 (댓글 좋아요)
user_comment_like_table = Table(
    "user_comment_like",
    Base.metadata,
    Column("user_pk", Integer, ForeignKey("users.user_pk", ondelete="CASCADE"), primary_key=True),
    Column("comment_pk", Integer, ForeignKey("comment.comment_pk", ondelete="CASCADE"), primary_key=True),
)

# User와 CoComment 간의 M:N 관계를 위한 연결 테이블 (대댓글 좋아요)
user_cocomment_like_table = Table(
    "user_cocomment_like",
    Base.metadata,
    Column("user_pk", Integer, ForeignKey("users.user_pk", ondelete="CASCADE"), primary_key=True),
    Column("cocomment_pk", Integer, ForeignKey("cocomment.cocomment_pk", ondelete="CASCADE"), primary_key=True),
)

novel_genre_table = Table(
    "novel_genre",
    Base.metadata,
    Column("novel_pk", Integer, ForeignKey("novel.novel_pk", ondelete="CASCADE"), primary_key=True),
    Column("genre_pk", Integer, ForeignKey("genre.genre_pk", ondelete="CASCADE"), primary_key=True),
)


class OAuthAccount(SQLAlchemyBaseOAuthAccountTable, Base):
    """
    OAuth2 로그인 계정을 저장하는 테이블
    (Google, Kakao, Naver 등 OAuth 로그인 시 사용자 계정 정보 저장)
    """
    __tablename__ = "oauth_account"  # 테이블 명시적으로 지정

    id = Column(Integer, primary_key=True, index=True)  # 기본 키 추가
    user_id = Column(Integer, ForeignKey("users.user_pk", ondelete="CASCADE"), nullable=False)

# User Model
class User(Base):
    __tablename__ = "users"

    user_pk = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False)
    name = Column(String(50), nullable=False)
    nickname = Column(String(50), unique=True, nullable=False)
    phone = Column(String(50), nullable=True) # OAuth2 로그인 시, blank 가능
    password = Column(String(255), nullable=True) #OAuth2 로그인 시, blank 가능
    user_img = Column(Text, default="static_url")
    is_oauth_user = Column(Boolean, default=False)  # OAuth2 로그인 여부

    # OAuth2 계정과 연결
    oauth_accounts: Mapped[list[OAuthAccount]] = relationship("OAuthAccount", lazy="select", cascade="all, delete, delete-orphan", passive_deletes=True)

    recent_novels = relationship("Novel", secondary=user_recent_novel_table, back_populates="recent_viewers", passive_deletes=True, lazy="subquery") # 최근에 본 소설 (1:N 관계)
    liked_novels = relationship("Novel", secondary=user_like_table, back_populates="liked_users", passive_deletes=True)# M:N 관계 설정 (소설 좋아요) 
    liked_comments = relationship("Comment", secondary=user_comment_like_table, back_populates="liked_users", passive_deletes=True) # M:N 관계 설정 (댓글 좋아요)    
    liked_cocomments = relationship("CoComment", secondary=user_cocomment_like_table, back_populates="liked_users", passive_deletes=True) # M:N 관계 설정 (대댓글 좋아요)
    comments = relationship("Comment", back_populates="user", cascade="all, delete-orphan", passive_deletes=True) # 1:N 관계 설정 (작성한 댓글)
    cocomments = relationship("CoComment", back_populates="user", cascade="all, delete-orphan", passive_deletes=True) # 1:N 관계 설정 (작성한 대댓글)
    discussions = relationship("Discussion", secondary=user_discussion_table, back_populates="participants") # Discussion과의 M:N 관계 설정

# Novel Model (Synopsis와 병합됨)
class Novel(Base):
    __tablename__ = "novel"

    novel_pk = Column(Integer, primary_key=True, autoincrement=True)
    user_pk = Column(Integer, ForeignKey("users.user_pk", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)
    worldview = Column(Text, nullable=False)
    synopsis = Column(Text, nullable=False)  # = description
    summary = Column(Text, nullable=True)
    novel_img = Column(Text, default="static_url")
    created_date = Column(DateTime, default=func.now())
    updated_date = Column(DateTime, default=func.now(), onupdate=func.now())
    num_episode = Column(Integer, default=0)
    likes = Column(Integer, default=0)
    views = Column(Integer, default=0)
    
    is_completed = Column(Boolean, default=False)

    # M:N 관계 설정
    liked_users = relationship("User", secondary=user_like_table, back_populates="liked_novels")    # 장르 M:N 관계
    genres = relationship("Genre", secondary=novel_genre_table, back_populates="novels", cascade="all, delete", passive_deletes=True)
    recent_viewers = relationship("User", secondary=user_recent_novel_table, back_populates="recent_novels")

    @property
    def genre_names(self):
        return [genre.genre for genre in self.genres]

class Genre(Base) : 
    __tablename__ = "genre"
    genre_pk = Column(Integer, primary_key=True, autoincrement=True)  # Add a primary key
    genre = Column(String(50), nullable=False, unique=True) # Genre name should be unique
    # M:N relationship with Novel
    novels = relationship("Novel", secondary=novel_genre_table, back_populates="genres")

# Character Model (synopsis_fk -> novel_fk로 변경)
class Character(Base):
    __tablename__ = "character"

    character_pk = Column(Integer, primary_key=True, autoincrement=True)
    novel_pk = Column(Integer, ForeignKey("novel.novel_pk", ondelete="CASCADE"), nullable=False)
    name = Column(String(20), nullable=False)
    role = Column(String(20), nullable=False)
    age = Column(String(40), nullable=False)
    sex = Column(String(20), nullable=False)  # 0 for male, 1 for  female, 2 for somethingelse
    job = Column(String(20), nullable=False)
    profile = Column(Text, nullable=False)

# Episode Model
class Episode(Base):
    __tablename__ = "episode"

    ep_pk = Column(Integer, primary_key=True, autoincrement=True)
    ep_title = Column(String(255), nullable=False)
    novel_pk = Column(Integer, ForeignKey("novel.novel_pk", ondelete="CASCADE"), nullable=False)
    created_date = Column(DateTime, default=func.now())
    updated_date = Column(DateTime, default=func.now(), onupdate=func.now())
    views = Column(Integer, default=0)
    comment_cnt = Column(Integer, default=0)
    ep_content = Column(Text, nullable=False)

# Comment Model
class Comment(Base):
    __tablename__ = "comment"

    comment_pk = Column(Integer, primary_key=True, autoincrement=True)
    novel_pk = Column(Integer, ForeignKey("novel.novel_pk"), nullable=False)
    ep_pk = Column(Integer, ForeignKey("episode.ep_pk"), nullable=False)
    user_pk = Column(Integer, ForeignKey("users.user_pk"), nullable=False)
    created_date = Column(DateTime, default=func.now())
    content = Column(Text, nullable=False)
    cocomment_cnt = Column(Integer, default=0)
    likes = Column(Integer, default=0)

    # M:N 관계 설정 (댓글 좋아요)
    liked_users = relationship("User", secondary=user_comment_like_table, back_populates="liked_comments", passive_deletes=True)

    # 1:N 관계 설정 (작성한 사용자)
    user = relationship("User", back_populates="comments", passive_deletes=True)

    # 1:N 관계 설정 (대댓글)
    cocomments = relationship("CoComment", back_populates="comment", cascade="all, delete-orphan", passive_deletes=True)

# CoComment Model
class CoComment(Base):
    __tablename__ = "cocomment"

    cocomment_pk = Column(Integer, primary_key=True, autoincrement=True)
    user_pk = Column(Integer, ForeignKey("users.user_pk", ondelete="CASCADE"), nullable=False)
    comment_pk = Column(Integer, ForeignKey("comment.comment_pk", ondelete="CASCADE"), nullable=False)
    created_date = Column(DateTime, default=func.now())
    content = Column(Text, nullable=False)
    likes = Column(Integer, default=0)

    # M:N 관계 설정 (대댓글 좋아요)
    liked_users = relationship("User", secondary=user_cocomment_like_table, back_populates="liked_cocomments",  passive_deletes=True)

    # 1:N 관계 설정 (작성한 사용자)
    user = relationship("User", back_populates="cocomments")

    # 1:N 관계 설정 (댓글)
    comment = relationship("Comment", back_populates="cocomments")

# Discussion Model
class Discussion(Base):
    __tablename__ = "discussion"

    discussion_pk = Column(Integer, primary_key=True, autoincrement=True)
    novel_pk = Column(Integer, ForeignKey("novel.novel_pk", ondelete="CASCADE"), nullable=False)
    ep_pk = Column(Integer, ForeignKey("episode.ep_pk"), nullable=True)
    session_id = Column(Text, nullable=False)
    topic = Column(Text, nullable=False)
    category = Column(Boolean, nullable=False) # category 0이면 전체에 대한 토론, 1이면 회차별 토론
    start_time = Column(DateTime, default=func.now())
    end_time = Column(DateTime, nullable=True)
    max_participants = Column(Integer, nullable=False)
    is_active = Column(Boolean, nullable=False, default=1) # 0: inactvie, 1 : active

    participants = relationship("User", secondary=user_discussion_table, back_populates="discussions") # M:N 관계 (토론 참여자)
    note = relationship("Note", uselist=False, back_populates="discussion") # 1:1 관계

# Note Model
class Note(Base):
    __tablename__ = "note"

    note_pk = Column(Integer, primary_key=True, autoincrement=True)
    novel_pk = Column(Integer, ForeignKey("novel.novel_pk", ondelete="CASCADE"), nullable=False)
    user_pk = Column(Integer, ForeignKey("users.user_pk", ondelete="CASCADE"), nullable=False) # 토론이 이뤄진 소설의 작가
    discussion_pk = Column(Integer, ForeignKey("discussion.discussion_pk", ondelete="CASCADE"), nullable=False)
    summary = Column(Text, nullable=False)

    discussion = relationship("Discussion", back_populates="note") # 1:1 관계