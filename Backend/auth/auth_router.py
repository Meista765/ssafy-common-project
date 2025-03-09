import os
from datetime import timedelta
from typing import Optional

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status, BackgroundTasks
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm, HTTPBearer
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from jose import JWTError, jwt
from redis import Redis
from sqlalchemy.orm import Session

from database import get_db
from models import User
from . import auth_crud, auth_schema
from user import user_crud
from utils.auth_utils import (
    create_access_token,
    create_refresh_token,
    delete_auth_cookies,
    generate_verification_code,
    get_current_user,
    get_optional_user,
    save_verification_code,
    send_sms,
    set_auth_cookies,
    verify_code,
)
from utils.redis_utils import get_redis

load_dotenv()

# JWT 발급 설정
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = float(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = float(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


# 이메일 서버 설정
conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"),
    MAIL_FROM=os.getenv("MAIL_FROM"),
    MAIL_PORT=int(os.getenv("MAIL_PORT")),
    MAIL_SERVER=os.getenv("MAIL_SERVER"),
    MAIL_STARTTLS=True,  # TLS 사용(포트 587)
    MAIL_SSL_TLS=False,  # SSL 비활성화(포트 465)
    USE_CREDENTIALS=True
)

router = APIRouter(
    prefix='/api/v1/auth',
)


@router.get("/me", description="현재 로그인 한 사용자 조회")
async def get_user_info(current_user: User = Depends(get_current_user)):
    return {"user_pk": current_user.user_pk, "email": current_user.email, "nickname":current_user.nickname, "is_oauth_user": current_user.is_oauth_user}


async def check_verified(phone: str, redis_client: Redis):
    try:
        verified = await redis_client.get(f"verified:{phone}")
        
        if not verified:
            raise HTTPException(status_code=400, detail="Phone number not verified")
            
        # 안전하게 타입 체크 후 처리
        if isinstance(verified, bytes):
            verified_str = verified.decode('utf-8').lower()
        else:
            verified_str = str(verified).lower()
            
        if verified_str != "true":
            raise HTTPException(status_code=400, detail="Invalid verification status")
            
        return True
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error checking verification status")

@router.post("/signup")
async def signup(new_user: auth_schema.NewUserForm, db: Session = Depends(get_db), redis_client: Redis = Depends(get_redis)):
    """
    회원가입 API (비밀번호 일치 검증 추가)
    """
    try:
        # 이메일 소문자로 변환
        normalized_email = new_user.email.lower()

        existing_user = user_crud.get_user_by_email(db, normalized_email)

        if existing_user:
            if existing_user.is_oauth_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="이 계정은 Google OAuth2 계정입니다. 일반 회원가입을 시도하지 말고, 소셜 로그인을 이용하세요."
                )
            raise HTTPException(status_code=409, detail="이미 사용 중인 이메일입니다.")

        # 닉네임 중복 체크
        if user_crud.get_user_by_nickname(db, new_user.nickname):
            raise HTTPException(status_code=409, detail="이미 사용 중인 닉네임입니다.")

        # 전화번호 인증 여부 확인
        await check_verified(new_user.phone, redis_client)

        # 비밀번호 일치 여부 검증
        if new_user.password != new_user.confirm_password:
            raise HTTPException(status_code=422, detail="입력한 비밀번호가 일치하지 않습니다.")

        # 사용자 생성
        user_data = new_user.dict()
        user_data["email"] = normalized_email  # 이메일을 소문자로 덮어쓰기
        auth_crud.create_user(auth_schema.NewUserForm(**user_data), db)

        return {"message": "회원가입이 완료되었습니다."}
        
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/login")
async def login(response: Response, login_form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db), redis_client: Redis = Depends(get_redis)):
    """
    일반 로그인 처리 (OAuth2 연결된 사용자는 비밀번호 로그인도 가능)
    """
    # 이메일로 사용자 조회
    user = user_crud.get_user_by_email(db, login_form.username)
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="아이디를 다시 확인해주세요.")

    # OAuth2 연결이 되어 있어도 비밀번호 로그인 가능 (소셜 로그인 병행 가능)
    if user.is_oauth_user and user.password is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이 계정은 Google OAuth2 계정입니다. 일반 로그인이 불가능합니다. Google 로그인을 이용하세요."
        )

    # 비밀번호 검증
    if not auth_crud.verify_password(login_form.password, user.password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="비밀번호를 다시 확인해주세요.")

    # Access Token 생성
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": user.email}, expires_delta=access_token_expires)

    # Refresh Token 생성
    refresh_token_expires = timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    refresh_token = create_refresh_token(data={"sub": user.email}, expires_delta=refresh_token_expires)

    # Redis에 Refresh Token 저장 (만료 시간 설정)
    await redis_client.setex(f"refresh_token:{user.email}", int(refresh_token_expires.total_seconds()), refresh_token)

    # 쿠키 설정을 위한 함수 호출
    set_auth_cookies(
        response=response,
        access_token=access_token,
        refresh_token=refresh_token,
        access_token_expires_delta=access_token_expires,
        refresh_token_expires_delta=refresh_token_expires
    )

    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

