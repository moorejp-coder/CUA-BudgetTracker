from pydantic import BaseModel, EmailStr, Field, field_validator

from app.core.password_policy import MIN_PASSWORD_LENGTH, is_commonly_breached


def _check_password_allowed(v: str) -> str:
    """Length is enforced separately via Field(min_length=...) — this only rejects
    passwords that show up in common breach/wordlists. No complexity rules (no mandatory
    symbol/uppercase/digit) — see core/password_policy.py for why."""
    if is_commonly_breached(v):
        raise ValueError(
            "This password is too common and appears in breach lists — please choose a different one"
        )
    return v


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=MIN_PASSWORD_LENGTH, max_length=128)
    display_name: str = Field("", max_length=200)

    @field_validator("password")
    @classmethod
    def _password_allowed(cls, v: str) -> str:
        return _check_password_allowed(v)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ValidateResetTokenRequest(BaseModel):
    token: str = Field(min_length=1, max_length=200)


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=1, max_length=200)
    new_password: str = Field(min_length=MIN_PASSWORD_LENGTH, max_length=128)

    @field_validator("new_password")
    @classmethod
    def _password_allowed(cls, v: str) -> str:
        return _check_password_allowed(v)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=MIN_PASSWORD_LENGTH, max_length=128)

    @field_validator("new_password")
    @classmethod
    def _password_allowed(cls, v: str) -> str:
        return _check_password_allowed(v)


class UserOut(BaseModel):
    id: str
    email: str
    display_name: str

    model_config = {"from_attributes": True}
