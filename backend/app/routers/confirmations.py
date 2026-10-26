from datetime import datetime, timezone, date as date_cls
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlmodel import Session, select
from ..database import get_session
from ..models import Confirmation, Vendor, Setting, User, SendLog
from ..schemas import ConfirmationIn, ConfirmationOut, SendResult, Summary
from ..deps import get_current_user
from ..pdf_service import build_confirmation_pdf
from ..email_service import send_confirmation_email

router = APIRouter(prefix="/api/confirmations", tags=["confirmations"])


def _enrich(c: Confirmation, vendor: Vendor | None) -> ConfirmationOut:
    out = ConfirmationOut.model_validate(c)
    if vendor:
        out.vendor_name = vendor.name
        out.vendor_email = vendor.email
        out.vendor_account = vendor.account
    return out


def _vendor_dict(v: Vendor) -> dict:
    return {"name": v.name, "email": v.email, "account": v.account}


def _conf_dict(c: Confirmation) -> dict:
    return {"confirmation_number": c.confirmation_number, "invoices": c.invoices,
            "date": c.date, "amount": c.amount}


def _apply_filters(stmt, vendor_id, status, date_from, date_to):
    if vendor_id:
        stmt = stmt.where(Confirmation.vendor_id == vendor_id)
    if status:
        stmt = stmt.where(Confirmation.status == status)
    if date_from:
        stmt = stmt.where(Confirmation.date >= date_from)
    if date_to:
        stmt = stmt.where(Confirmation.date <= date_to)
    return stmt


@router.get("", response_model=list[ConfirmationOut])
def list_confirmations(
    q: str | None = None,
    vendor_id: int | None = None,
    status: str | None = None,
    date_from: date_cls | None = Query(None),
    date_to: date_cls | None = Query(None),
    limit: int = Query(500, le=5000),
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    stmt = _apply_filters(select(Confirmation), vendor_id, status, date_from, date_to)
    confs = session.exec(stmt.order_by(Confirmation.date.desc(), Confirmation.id.desc()).limit(limit)).all()
    vendors = {v.id: v for v in session.exec(select(Vendor)).all()}
    result = [_enrich(c, vendors.get(c.vendor_id)) for c in confs]
    if q:
        ql = q.lower()
        result = [r for r in result if ql in (r.confirmation_number or "").lower()
                  or ql in (r.vendor_name or "").lower() or ql in (r.invoices or "").lower()]
    return result


@router.get("/summary", response_model=Summary)
def summary(
    vendor_id: int | None = None,
    date_from: date_cls | None = Query(None),
    date_to: date_cls | None = Query(None),
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    stmt = _apply_filters(select(Confirmation), vendor_id, None, date_from, date_to)
    confs = session.exec(stmt).all()
    s = Summary(count=len(confs), total=sum(c.amount for c in confs))
    s.sent = sum(1 for c in confs if c.status == "sent")
    s.draft = sum(1 for c in confs if c.status == "draft")
    s.sent_total = sum(c.amount for c in confs if c.status == "sent")
    return s


@router.get("/{conf_id}", response_model=ConfirmationOut)
def get_confirmation(conf_id: int, session: Session = Depends(get_session),
                     user: User = Depends(get_current_user)):
    c = session.get(Confirmation, conf_id)
    if not c:
        raise HTTPException(status_code=404, detail="Confirmation not found")
    return _enrich(c, session.get(Vendor, c.vendor_id))


@router.post("", response_model=ConfirmationOut, status_code=201)
def create_confirmation(data: ConfirmationIn, session: Session = Depends(get_session),
                        user: User = Depends(get_current_user)):
    if not session.get(Vendor, data.vendor_id):
        raise HTTPException(status_code=400, detail="Vendor not found")
    c = Confirmation(**data.model_dump(), created_by=user.username)
    session.add(c)
    session.commit()
    session.refresh(c)
    return _enrich(c, session.get(Vendor, c.vendor_id))


@router.put("/{conf_id}", response_model=ConfirmationOut)
def update_confirmation(conf_id: int, data: ConfirmationIn, session: Session = Depends(get_session),
                        user: User = Depends(get_current_user)):
    c = session.get(Confirmation, conf_id)
    if not c:
        raise HTTPException(status_code=404, detail="Confirmation not found")
    for k, v in data.model_dump().items():
        setattr(c, k, v)
    session.add(c)
    session.commit()
    session.refresh(c)
    return _enrich(c, session.get(Vendor, c.vendor_id))


@router.delete("/{conf_id}", status_code=204)
def delete_confirmation(conf_id: int, session: Session = Depends(get_session),
                        user: User = Depends(get_current_user)):
    c = session.get(Confirmation, conf_id)
    if not c:
        raise HTTPException(status_code=404, detail="Confirmation not found")
    session.delete(c)
    session.commit()
    return None


@router.get("/{conf_id}/pdf")
def confirmation_pdf(conf_id: int, session: Session = Depends(get_session),
                     user: User = Depends(get_current_user)):
    c = session.get(Confirmation, conf_id)
    if not c:
        raise HTTPException(status_code=404, detail="Confirmation not found")
    vendor = session.get(Vendor, c.vendor_id)
    s = session.get(Setting, 1)
    company = {k: getattr(s, k) for k in ("company_name", "company_dba", "company_address",
                                          "company_city", "company_phone", "company_email")}
    pdf = build_confirmation_pdf(company=company, vendor=_vendor_dict(vendor), confirmation=_conf_dict(c))
    return Response(content=pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f'inline; filename="ACH-{c.confirmation_number}.pdf"'})


@router.post("/{conf_id}/send", response_model=SendResult)
def send_confirmation(conf_id: int, session: Session = Depends(get_session),
                      user: User = Depends(get_current_user)):
    c = session.get(Confirmation, conf_id)
    if not c:
        raise HTTPException(status_code=404, detail="Confirmation not found")
    vendor = session.get(Vendor, c.vendor_id)
    if not vendor:
        raise HTTPException(status_code=400, detail="Vendor not found")
    s = session.get(Setting, 1)
    if not s.smtp_host or not (s.smtp_from or s.smtp_user):
        raise HTTPException(status_code=400, detail="SMTP is not configured. Go to Settings first.")

    log = SendLog(confirmation_id=c.id, vendor_id=vendor.id,
                  confirmation_number=c.confirmation_number, to_email=vendor.email,
                  subject=s.email_subject, amount=c.amount, sent_by=user.username)
    try:
        send_confirmation_email(s=s, vendor=_vendor_dict(vendor), confirmation=_conf_dict(c))
    except Exception as e:  # noqa: BLE001
        log.status = "failed"
        log.error = str(e)[:500]
        session.add(log)
        session.commit()
        raise HTTPException(status_code=502, detail=f"Email failed: {e}")

    log.status = "sent"
    c.status = "sent"
    c.sent_at = datetime.now(timezone.utc)
    session.add(log)
    session.add(c)
    session.commit()
    return SendResult(ok=True, detail=f"Sent to {vendor.email}")
