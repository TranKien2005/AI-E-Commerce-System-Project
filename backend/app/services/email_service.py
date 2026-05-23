"""Email service — sends via SMTP (MailHog) or Resend API."""
import logging
import smtplib
import requests
import pybreaker
from email.mime.text import MIMEText

from app.core.circuit_breaker import email_circuit_breaker
from app.core.config import settings

logger = logging.getLogger(__name__)


def send_email_smtp(to: str, subject: str, body: str) -> bool:
    """Send an email via standard SMTP (MailHog)."""
    try:
        msg = MIMEText(body, "html", "utf-8")
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_FROM
        msg["To"] = to

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            if settings.SMTP_USER:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM, [to], msg.as_string())

        logger.info(f"SMTP Email sent to {to}: {subject}")
        return True
    except Exception as e:
        logger.warning(f"Failed to send SMTP email to {to}: {e}")
        return False


def send_email_resend(to: str, subject: str, body: str) -> bool:
    """Send an email via Resend API."""
    if not settings.RESEND_API_KEY:
        logger.error("RESEND_API_KEY is not configured")
        return False

    try:
        response = email_circuit_breaker.call(
            requests.post,
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "from": settings.RESEND_FROM,
                "to": to,
                "subject": subject,
                "html": body,
            },
            timeout=10,
        )
        
        if response.status_code in [200, 201]:
            logger.info(f"Resend API Email sent to {to}: {subject}")
            return True
        else:
            logger.warning(f"Resend API Error: {response.status_code} - {response.text}")
            return False
            
    except pybreaker.CircuitBreakerError as e:
        logger.warning(f"Resend API circuit breaker is open for {to}: {e}")
        return False
    except Exception as e:
        logger.warning(f"Failed to send Resend API email to {to}: {e}")
        return False


def send_email(to: str, subject: str, body: str) -> bool:
    """Dispatches email based on settings.EMAIL_BACKEND."""
    if settings.EMAIL_BACKEND == "resend":
        return send_email_resend(to, subject, body)
    else:
        return send_email_smtp(to, subject, body)


def send_otp_email(to: str, otp: str) -> bool:
    """Send OTP verification email."""
    subject = "Mã xác thực OTP - AI E-Commerce"
    body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 12px;">
        <h2 style="color: #333; text-align: center;">Xác thực tài khoản</h2>
        <p>Chào bạn, mã OTP để kích hoạt tài khoản của bạn là:</p>
        <div style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 8px; padding: 16px; background: #f0f4ff; border-radius: 8px; text-align: center; margin: 20px 0;">
            {otp}
        </div>
        <p style="color: #666; font-size: 14px; text-align: center;">Mã có hiệu lực trong 5 phút. Vui lòng không chia sẻ mã này với bất kỳ ai.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #999; text-align: center;">Đây là email tự động từ hệ thống AI E-Commerce. Vui lòng không trả lời email này.</p>
    </div>
    """
    return send_email(to, subject, body)


def send_order_notification(to: str, order_id: int, status: str) -> bool:
    """Send order status change notification."""
    subject = f"Đơn hàng #{order_id} - Cập nhật trạng thái"
    body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 12px;">
        <h2 style="color: #333;">Cập nhật đơn hàng</h2>
        <p>Đơn hàng <strong>#{order_id}</strong> của bạn đã chuyển sang trạng thái mới:</p>
        <div style="padding: 12px; background: #f0fdf4; border-radius: 8px; border-left: 4px solid #22c55e; margin: 16px 0;">
            <strong style="color: #166534;">{status}</strong>
        </div>
        <p style="color: #666; font-size: 14px;">Bạn có thể vào ứng dụng để kiểm tra chi tiết hành trình đơn hàng.</p>
    </div>
    """
    return send_email(to, subject, body)
