import smtplib
from pathlib import Path
from email.message import EmailMessage
from email.utils import formataddr, make_msgid
from datetime import date as date_cls

from .models import Setting
from .pdf_service import build_confirmation_pdf

LOGO_PATH = Path(__file__).resolve().parent / "assets" / "logo.jpeg"

# Brand palette (from the 2M logo)
RED = "#E11418"
INK = "#14181c"
MUTED = "#6b7682"
LINE = "#e7eaee"
SOFT = "#f6f7f9"


def _money(v: float) -> str:
    return "${:,.2f}".format(v or 0.0)


def _company_dict(s: Setting) -> dict:
    return {
        "company_name": s.company_name, "company_dba": s.company_dba,
        "company_address": s.company_address, "company_city": s.company_city,
        "company_phone": s.company_phone, "company_email": s.company_email,
    }


def render_email_html(*, s: Setting, vendor: dict, confirmation: dict, logo_cid: str | None) -> str:
    d = confirmation.get("date")
    d_str = d.strftime("%B %d, %Y") if isinstance(d, date_cls) else str(d or "")
    invoices = [ln.strip() for ln in str(confirmation.get("invoices", "")).splitlines() if ln.strip()]
    inv_rows = "".join(
        f'<tr><td style="padding:10px 16px;border-bottom:1px solid {LINE};'
        f'font:14px/1.45 Arial,Helvetica,sans-serif;color:{INK};">{inv}</td>'
        f'<td style="padding:10px 16px;border-bottom:1px solid {LINE};'
        f'font:12px Arial,Helvetica,sans-serif;color:{MUTED};text-align:right;">Invoice</td></tr>'
        for inv in (invoices or ["—"])
    )
    logo_html = (
        f'<img src="cid:{logo_cid}" width="132" alt="{s.company_name}" '
        f'style="display:block;border:0;outline:none;height:auto;">'
        if logo_cid else
        f'<div style="font:800 26px Arial,Helvetica,sans-serif;color:{INK};">'
        f'<span style="color:{RED};">2M</span></div>'
    )
    phone = f'Ph: {s.company_phone}' if s.company_phone else ''
    reply_to = s.company_email or s.smtp_from or s.smtp_user

    return f"""\
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>ACH Payment Confirmation</title>
</head>
<body style="margin:0;padding:0;background:{SOFT};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:{SOFT};">
  ACH payment confirmation {confirmation.get('confirmation_number','')} &mdash; {_money(confirmation.get('amount',0.0))}. A PDF copy is attached.
</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{SOFT};padding:28px 12px;">
<tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border:1px solid {LINE};border-radius:14px;overflow:hidden;">

    <!-- Header -->
    <tr><td style="padding:26px 32px 20px;border-bottom:3px solid {RED};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td align="left" style="vertical-align:middle;">{logo_html}</td>
        <td align="right" style="vertical-align:middle;font:700 12px Arial,Helvetica,sans-serif;letter-spacing:1.5px;color:{MUTED};">
          ACH PAYMENT<br>CONFIRMATION
        </td>
      </tr></table>
    </td></tr>

    <!-- Intro -->
    <tr><td style="padding:30px 32px 6px;">
      <h1 style="margin:0 0 6px;font:700 22px Arial,Helvetica,sans-serif;color:{INK};letter-spacing:-.2px;">Payment confirmed</h1>
      <p style="margin:0 0 16px;font:14px/1.6 Arial,Helvetica,sans-serif;color:{MUTED};">
        Confirmation <strong style="color:{INK};">#{confirmation.get('confirmation_number','')}</strong> &nbsp;&middot;&nbsp; {d_str}
      </p>
      <p style="margin:0 0 6px;font:14px/1.65 Arial,Helvetica,sans-serif;color:{INK};">Dear {vendor.get('name','')},</p>
      <p style="margin:0 0 22px;font:14px/1.65 Arial,Helvetica,sans-serif;color:{INK};">{s.email_intro}</p>
    </td></tr>

    <!-- Details -->
    <tr><td style="padding:0 32px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid {LINE};border-radius:12px;">
        <tr>
          <td style="padding:14px 18px;border-bottom:1px solid {LINE};font:12px Arial,Helvetica,sans-serif;color:{MUTED};letter-spacing:.3px;">CONFIRMATION #</td>
          <td style="padding:14px 18px;border-bottom:1px solid {LINE};font:700 14px Arial,Helvetica,sans-serif;color:{INK};text-align:right;">{confirmation.get('confirmation_number','')}</td>
        </tr>
        <tr>
          <td style="padding:14px 18px;border-bottom:1px solid {LINE};font:12px Arial,Helvetica,sans-serif;color:{MUTED};letter-spacing:.3px;">PAYMENT DATE</td>
          <td style="padding:14px 18px;border-bottom:1px solid {LINE};font:700 14px Arial,Helvetica,sans-serif;color:{INK};text-align:right;">{d_str}</td>
        </tr>
        <tr>
          <td style="padding:14px 18px;font:12px Arial,Helvetica,sans-serif;color:{MUTED};letter-spacing:.3px;">ACCOUNT #</td>
          <td style="padding:14px 18px;font:700 14px Arial,Helvetica,sans-serif;color:{INK};text-align:right;">{vendor.get('account','') or '—'}</td>
        </tr>
      </table>
    </td></tr>

    <!-- Invoices -->
    <tr><td style="padding:24px 32px 6px;font:700 12px Arial,Helvetica,sans-serif;color:{MUTED};letter-spacing:1px;">INVOICES PAID</td></tr>
    <tr><td style="padding:0 32px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid {LINE};border-radius:12px;overflow:hidden;">{inv_rows}</table>
    </td></tr>

    <!-- Total -->
    <tr><td style="padding:22px 32px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{INK};border-radius:12px;">
        <tr>
          <td style="padding:18px 20px;font:700 12px Arial,Helvetica,sans-serif;color:#aeb8c2;letter-spacing:1px;vertical-align:middle;">TOTAL AMOUNT</td>
          <td style="padding:18px 20px;font:800 22px Arial,Helvetica,sans-serif;color:#ffffff;text-align:right;">{_money(confirmation.get('amount',0.0))}</td>
        </tr>
      </table>
    </td></tr>

    <!-- Attachment note -->
    <tr><td style="padding:0 32px 8px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{SOFT};border-radius:10px;">
        <tr><td style="padding:12px 16px;font:13px/1.5 Arial,Helvetica,sans-serif;color:{MUTED};">
          &#128206; A signed PDF copy of this confirmation is attached for your records.
        </td></tr>
      </table>
    </td></tr>

    <!-- Footer -->
    <tr><td style="padding:22px 32px 30px;border-top:1px solid {LINE};">
      <p style="margin:14px 0 0;font:700 13px Arial,Helvetica,sans-serif;color:{INK};">{s.company_name}</p>
      <p style="margin:3px 0 0;font:12px/1.6 Arial,Helvetica,sans-serif;color:{MUTED};">
        {s.company_dba}<br>{s.company_address} {s.company_city}<br>{phone}{(' &middot; ' + reply_to) if reply_to else ''}
      </p>
      <p style="margin:14px 0 0;font:11px/1.55 Arial,Helvetica,sans-serif;color:#9aa4ae;">
        This email and the attached document are confidential and intended solely for {vendor.get('name','the recipient')}.
        If you received this message in error, please notify us and delete it. This is an automated payment confirmation; you may reply with any questions.
      </p>
    </td></tr>

  </table>
  <p style="font:11px Arial,Helvetica,sans-serif;color:#a7b0ba;margin:16px 0 0;">&copy; {s.company_name}</p>
</td></tr>
</table>
</body>
</html>"""


