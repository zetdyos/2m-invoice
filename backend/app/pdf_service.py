import io
from pathlib import Path
from datetime import date as date_cls
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

LOGO_PATH = Path(__file__).resolve().parent / "assets" / "logo.jpeg"
RED = colors.HexColor("#E11418")
INK = colors.HexColor("#14181c")
MUTED = colors.HexColor("#6b7682")
LINE = colors.HexColor("#e7eaee")
SOFT = colors.HexColor("#f6f7f9")


def _money(v: float) -> str:
    return "${:,.2f}".format(v or 0.0)


def build_confirmation_pdf(*, company: dict, vendor: dict, confirmation: dict) -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    w, h = letter
    left = 0.9 * inch
    right = w - 0.9 * inch
    top = h - 0.9 * inch

    # ---- Logo + company block ----
    logo_bottom = top
    try:
        img = ImageReader(str(LOGO_PATH))
        lw = 1.5 * inch
        lh = lw * 246.0 / 486.0
        c.drawImage(img, left, top - lh, width=lw, height=lh, mask="auto")
        logo_bottom = top - lh
    except Exception:
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 22)
        c.drawString(left, top - 16, "2M")

    # Company name / address (right side of header)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 12)
    c.drawRightString(right, top - 4, company.get("company_name", ""))
    c.setFont("Helvetica", 9)
    c.setFillColor(MUTED)
    ry = top - 18
    for txt in [company.get("company_dba", ""), company.get("company_address", ""),
                company.get("company_city", ""), "Ph: " + company.get("company_phone", "")]:
        if txt and txt.strip() and txt.strip() != "Ph:":
            c.drawRightString(right, ry, txt)
            ry -= 12

    # ---- Title bar ----
    y = min(logo_bottom, ry) - 22
    c.setStrokeColor(RED)
    c.setLineWidth(3)
    c.line(left, y, right, y)
    y -= 26
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 20)
    c.drawString(left, y, "ACH CONFIRMATION")
    c.setFillColor(RED)
    c.setFont("Helvetica-Bold", 11)
    c.drawRightString(right, y + 3, "PAYMENT CONFIRMED")

    # ---- Meta grid ----
    y -= 30
    col2 = left + 3.0 * inch
    d = confirmation.get("date")
    d_str = d.strftime("%m/%d/%Y") if isinstance(d, date_cls) else str(d or "")

    def meta(x, yy, label, value):
        c.setFont("Helvetica-Bold", 8.5)
        c.setFillColor(MUTED)
        c.drawString(x, yy, label)
        c.setFont("Helvetica-Bold", 12)
        c.setFillColor(INK)
        c.drawString(x, yy - 15, str(value or "—"))

    meta(left, y, "DATE", d_str)
    meta(col2, y, "ACCOUNT #", vendor.get("account", ""))
    y -= 40
    meta(left, y, "CONFIRMATION #", confirmation.get("confirmation_number", ""))
    meta(col2, y, "VENDOR", vendor.get("name", ""))

    # ---- Invoices table ----
    y -= 44
    c.setFillColor(INK)
    c.rect(left, y - 4, right - left, 22, stroke=0, fill=1)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 9.5)
    c.drawString(left + 10, y + 3, "INVOICES PAID")
    y -= 22

    invoices = [ln.strip() for ln in str(confirmation.get("invoices", "")).splitlines() if ln.strip()]
    if not invoices:
        invoices = ["—"]
    c.setFont("Helvetica", 10.5)
    stripe = False
    for inv in invoices:
        if stripe:
            c.setFillColor(SOFT)
            c.rect(left, y - 5, right - left, 18, stroke=0, fill=1)
        c.setFillColor(INK)
        c.drawString(left + 10, y, inv)
        c.setStrokeColor(LINE)
        c.setLineWidth(0.5)
        c.line(left, y - 6, right, y - 6)
        y -= 18
        stripe = not stripe
        if y < 1.5 * inch:
            c.showPage()
            y = top

    # ---- Total ----
    y -= 16
    bw = 2.8 * inch
    c.setFillColor(INK)
    c.rect(right - bw, y - 8, bw, 30, stroke=0, fill=1)
    c.setFillColor(colors.HexColor("#aeb8c2"))
    c.setFont("Helvetica-Bold", 10)
    c.drawString(right - bw + 12, y + 3, "TOTAL AMOUNT")
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 15)
    c.drawRightString(right - 12, y + 1, _money(confirmation.get("amount", 0.0)))

    # ---- Footer ----
    c.setFillColor(MUTED)
    c.setFont("Helvetica-Oblique", 8)
    c.drawCentredString(w / 2, 0.75 * inch,
                        "This is an automated ACH payment confirmation issued by "
                        + company.get("company_name", ""))
    c.setStrokeColor(LINE)
    c.setLineWidth(0.5)
    c.line(left, 0.92 * inch, right, 0.92 * inch)

    c.showPage()
    c.save()
    return buf.getvalue()
