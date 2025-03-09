from fastapi import FastAPI, Request
import os
from contextlib import asynccontextmanager
from redis.asyncio import Redis
from concurrent.futures import ThreadPoolExecutor
from utils.redis_utils import create_redis_client
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.middleware.cors import CORSMiddleware

from user import user_router
from auth import auth_router
from novel import novel_router
from discussion import discussion_router
from auth.oauth_google import router as google_oauth_router

from database import engine
from models import Base
from fastapi.staticfiles import StaticFiles

# CustomHeaderMiddleware 정의
class CustomHeaderMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin-allow-popups"
        response.headers["Cross-Origin-Embedder-Policy"] = "unsafe-none"
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        print("🚀 FastAPI 서버 시작 - lifespan 시작됨!")

        # Redis 클라이언트 생성
        app.state.redis = await create_redis_client()
        print("✅ Redis 연결 완료!")

        # ThreadPoolExecutor를 app.state에 저장
        app.state.thread_pool = ThreadPoolExecutor(max_workers=4)
        print("✅ ThreadPoolExecutor 초기화 완료!")

        # 라우터 등록
        app.include_router(auth_router.router, tags=["auth"])
        app.include_router(user_router.router, tags=["user"])
        app.include_router(novel_router.router, tags=["novel"])
        app.include_router(discussion_router.router, tags=["discussion"])
        app.include_router(google_oauth_router, tags=["oauth"], prefix="/api/v1")

        yield

    finally:
        # Redis 연결 종료
        if hasattr(app.state, "redis"):
            await app.state.redis.close()

        # ThreadPoolExecutor 종료
        if hasattr(app.state, "thread_pool"):
            app.state.thread_pool.shutdown(wait=True)
            print("✅ ThreadPoolExecutor 정상 종료!")

        print("🛑 FastAPI 서버 종료!")


app = FastAPI(lifespan=lifespan)
app.mount("/static", StaticFiles(directory="static"), name="static")

# CORS origins 설정
origins = [
    "http://localhost",
    "http://localhost:5173",
    "http://127.0.0.1",
    "http://127.0.0.1:5173",
    "http://172.23.144.1:5173",
    "http://172.20.10.9:5173",
    "http://43.202.64.156",
    "http://43.202.64.156:5173",
    "https://momoso106.duckdns.org/",
]

# 미들웨어 추가 (순서 중요)
app.add_middleware(CustomHeaderMiddleware)  # 먼저 CustomHeaderMiddleware 추가

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS", "DELETE", "PATCH", "PUT"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Set-Cookie"],
    expose_headers=["Set-Cookie"],
)


@app.get("/")
def read_root():
    return {"Hello": "World"}


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        log_level="info",
        reload=True,
    )
