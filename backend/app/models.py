from datetime import datetime, date, timezone
from sqlmodel import SQLModel, Field


def _now() -> datetime:
    return datetime.now(timezone.utc)


class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    full_name: str = ""
    hashed_password: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=_now)


class Vendor(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    email: str = ""
    account: str = ""
    active: bool = True
    created_at: datetime = Field(default_factory=_now)


class Confirmation(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    vendor_id: int = Field(index=True, foreign_key="vendor.id")
    confirmation_number: str = ""
    invoices: str = ""          # one invoice per line
    date: date
    amount: float = 0.0
    status: str = "draft"       # draft | sent
    sent_at: datetime | None = None
    created_by: str = ""
    created_at: datetime = Field(default_factory=_now)


class Setting(SQLModel, table=True):
    id: int | None = Field(default=1, primary_key=True)
    # SMTP
    smtp_host: str = "smtp.office365.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    smtp_from_name: str = ""
    smtp_security: str = "starttls"   # starttls | ssl | none
    # Company (used in the document + email)
    company_name: str = "2M MOWER AND TOOL LLC."
    company_dba: str = "DBA 2M EQUIPMENT"
    company_address: str = "13800 SW 142nd Ave., Unit #1."
    company_city: str = "Miami, FL 33186"
    company_phone: str = "786-249-8665"
    company_email: str = ""
    # Email content
    email_subject: str = "ACH Confirmation from 2M Mower and Tool LLC"
    email_intro: str = (
        "Please find attached the ACH payment confirmation for the invoices "
        "listed below. This message confirms that an ACH transfer has been issued "
        "to your account. If you have any questions, feel free to reply to this email."
    )


class SendLog(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    confirmation_id: int = Field(index=True, foreign_key="confirmation.id")
    vendor_id: int = Field(index=True)
    confirmation_number: str = ""
    to_email: str = ""
    subject: str = ""
    amount: float = 0.0
    status: str = "sent"        # sent | failed
    error: str = ""
    sent_by: str = ""
    sent_at: datetime = Field(default_factory=_now, index=True)
