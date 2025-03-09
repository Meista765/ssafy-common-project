from pydantic import BaseModel, Field, EmailStr, field_validator, ValidationInfo
from fastapi import HTTPException
from typing import Optional
from datetime import datetime

# 휴대전화 인증
class SmsRequest(BaseModel):
    phone: str

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        v = v.strip()

        # 기본 형식 검증
        if not v.startswith("010") or len(v) != 13 or '-' not in v:
            raise HTTPException(
                status_code=422,
                detail=f"전화번호는 '010-XXXX-XXXX' 형식이어야 합니다. 입력값: {v}"
            )
        return v

# 이메일 인증
class EmailVerificationRequestSchema(BaseModel):
    email: EmailStr = Field(..., description="The email address to send the verification code to")
    name: str = Field(..., description="User's name")

class EmailVerificationSchema(BaseModel):
    email: EmailStr = Field(..., description="The email address to send the verification code to")
    code: str = Field(..., description="The verification code")
    name: str = Field(..., description="User's name")

class ResetPasswordSchema(BaseModel):
    new_password: str = Field(..., min_length=8, max_length=128, description="새로운 비밀번호")
    confirm_password: str = Field(..., min_length=8, max_length=128, description="비밀번호 확인")

    @field_validator("confirm_password")
    def validate_confirm_password(cls, confirm_password: str, info: ValidationInfo):
        new_password = info.data.get("new_password")
        if new_password and confirm_password != new_password:
            raise ValueError("비밀번호 확인이 일치하지 않습니다.")
        return confirm_password

# id 찾기 검증
class FindIdRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=50, description="사용자 이름")
    phone: str

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        v = v.strip()

        # 기본 형식 검증
        if not v.startswith("010") or len(v) != 13 or '-' not in v:
            raise HTTPException(
                status_code=422,
                detail=f"전화번호는 '010-XXXX-XXXX' 형식이어야 합니다. 입력값: {v}"
            )
        return v

class Token(BaseModel):
    acess_token : str
    token_type : str


# 1. 사용자 가입 폼(일반 회원가입)
class NewUserForm(BaseModel):
    email: EmailStr = Field(..., description="이메일은 필수 항목입니다.")
    name: str = Field(..., min_length=1, max_length=50, description="이름을 입력해주세요.")
    nickname: str = Field(..., min_length=1, max_length=50, description="닉네임을 입력해주세요.")
    phone: str
    password: str
    confirm_password: str
    user_img: str = "static_url"  # 기본값 설정
    is_oauth_user: bool = False

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v):
        """이메일을 소문자로 변환"""
        return v.lower()

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8 or not any(char.isdigit() for char in v) or not any(char.isalpha() for char in v) or not any(char in "!@#$%^&*()-_=+[]{}|;:',.<>?/~`" for char in v):
            raise ValueError("비밀번호는 8자리 이상, 영문, 숫자, 특수문자를 포함해야 합니다.")
        return v

    @field_validator("confirm_password", mode="after")
    @classmethod
    def validate_confirm_password(cls, v, info: ValidationInfo):
        """
        비밀번호 검증 (password와 confirm_password 일치 여부 확인)
        """
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("입력한 비밀번호가 일치하지 않습니다.")
        return v


# 2. 사용자 가입 폼 (OAuth2 회원가입)
class OAuthUserForm(BaseModel):
    email: EmailStr = Field(..., description="이메일은 필수 항목입니다.")
    name: str = Field(..., min_length=1, max_length=50, description="이름을 입력해주세요.")
    nickname: str = Field(..., min_length=1, max_length=50, description="닉네임을 입력해주세요.")
    user_img: Optional[str] = "static_url"

    class Config:
        from_attributes = True


class PasswordVerifyForm(BaseModel):
    password: str