def render_email_text(*, s: Setting, vendor: dict, confirmation: dict) -> str:
    invoices = [ln.strip() for ln in str(confirmation.get("invoices", "")).splitlines() if ln.strip()]
    d = confirmation.get("date")
    d_str = d.strftime("%B %d, %Y") if isinstance(d, date_cls) else str(d or "")
    return (
        f"{s.company_name} - ACH PAYMENT CONFIRMATION\n"
        f"{'=' * 44}\n\n"
        f"Dear {vendor.get('name','')},\n\n{s.email_intro}\n\n"
        f"Confirmation #: {confirmation.get('confirmation_number','')}\n"
        f"Payment date:  {d_str}\n"
        f"Account #:     {vendor.get('account','')}\n\n"
        f"Invoices paid:\n" + "\n".join(f"  - {i}" for i in (invoices or ['-'])) + "\n\n"
        f"TOTAL AMOUNT:  {_money(confirmation.get('amount',0.0))}\n\n"
        f"A PDF copy of this confirmation is attached for your records.\n\n"
        f"{'-' * 44}\n"
        f"{s.company_name}\n{s.company_dba}\n{s.company_address} {s.company_city}\n"
        f"Ph: {s.company_phone}\n"
    )


def _open_smtp(s: Setting):
    if s.smtp_security == "ssl":
        server = smtplib.SMTP_SSL(s.smtp_host, s.smtp_port, timeout=30)
    else:
        server = smtplib.SMTP(s.smtp_host, s.smtp_port, timeout=30)
        if s.smtp_security == "starttls":
            server.starttls()
    if s.smtp_user and s.smtp_password:
        server.login(s.smtp_user, s.smtp_password)
    return server


def _from_header(s: Setting) -> str:
    addr = s.smtp_from or s.smtp_user
    return formataddr((s.smtp_from_name or s.company_name, addr)) if addr else ""


def _load_logo() -> bytes | None:
    try:
        return LOGO_PATH.read_bytes()
    except OSError:
        return None


def send_confirmation_email(*, s: Setting, vendor: dict, confirmation: dict) -> None:
    if not vendor.get("email"):
        raise ValueError("Vendor has no email address")

    msg = EmailMessage()
    msg["Subject"] = s.email_subject or "ACH Payment Confirmation"
    msg["From"] = _from_header(s)
    msg["To"] = vendor["email"]
    reply_to = s.company_email or s.smtp_from or s.smtp_user
    if reply_to:
        msg["Reply-To"] = reply_to

    logo = _load_logo()
    logo_cid = make_msgid(domain="2mequipment")[1:-1] if logo else None  # strip <>

    msg.set_content(render_email_text(s=s, vendor=vendor, confirmation=confirmation))
    msg.add_alternative(
        render_email_html(s=s, vendor=vendor, confirmation=confirmation, logo_cid=logo_cid),
        subtype="html",
    )

    if logo:
        html_part = msg.get_payload()[1]  # the text/html alternative
        html_part.add_related(logo, maintype="image", subtype="jpeg", cid=f"<{logo_cid}>")

    pdf = build_confirmation_pdf(company=_company_dict(s), vendor=vendor, confirmation=confirmation)
    fname = f"ACH-{confirmation.get('confirmation_number','confirmation')}.pdf"
    msg.add_attachment(pdf, maintype="application", subtype="pdf", filename=fname)

    with _open_smtp(s) as server:
        server.send_message(msg)


def send_test_email(*, s: Setting, to: str) -> None:
    msg = EmailMessage()
    msg["Subject"] = "Invoicer SMTP test"
    msg["From"] = _from_header(s)
    msg["To"] = to
    msg.set_content("This is a test email from Invoicer. Your SMTP settings are working correctly.")
    with _open_smtp(s) as server:
        server.send_message(msg)
