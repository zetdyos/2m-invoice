from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from ..database import get_session
from ..models import Setting, User
from ..schemas import SettingsOut, SettingsIn, TestEmailIn, SendResult
from ..deps import get_current_user
from ..email_service import send_test_email

router = APIRouter(prefix="/api/settings", tags=["settings"])


def _to_out(s: Setting) -> SettingsOut:
    out = SettingsOut.model_validate(s)
    out.smtp_password_set = bool(s.smtp_password)
    return out


@router.get("", response_model=SettingsOut)
def get_settings(session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    s = session.get(Setting, 1)
    return _to_out(s)


@router.put("", response_model=SettingsOut)
def update_settings(data: SettingsIn, session: Session = Depends(get_session),
                    user: User = Depends(get_current_user)):
    s = session.get(Setting, 1)
    payload = data.model_dump()
    new_pwd = payload.pop("smtp_password", None)
    for k, v in payload.items():
        setattr(s, k, v)
    if new_pwd:  # only overwrite when a non-empty password is provided
        s.smtp_password = new_pwd
    session.add(s)
    session.commit()
    session.refresh(s)
    return _to_out(s)


@router.post("/test-email", response_model=SendResult)
def test_email(data: TestEmailIn, session: Session = Depends(get_session),
               user: User = Depends(get_current_user)):
    s = session.get(Setting, 1)
    if not s.smtp_host:
        raise HTTPException(status_code=400, detail="SMTP host is not set")
    try:
        send_test_email(s=s, to=str(data.to))
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Email failed: {e}")
    return SendResult(ok=True, detail=f"Test email sent to {data.to}")
