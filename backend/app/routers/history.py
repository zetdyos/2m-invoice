from datetime import datetime, time, date as date_cls
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select
from ..database import get_session
from ..models import SendLog, Vendor, User
from ..schemas import SendLogOut
from ..deps import get_current_user

router = APIRouter(prefix="/api/history", tags=["history"])


@router.get("", response_model=list[SendLogOut])
def list_history(
    q: str | None = None,
    vendor_id: int | None = None,
    status: str | None = None,
    date_from: date_cls | None = Query(None),
    date_to: date_cls | None = Query(None),
    limit: int = Query(1000, le=10000),
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    stmt = select(SendLog)
    if vendor_id:
        stmt = stmt.where(SendLog.vendor_id == vendor_id)
    if status:
        stmt = stmt.where(SendLog.status == status)
    if date_from:
        stmt = stmt.where(SendLog.sent_at >= datetime.combine(date_from, time.min))
    if date_to:
        stmt = stmt.where(SendLog.sent_at <= datetime.combine(date_to, time.max))
    logs = session.exec(stmt.order_by(SendLog.sent_at.desc()).limit(limit)).all()
    vendors = {v.id: v for v in session.exec(select(Vendor)).all()}
    result = []
    for lg in logs:
        out = SendLogOut.model_validate(lg)
        v = vendors.get(lg.vendor_id)
        out.vendor_name = v.name if v else None
        result.append(out)
    if q:
        ql = q.lower()
        result = [r for r in result if ql in (r.confirmation_number or "").lower()
                  or ql in (r.vendor_name or "").lower() or ql in (r.to_email or "").lower()]
    return result