security = HTTPBearer()

@router.post("/logout")
async def logout(request: Request, response: Response, db: Session = Depends(get_db), redis_client: Redis = Depends(get_redis)):
    refresh_token = request.cookies.get("refresh_token")
        
    if refresh_token:
        try:
            payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
            email = payload.get("sub")
            if email:
                stored_token = await redis_client.get(f"refresh_token:{email}")
                
                # Redis에서 가져온 토큰이 bytes인 경우 디코딩
                if isinstance(stored_token, bytes):
                    stored_token = stored_token.decode('utf-8')
                
                if stored_token == refresh_token:
                    # 토큰이 일치하면 삭제
                    await redis_client.delete(f"refresh_token:{email}")
                # 토큰이 일치하지 않아도 계속 진행
        except JWTError:
            # JWT 디코딩 실패해도 계속 진행
            pass

    delete_auth_cookies(response)

    return {"message": "성공적으로 로그아웃 되었습니다."}

@router.post("/find-id")
async def find_id(request: auth_schema.FindIdRequest, db: Session = Depends(get_db), redis_client: Redis = Depends(get_redis)):
    try:
        # Redis 값 로깅
        verified_value = await redis_client.get(f"verified:{request.phone}")

        await check_verified(request.phone, redis_client)

        # 사용자 조회
        user = user_crud.get_user_by_name_and_phone(db, request.name, request.phone)
        if not user:
            raise HTTPException(status_code=404, detail="User not Found")

        return {"email": user.email}
        
    except HTTPException as e:
        # HTTP 예외는 그대로 전달
        raise e
    except Exception as e:
        # 기타 예외는 로깅하고 500 에러 반환
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/send-sms")
def send_sms_endpoint(phone: str):
    return send_sms(phone)

@router.post("/verify-sms-code")
async def verify_code_endpoint(phone: str, code: str, redis_client: Redis = Depends(get_redis)):
    return await verify_code(phone, code, redis_client)

@router.get("/check-sms-verified")
async def check_verified_endpoint(phone: str, redis_client: Redis = Depends(get_redis)):
    return {"verified": check_verified(phone, redis_client)}

@router.post("/send-verification-email")
async def send_verification_email_endpoint(background_tasks: BackgroundTasks, email_info: auth_schema.EmailVerificationRequestSchema, redis_client: Redis = Depends(get_redis)):
    """
    사용자의 이메일로 인증번호 전송
    """
    verification_code = generate_verification_code()  # 랜덤 인증번호 생성
    await save_verification_code(email_info.email, verification_code, email_info.name, redis_client)  # Redis에 저장 (이메일+이름)

    subject = "[모모소]비밀번호 변경을 위한 인증번호"
    message = MessageSchema(
        subject=subject,
        recipients=[email_info.email],
        body=f"안녕하세요, 모모소입니다.\n\n비밀번호 변경을 위한 인증번호를 전송드리니, 인증 후 10분 이내에 비밀번호를 변경해주세요.\n\n 인증번호: {verification_code}",
        subtype="plain"
    )

    fm = FastMail(conf)
    background_tasks.add_task(fm.send_message, message)

    return {"message": "인증 이메일이 전송되었습니다."}


