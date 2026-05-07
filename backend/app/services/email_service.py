"""Email service — sends via SMTP (MailHog in dev, real SMTP in prod)."""
import logging
import smtplib
from email.mime.text import MIMEText

from app.core.config import settings

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, body: str) -> bool:
    """Send an email. Returns True on success, False on failure (non-blocking)."""
    try:
        msg = MIMEText(body, "html", "utf-8")
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_FROM
        msg["To"] = to

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            if settings.SMTP_USER:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM, [to], msg.as_string())

        logger.info(f"Email sent to {to}: {subject}")
        return True
    except Exception as e:
        logger.warning(f"Failed to send email to {to}: {e}")
        return False


def send_otp_email(to: str, otp: str) -> bool:
    """Send OTP verification email."""
    subject = "Mã xác thực OTP - AI E-Commerce"
    body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #333;">Xác thực tài khoản</h2>
        <p>Mã OTP của bạn là:</p>
        <div style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 8px; padding: 16px; background: #f0f4ff; border-radius: 8px; text-align: center;">
            {otp}
        </div>
        <p style="color: #666; font-size: 14px; margin-top: 16px;">Mã có hiệu lực trong 5 phút. Không chia sẻ mã này với bất kỳ ai.</p>
    </div>
    """
    return send_email(to, subject, body)


def send_order_notification(to: str, order_id: int, status: str) -> bool:
    """Send order status change notification."""
    subject = f"Đơn hàng #{order_id} - Cập nhật trạng thái"
    body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <h2>Cập nhật đơn hàng</h2>
        <p>Đơn hàng <strong>#{order_id}</strong> đã chuyển sang trạng thái: <strong>{status}</strong></p>
    </div>
    """
    return send_email(to, subject, body)
