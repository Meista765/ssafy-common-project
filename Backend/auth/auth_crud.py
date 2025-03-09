from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from models import User
from .auth_schema import NewUserForm
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__default_rounds=12)

def hash_password(password: str):
    """
    비밀번호 해싱 함수
    """
    return pwd_context.hash(password)

# 회원가입
def create_user(new_user: NewUserForm, db: Session):
    """
    회원가입 - 비밀번호 해싱 후 저장
    """
    user = User(
        email = new_user.email,
        name = new_user.name,
        nickname = new_user.nickname,
        phone = new_user.phone,
        password = hash_password(new_user.password),
        user_img = new_user.user_img)
    db.add(user)
    db.commit()
    return user

def verify_password(plain_password, hashed_password):
    """
    로그인 시, 비밀번호 검증
    """
    return pwd_context.verify(plain_password, hashed_password)


def update_user_password(db: Session, email: str, hashed_password: str):
    """
    사용자 비밀번호 업데이트 (OAuth2 사용자는 불가)
    """
    user = db.query(User).filter(User.email == email).first()
    if user:
        # OAuth2 사용자는 비밀번호 설정 불가
        if user.is_oauth_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="이 계정은 Google OAuth2 로그인 전용입니다. 비밀번호를 설정할 수 없습니다."
            )

        user.password = hashed_password
        db.commit()