@router.post("/verify-email-code")
async def verify_email_code(email_verification: auth_schema.EmailVerificationSchema, db: Session = Depends(get_db), redis_client: Redis = Depends(get_redis)):
    """
    이메일 인증 코드 및 이름 검증
    """
    stored_code = await redis_client.get(f"email_verification:{email_verification.email}")
    
    if not stored_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="인증번호가 만료되었거나 존재하지 않습니다."
        )

    if isinstance(stored_code, bytes):
        stored_code = stored_code.decode("utf-8")

    if stored_code != email_verification.code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="잘못된 인증번호입니다."
        )

    # 사용자 존재 여부 먼저 확인
    user = user_crud.get_user_by_email(db, email_verification.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="사용자를 찾을 수 없습니다."
        )

    # 이름 일치 여부 확인
    if user.name != email_verification.name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="이름이 일치하지 않습니다."
        )

    # 인증 성공 후 Redis에서 인증번호 삭제
    await redis_client.delete(f"email_verification:{email_verification.email}")
    
    # 사용자별 인증 완료 상태 저장
    await redis_client.setex(
        "verified_email", 
        600, 
        email_verification.email
    )  # 10분 동안 유효

    return {"message": "이메일 인증이 완료되었습니다."}


@router.post("/reset-password")
async def reset_password(
    request: Request,
    response: Response,
    reset_password: auth_schema.ResetPasswordSchema, 
    db: Session = Depends(get_db), 
    redis_client: Redis = Depends(get_redis),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    비밀번호 재설정 - 두 가지 경우 처리
    1. 이메일 인증을 통한 비밀번호 재설정
    2. 로그인된 사용자의 비밀번호 변경
    """
    # 비밀번호 일치 여부 검증
    if reset_password.new_password != reset_password.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="입력한 비밀번호가 일치하지 않습니다."
        )

    # Case 1: 로그인된 사용자
    if current_user:
        print(f"로그인된 사용자({current_user.email})의 비밀번호 변경 시도")
        email = current_user.email
        user = current_user
    
    # Case 2: 이메일 인증을 통한 접근
    else:
        print("이메일 인증을 통한 비밀번호 변경 시도")
        # Redis에서 인증된 이메일 가져오기
        email = await redis_client.get("verified_email")
        if not email:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="이메일 인증이 필요합니다."
            )
        
        # Redis에서 가져온 email이 바이트 타입일 수 있으므로 문자열 변환
        email = email.decode("utf-8") if isinstance(email, bytes) else email
        
        # 사용자 확인
        user = user_crud.get_user_by_email(db, email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="사용자를 찾을 수 없습니다."
            )

    # OAuth2 사용자 비밀번호 변경 불가하도록 차단
    if user.is_oauth_user:
        print(f"OAuth2 사용자({user.email})가 비밀번호 변경 시도 → 차단됨")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이 계정은 Google OAuth2 로그인 전용입니다. 비밀번호 변경이 불가능합니다."
        )

    # 비밀번호 변경
    hashed_password = auth_crud.hash_password(reset_password.new_password)
    auth_crud.update_user_password(db, email, hashed_password)
    print(f"사용자({email})의 비밀번호가 성공적으로 변경됨")

    # 비밀번호 변경 후 처리
    if current_user:  # 로그인된 사용자인 경우
        # Redis에서 refresh token 삭제 및 쿠키 제거
        await redis_client.delete(f"refresh_token:{email}")
        response.delete_cookie("access_token")
        response.delete_cookie("refresh_token")
    else:  # 이메일 인증을 통한 접근인 경우
        # Redis에서 인증 상태 제거
        await redis_client.delete("verified_email")
    
    return {"message": "비밀번호가 성공적으로 변경되었습니다. 다시 로그인해주세요."}


@router.post("/verify-password", description="현재 로그인한 사용자의 비밀번호 확인")
async def verify_user_password(
    password_form: auth_schema.PasswordVerifyForm,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    현재 로그인한 사용자의 비밀번호를 확인.
    회원정보 수정 페이지로 리다이렉트를 위함.
    """
    try:
        # 사용자 조회
        user = user_crud.get_user_by_email(db, current_user.email)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # 비밀번호 확인
        if not auth_crud.verify_password(password_form.password, user.password):
            raise HTTPException(status_code=400, detail="비밀번호를 다시 확인해주세요")

        return {"message": "비밀번호가 확인되었습니다."}

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")