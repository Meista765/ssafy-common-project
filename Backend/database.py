from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
import os
from typing import Generator

# .env 파일 로드
load_dotenv()

# 데이터베이스 설정
def get_db_url() -> str:
    """데이터베이스 URL을 생성하는 함수"""
    user = os.getenv("DB_USER")
    passwd = os.getenv("DB_PASSWD")
    host = os.getenv("DB_HOST")
    port = os.getenv("DB_PORT")
    db = os.getenv("DB_NAME")
    
    return f'mysql+pymysql://{user}:{passwd}@{host}:{port}/{db}?charset=utf8mb4'

# 데이터베이스 설정값
DB_URL = get_db_url()
POOL_SIZE = int(os.getenv("DB_POOL_SIZE", "5"))
MAX_OVERFLOW = int(os.getenv("DB_MAX_OVERFLOW", "10"))
POOL_RECYCLE = int(os.getenv("DB_POOL_RECYCLE", "3600"))
POOL_PRE_PING = os.getenv("DB_POOL_PRE_PING", "true").lower() == "true"

# Engine 설정
def create_engine_with_settings():
    """데이터베이스 엔진을 생성하는 함수"""
    return create_engine(
        DB_URL,
        echo=True,
        pool_size=POOL_SIZE,
        max_overflow=MAX_OVERFLOW,
        pool_recycle=POOL_RECYCLE,
        pool_pre_ping=POOL_PRE_PING
    )

engine = create_engine_with_settings()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base = declarative_base()  # models.py로 이동됨

def get_db() -> Generator:
    """데이터베이스 세션을 생성하는 함수"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()