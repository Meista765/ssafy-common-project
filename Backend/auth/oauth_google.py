from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from database import get_db
from models import User, OAuthAccount
from jose import jwt
from datetime import datetime, timedelta, timezone
from user import user_crud
import uuid
import os
import requests
from utils.auth_utils import set_auth_cookies
from utils.redis_utils import get_redis
from redis import Redis

# JWT 설정
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = float(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))
REFRESH_TOKEN_EXPIRE_DAYS = float(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS"))

# Google OAuth2 설정
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_TOKEN_URL = os.getenv("GOOGLE_TOKEN_URL")
GOOGLE_USERINFO_URL = os.getenv("GOOGLE_USERINFO_URL")
REDIRECT_URI = os.getenv("REDIRECT_URI")
FRONTEND_REDIRECT_URI = os.getenv("FRONTEND_REDIRECT_URI")


router = APIRouter(
    prefix="/oauth",
)


def create_access_token(data: dict, expires_delta: timedelta = None):
    """JWT Access Token 생성"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=30))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict, expires_delta: timedelta = None):
    """JWT Refresh Token 생성"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(days=7))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


import logging

# 로그 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@router.get("/google/login")
def google_login():
    """
    ✅ Google OAuth 로그인 URL 생성 및 리다이렉션
    """
    google_auth_url = (
        "https://accounts.google.com/o/oauth2/auth"
        f"?client_id={GOOGLE_CLIENT_ID}"
        f"&redirect_uri={REDIRECT_URI}"
        f"&response_type=code"
        f"&scope=email%20profile"
    )
    return RedirectResponse(url=google_auth_url)  # RedirectResponse 대신 URL을 반환


# 로그 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@router.get("/google/callback")
async def google_callback(
    request: Request, 
    response: Response, 
    db: Session = Depends(get_db), 
    redis_client: Redis = Depends(get_redis)
):
    logger.info("========= Google Callback Started =========")
    logger.info(f"Request URL: {request.url}")
    
    try:
        code = request.query_params.get("code")
        logger.info(f"Received auth code: {code[:10]}...")
        
        if not code:
            logger.error("Authorization code missing")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Authorization code is missing."
            )

        # 1. Google OAuth2 Access Token 요청
        token_data = {
            "code": code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": REDIRECT_URI,
            "grant_type": "authorization_code",
        }
        
        token_response = requests.post(GOOGLE_TOKEN_URL, data=token_data)
        
        if not token_response.ok:
            logger.error(f"Token request failed: {token_response.text}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to obtain access token from Google"
            )
            
        token_json = token_response.json()
        google_access_token = token_json.get("access_token")
        
        # 2. Google 사용자 정보 조회
        user_info_response = requests.get(
            GOOGLE_USERINFO_URL, 
            headers={"Authorization": f"Bearer {google_access_token}"}
        )
        
        if not user_info_response.ok:
            logger.error(f"User info request failed: {user_info_response.text}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to obtain user info from Google"
            )
        
        user_info = user_info_response.json()
        email = user_info.get("email").lower()  # 이메일 소문자로 정규화
        name = user_info.get("name", "Google User")
        picture = user_info.get("picture", "default.png")

        # 3. 사용자 확인 및 처리
        existing_user = user_crud.get_user_by_email(db, email)
        
        if not existing_user:
            # 신규 사용자 자동 회원가입
            nickname = f"user_{uuid.uuid4().hex[:8]}"  # 임시 닉네임 생성
            while user_crud.get_user_by_nickname(db, nickname):  # 닉네임 중복 체크
                nickname = f"user_{uuid.uuid4().hex[:8]}"
                
            new_user = User(
                email=email,
                name=name,
                nickname=nickname,
                user_img=picture,
                is_oauth_user=True
            )
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            
            # OAuth 계정 정보 저장
            oauth_account = OAuthAccount(
                user_id=new_user.user_pk,
                oauth_name="google",
                account_id=email,
                account_email=email
            )
            db.add(oauth_account)
            db.commit()
            
            user = new_user
            logger.info(f"Created new user with email: {email}")
        else:
            # 기존 사용자 처리
            if not existing_user.is_oauth_user:
                logger.error(f"User {email} exists but is not an OAuth user")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This email is already registered with a regular account. Please use the standard login."
                )
            user = existing_user
            logger.info(f"Existing user logged in: {email}")

        # 4. JWT 토큰 생성
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        jwt_access_token = create_access_token(
            data={"sub": email}, 
            expires_delta=access_token_expires
        )

        refresh_token_expires = timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        jwt_refresh_token = create_refresh_token(
            data={"sub": email}, 
            expires_delta=refresh_token_expires
        )

        # 5. Redis에 Refresh Token 저장
        redis_client.setex(
            f"refresh_token:{email}", 
            int(refresh_token_expires.total_seconds()), 
            jwt_refresh_token
        )
        
        # 6. Response 생성 및 쿠키 설정
        response = Response(status_code=302)
        
        set_auth_cookies(
            response=response,
            access_token=jwt_access_token,
            refresh_token=jwt_refresh_token,
            access_token_expires_delta=access_token_expires,
            refresh_token_expires_delta=refresh_token_expires
        )
        
        # 7. 리다이렉트 설정 (홈으로 바로 리다이렉트)
        redirect_path = "/"
        if not existing_user:  # 신규 사용자인 경우 프로필 설정 페이지로 리다이렉트
            redirect_path = "/auth/profile-setup"
        response.headers["Location"] = f"{FRONTEND_REDIRECT_URI}{redirect_path}"
        
        logger.info("Authentication successful, redirecting user")
        return response

    except HTTPException as he:
        logger.error(f"HTTP Exception in Google callback: {str(he)}")
        raise he
    except Exception as e:
        logger.exception("Unexpected error in Google callback:")
        raise HTTPException(status_code=500, detail=str(e))