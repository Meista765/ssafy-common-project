from fastapi import HTTPException, Depends, status, Header, Response, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError, ExpiredSignatureError
from sqlalchemy.orm import Session
from database import get_db
from models import User
from user import user_crud
import os
from datetime import datetime, timedelta, timezone
from typing import Optional
import random
import string
from twilio.rest import Client
from redis import Redis
from utils.redis_utils import get_redis  # utils.redis_utils에서 get_redis 함수 import

# Twilio 설정
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_VERIFY_SID = os.getenv("TWILIO_VERIFY_SID")
client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

# JWT 발급 설정
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = float(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = float(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

# Bearer 인증 설정 : auto_error=False 비로그인 사용자 refresh_token 미입력
security = HTTPBearer(auto_error=False)

# ====================================================== 휴대전화 인증 로직 ==========================================================

def send_sms(phone: str):
    """
    전화번호로 인증번호 발송
    """
    try:
        e164_phone = to_e164(phone)  # E.164 형식 변환
        client.verify.services(TWILIO_VERIFY_SID).verifications.create(
            to=e164_phone,
            channel="sms"
        )
        return {"message": "인증번호가 성공적으로 전송되었습니다."}
    except ValueError as e:
        raise HTTPException(status_code=422, detail="전화번호는 010-xxxx-xxxx 형식으로 입력해주세요.")
    except Exception as e:
        # 로깅 추가 (예: Sentry 또는 파일 로그)
        print(f"Twilio error: {str(e)}")
        raise HTTPException(status_code=500, detail="인증번호 전송에 실패했습니다. 잠시 후 다시 시도해주세요.")

async def verify_code(phone: str, code: str, redis_client: Redis = Depends(get_redis)):
    """
    인증번호 검증 및 Redis에 인증 상태 저장
    """
    try:
        e164_phone = to_e164(phone)  # E.164 형식 변환
        verification_check = client.verify.services(TWILIO_VERIFY_SID).verification_checks.create(
            to=e164_phone,
            code=code
        )
        if verification_check.status == "approved":
            # Redis에 인증 상태 저장 (24시간 유효)
            await redis_client.setex(f"verified:{phone}", 86400, "true")
            return {"message": "전화번호 인증이 성공적으로 완료되었습니다."}
        raise HTTPException(status_code=400, detail="유효한 인증번호가 아닙니다.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



def to_e164(phone: str) -> str:
    """
    010-XXXX-XXXX 형식을 E.164 형식으로 변환
    """
    if phone.startswith("010") and '-' in phone:
        return "+82" + phone.replace("-", "")[1:]
    raise ValueError("Invalid phone number format")

def from_e164(e164_phone: str) -> str:
    """
    E.164 형식을 010-XXXX-XXXX 형식으로 변환
    """
    if e164_phone.startswith("+82") and len(e164_phone) >= 11:
        return "010-" + e164_phone[3:7] + "-" + e164_phone[7:]
    raise ValueError("Invalid E.164 format")

# ====================================================== 이메일일 인증 로직 ==========================================================


def generate_verification_code():
    """6자리 랜덤 인증번호 생성"""
    return "".join(random.choices(string.digits, k=6))

async def save_verification_code(email: str, code: str, name: str, redis_client: Redis, expiration: int = 600):
    """Redis에 인증번호 저장 (10분 유효)"""
    await redis_client.setex(f"email_verification:{email}", expiration, code)
    await redis_client.setex(f"email_verification_name:{email}", expiration, name)


# ======= 쿠키 저장 로직 ====

IS_DEVELOPMENT = os.getenv("ENVIRONMENT", "development") == "development"

def set_auth_cookies(
    response: Response,
    access_token: str,
    refresh_token: str,
    access_token_expires_delta: timedelta,
    refresh_token_expires_delta: timedelta,
    is_development: bool = IS_DEVELOPMENT
):
    """
    인증 관련 쿠키(access token, refresh token)를 설정하는 함수
    
    Args:
        response (Response): FastAPI response 객체
        access_token (str): JWT access token
        refresh_token (str): JWT refresh token
        access_token_expires_delta (timedelta): Access token 만료 시간
        refresh_token_expires_delta (timedelta): Refresh token 만료 시간
        is_development (bool): 개발 환경 여부 (기본값: True)
    """
    domain = "localhost" if is_development else "momoso106.duckdns.org"
    
    # Access Token 쿠키 설정
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=not is_development,  # 개발환경에서는 False, 운영환경에서는 True
        samesite="lax",
        max_age=int(access_token_expires_delta.total_seconds()),
        domain=domain,
        path="/"
    )
    
    # Refresh Token 쿠키 설정
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=not is_development,  # 개발환경에서는 False, 운영환경에서는 True
        samesite="lax",
        max_age=int(refresh_token_expires_delta.total_seconds()),
        domain=domain,
        path="/"
    )

def delete_auth_cookies(response: Response, is_development: bool = True):
    """
    인증 관련 쿠키들을 삭제하는 함수
    
    Args:
        response (Response): FastAPI response 객체
        is_development (bool): 개발 환경 여부 (기본값: True)
    """
    domain = "localhost" if is_development else None
    
    response.delete_cookie(
        key="access_token",
        httponly=True,
        secure=not is_development,  # 배포 환경에서는 True
        domain=domain,
        path="/",
        samesite="lax"
    )
    response.delete_cookie(
        key="refresh_token",
        httponly=True,
        secure=not is_development,  # 배포 환경에서는 True
        domain=domain,
        path="/",
        samesite="lax"
    )

# ================================== 로그인 여부 확인 ===============================================

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """
    Access Token 생성 함수
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})  # 만료 시간 추가
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None):
    """
    Refresh Token 생성 함수
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})  # 만료 시간 추가
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt



