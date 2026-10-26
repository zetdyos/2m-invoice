from datetime import datetime, date
from pydantic import BaseModel, EmailStr, ConfigDict, field_validator


# ---- Auth ----
class LoginIn(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    full_name: str
    is_active: bool


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str


# ---- Vendor ----
class VendorIn(BaseModel):
    name: str
    email: str = ""
    account: str = ""
    active: bool = True


class VendorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: str
    account: str
    active: bool


# ---- Confirmation ----
class ConfirmationIn(BaseModel):
    vendor_id: int
    confirmation_number: str = ""
    invoices: str = ""
    date: date
    amount: float = 0.0

    @field_validator("amount")
    @classmethod
    def non_negative(cls, v):
        if v < 0:
            raise ValueError("amount must be >= 0")
        return v


class ConfirmationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    vendor_id: int
    confirmation_number: str
    invoices: str
    date: date
    amount: float
    status: str
    sent_at: datetime | None
    created_by: str
    created_at: datetime
    # enriched
    vendor_name: str | None = None
    vendor_email: str | None = None
    vendor_account: str | None = None


# ---- Settings ----
class SettingsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    smtp_host: str
    smtp_port: int
    smtp_user: str
    smtp_from: str
    smtp_from_name: str
    smtp_security: str
    company_name: str
    company_dba: str
    company_address: str
    company_city: str
    company_phone: str
    company_email: str
    email_subject: str
    email_intro: str
    smtp_password_set: bool = False


class SettingsIn(BaseModel):
    smtp_host: str
    smtp_port: int
    smtp_user: str = ""
    smtp_from: str = ""
    smtp_from_name: str = ""
    smtp_security: str = "starttls"
    company_name: str = ""
    company_dba: str = ""
    company_address: str = ""
    company_city: str = ""
    company_phone: str = ""
    company_email: str = ""
    email_subject: str = ""
    email_intro: str = ""
    # optional: only updates the stored password when provided (non-empty)
    smtp_password: str | None = None


class TestEmailIn(BaseModel):
    to: EmailStr


class SendResult(BaseModel):
    ok: bool
    detail: str = ""


class SendLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    confirmation_id: int
    vendor_id: int
    confirmation_number: str
    to_email: str
    subject: str
    amount: float
    status: str
    error: str
    sent_by: str
    sent_at: datetime
    vendor_name: str | None = None


class Summary(BaseModel):
    count: int = 0
    total: float = 0.0
    sent: int = 0
    draft: int = 0
    sent_total: float = 0.0
