import os
import redis.asyncio as redis
from redis.exceptions import ConnectionError
from fastapi import Request

REDIS_HOST = os.environ.get("REDIS_HOST", "redis")
REDIS_PORT = os.environ.get("REDIS_PORT", "6379")
REDIS_PASSWORD = os.environ.get("REDIS_PASSWORD", None)

async def create_redis_client():
    """비동기 Redis 클라이언트 생성 및 연결 테스트"""
    try:
        redis_port = int(REDIS_PORT)
        client = redis.Redis(
            host=REDIS_HOST, port=redis_port, password=REDIS_PASSWORD, decode_responses=True
        )
        await client.ping()  # 비동기 방식으로 Redis 연결 확인
        print("✅ Redis 연결 성공!")
        return client
    except ConnectionError as e:
        print(f"❌ Redis 연결 실패: {e}")
        raise
    except ValueError as e:
        print(f"❌ REDIS_PORT 환경 변수 오류: {e}")
        raise

async def get_redis(request: Request):
    """비동기 Redis 클라이언트를 의존성으로 주입"""
    return request.app.state.redis