async def get_refresh_token(request: Request) -> str:
    """요청 헤더에서 refresh_token을 추출 (Swagger에서 감춤)"""
    return request.headers.get("refresh_token")  # 없으면 None 반환



async def validate_token_and_get_user(
    access_token: Optional[str],
    refresh_token: Optional[str],
    response: Optional[Response],
    db: Session,
    redis_client: Redis,
    allow_unauthorized: bool = False
) -> Optional[User]:
    """
    토큰을 검증하고 사용자 정보를 반환하는 중앙화된 함수
    access token이 없고 refresh token만 있는 경우 자동으로 access token을 재발급
    
    Args:
        access_token (Optional[str]): Access token (없을 수 있음)
        refresh_token (Optional[str]): Refresh token
        response (Optional[Response]): FastAPI response object for setting cookies
        db (Session): Database session
        redis_client (Redis): Redis client
        allow_unauthorized (bool): 비로그인 사용자 허용 여부

    Returns:
        Optional[User]: 검증된 사용자 객체 또는 None (allow_unauthorized=True인 경우)
    """
    # access token이 없고 refresh token이 있는 경우
    if not access_token and refresh_token:
        try:
            # Refresh Token 검증
            payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
            email = payload.get("sub")

            if email is None:
                if allow_unauthorized:
                    return None
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid refresh token"
                )

            # Redis에 저장된 refresh token과 비교
            stored_token = await redis_client.get(f"refresh_token:{email}")
            if isinstance(stored_token, bytes):
                stored_token = stored_token.decode('utf-8')

            if stored_token != refresh_token:
                if allow_unauthorized:
                    return None
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired refresh token"
                )

            # 새로운 Access Token 발급
            access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            access_token = create_access_token(
                data={"sub": email},
                expires_delta=access_token_expires
            )

            # 새 Access Token을 쿠키에 저장
            if response:
                set_auth_cookies(
                    response=response,
                    access_token=access_token,
                    refresh_token=refresh_token,
                    access_token_expires_delta=access_token_expires,
                    refresh_token_expires_delta=timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
                )
        except JWTError:
            if allow_unauthorized:
                return None
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )

    # access token이 없고 refresh token도 없는 경우
    if not access_token:
        if allow_unauthorized:
            return None
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access token is missing"
        )

    try:
        # Access Token 검증
        payload = jwt.decode(access_token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")

        if email is None:
            if allow_unauthorized:
                return None
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload"
            )

        # DB에서 사용자 정보 가져오기
        user = user_crud.get_user_by_email(db, email)
        if not user:
            if allow_unauthorized:
                return None
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        return user

    except ExpiredSignatureError:
        # Access Token 만료 시 Refresh Token으로 재발급 시도
        if not refresh_token:
            if allow_unauthorized:
                return None
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Access token expired. Please login again."
            )

        try:
            # Refresh Token 검증
            payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
            email = payload.get("sub")

            if email is None:
                if allow_unauthorized:
                    return None
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid refresh token"
                )

            stored_token = await redis_client.get(f"refresh_token:{email}")
            if isinstance(stored_token, bytes):
                stored_token = stored_token.decode('utf-8')

            if stored_token != refresh_token:
                if allow_unauthorized:
                    return None
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired refresh token"
                )

            # 새로운 Access Token 발급
            access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            new_access_token = create_access_token(
                data={"sub": email},
                expires_delta=access_token_expires
            )

            # 새 Access Token을 쿠키에 저장
            if response:
                set_auth_cookies(
                    response=response,
                    access_token=new_access_token,
                    refresh_token=refresh_token,
                    access_token_expires_delta=access_token_expires,
                    refresh_token_expires_delta=timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
                )

            user = user_crud.get_user_by_email(db, email)
            if not user and not allow_unauthorized:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            return user

        except JWTError:
            if allow_unauthorized:
                return None
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token"
            )

    except JWTError:
        if allow_unauthorized:
            return None
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token"
        )

async def get_current_user(
    request: Request,
    response: Response = None,
    db: Session = Depends(get_db),
    refresh_token: str = Depends(get_refresh_token),
    redis_client: Redis = Depends(get_redis)
) -> User:
    """
    현재 로그인된 사용자 검증 (unauthorized 불가)
    """
    access_token = request.cookies.get("access_token")
    user = await validate_token_and_get_user(
        access_token=access_token,
        refresh_token=refresh_token,
        response=response,
        db=db,
        redis_client=redis_client,
        allow_unauthorized=False
    )
    return user



async def get_optional_user(
    request: Request,
    response: Response = None,
    db: Session = Depends(get_db),
    redis_client: Redis = Depends(get_redis)
) -> Optional[User]:
    """
    현재 로그인된 사용자 검증 (unauthorized 허용)
    """
    access_token = request.cookies.get("access_token")
    refresh_token = request.cookies.get("refresh_token")
    user = await validate_token_and_get_user(
        access_token=access_token,
        refresh_token=refresh_token,
        response=response,
        db=db,
        redis_client=redis_client,
        allow_unauthorized=True
    )
    return user