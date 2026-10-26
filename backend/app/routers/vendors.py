from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from ..database import get_session
from ..models import Vendor, Confirmation, User
from ..schemas import VendorIn, VendorOut
from ..deps import get_current_user

router = APIRouter(prefix="/api/vendors", tags=["vendors"])


@router.get("", response_model=list[VendorOut])
def list_vendors(q: str | None = None, active: bool | None = None,
                 session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    stmt = select(Vendor)
    if active is not None:
        stmt = stmt.where(Vendor.active == active)
    vendors = session.exec(stmt.order_by(Vendor.name)).all()
    if q:
        ql = q.lower()
        vendors = [v for v in vendors if ql in v.name.lower() or ql in (v.email or "").lower()
                   or ql in (v.account or "").lower()]
    return vendors


@router.post("", response_model=VendorOut, status_code=201)
def create_vendor(data: VendorIn, session: Session = Depends(get_session),
                  user: User = Depends(get_current_user)):
    vendor = Vendor(**data.model_dump())
    session.add(vendor)
    session.commit()
    session.refresh(vendor)
    return vendor


@router.put("/{vendor_id}", response_model=VendorOut)
def update_vendor(vendor_id: int, data: VendorIn, session: Session = Depends(get_session),
                  user: User = Depends(get_current_user)):
    vendor = session.get(Vendor, vendor_id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    for k, v in data.model_dump().items():
        setattr(vendor, k, v)
    session.add(vendor)
    session.commit()
    session.refresh(vendor)
    return vendor


@router.delete("/{vendor_id}", status_code=204)
def delete_vendor(vendor_id: int, session: Session = Depends(get_session),
                  user: User = Depends(get_current_user)):
    vendor = session.get(Vendor, vendor_id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    in_use = session.exec(select(Confirmation).where(Confirmation.vendor_id == vendor_id)).first()
    if in_use:
        # keep history intact: deactivate instead of hard delete
        vendor.active = False
        session.add(vendor)
        session.commit()
        raise HTTPException(status_code=409,
                            detail="Vendor has confirmations; it was deactivated instead of deleted.")
    session.delete(vendor)
    session.commit()
    return None
