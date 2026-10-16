import os
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from datetime import datetime, timezone, timedelta

logger = logging.getLogger("kaaval_api.email_service")

SMTP_USER = os.environ.get("EMAIL_USER", "kaaval.ai.kanyakumari@gmail.com")
SMTP_PASS = os.environ.get("EMAIL_PASS", "hqjmrekwvtowgfxu")
SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "465"))
TARGET_RECIPIENT = os.environ.get("ALERT_RECIPIENT_EMAIL", "sajiv2580@gmail.com")

def send_known_vehicle_violation_email(
    vehicle_number: str,
    violation_type: str,
    camera_name: str,
    camera_code: str,
    hit_timestamp: datetime,
    reason: str,
    confidence: float,
    image_bytes: bytes,
    recipient: str = TARGET_RECIPIENT
) -> bool:
    """
    Sends an automated email notification with high-res image proof whenever
    a known / exempt vehicle commits a violation detected by KAAVAL AI.
    """
    try:
        ist = timezone(timedelta(hours=5, minutes=30))
        if hit_timestamp.tzinfo is None:
            hit_ist = hit_timestamp.replace(tzinfo=timezone.utc).astimezone(ist)
        else:
            hit_ist = hit_timestamp.astimezone(ist)
        formatted_time = hit_ist.strftime("%d-%m-%Y %I:%M:%S %p IST")

        conf_str = f"{confidence * 100:.1f}%" if confidence is not None and confidence <= 1.0 else (f"{confidence:.1f}%" if confidence is not None else "N/A")

        msg = MIMEMultipart("related")
        msg["Subject"] = f"🚨 KAAVAL AI Alert: Known Vehicle Violation Detected — {vehicle_number}"
        msg["From"] = f"Kaaval AI System <{SMTP_USER}>"
        msg["To"] = recipient

        alt = MIMEMultipart("alternative")
        msg.attach(alt)

        html_content = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }}
  .card {{ max-width: 620px; margin: 0 auto; background: #1e293b; border-radius: 12px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }}
  .header {{ background: linear-gradient(135deg, #1e3a8a, #0f172a); padding: 20px 24px; border-bottom: 2px solid #3b82f6; }}
  .badge {{ display: inline-block; padding: 4px 10px; background: #ef4444; color: #fff; font-size: 11px; font-weight: 700; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }}
  h2 {{ margin: 0; font-size: 20px; color: #ffffff; letter-spacing: -0.5px; }}
  .subtitle {{ color: #94a3b8; font-size: 13px; margin-top: 4px; }}
  .body {{ padding: 24px; }}
  .table {{ width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; }}
  .table td {{ padding: 10px 12px; border-bottom: 1px solid #334155; }}
  .table td.label {{ color: #94a3b8; font-weight: 500; width: 40%; }}
  .table td.value {{ color: #f8fafc; font-weight: 600; }}
  .plate {{ font-family: 'Courier New', Courier, monospace; font-size: 16px; background: #0f172a; padding: 4px 8px; border-radius: 6px; border: 1px solid #475569; color: #38bdf8; }}
  .img-box {{ margin-top: 16px; text-align: center; background: #0f172a; border-radius: 8px; padding: 10px; border: 1px solid #334155; }}
  .img-box img {{ max-width: 100%; height: auto; border-radius: 6px; }}
  .footer {{ background: #0f172a; padding: 14px 24px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #1e293b; }}
</style>
</head>
<body>
<div class="card">
  <div class="header">
    <div class="badge">Suppressed Known Vehicle Alert</div>
    <h2>KAAVAL AI — Known Vehicle Exemption Match</h2>
    <div class="subtitle">A vehicle registered in the Known / Whitelist directory was detected in a traffic violation.</div>
  </div>
  <div class="body">
    <table class="table">
      <tr>
        <td class="label">Vehicle Registration</td>
        <td class="value"><span class="plate">{vehicle_number}</span></td>
      </tr>
      <tr>
        <td class="label">Registered Reason / Owner</td>
        <td class="value">{reason or 'Exempt Vehicle'}</td>
      </tr>
      <tr>
        <td class="label">Suppressed Violation</td>
        <td class="value" style="color: #f87171;">{violation_type}</td>
      </tr>
      <tr>
        <td class="label">Camera</td>
        <td class="value">{camera_name} ({camera_code})</td>
      </tr>
      <tr>
        <td class="label">Date & Time</td>
        <td class="value">{formatted_time}</td>
      </tr>
      <tr>
        <td class="label">AI Model Confidence</td>
        <td class="value">{conf_str}</td>
      </tr>
      <tr>
        <td class="label">Action Taken</td>
        <td class="value" style="color: #34d399;">Automatically Suppressed from Public Challan Queue</td>
      </tr>
    </table>

    <div style="font-size: 13px; font-weight: 600; color: #cbd5e1; margin-bottom: 6px;">Camera Evidence Proof:</div>
    <div class="img-box">
      <img src="cid:violation_image" alt="Violation Evidence" />
    </div>
  </div>
  <div class="footer">
    KAAVAL AI Automated Notification System • Kanyakumari District Police
  </div>
</div>
</body>
</html>"""

        alt.attach(MIMEText(html_content, "html"))

        if image_bytes:
            img_part = MIMEImage(image_bytes, "jpeg")
            img_part.add_header("Content-ID", "<violation_image>")
            img_part.add_header("Content-Disposition", "inline", filename=f"{vehicle_number}_violation.jpg")
            msg.attach(img_part)

            attach_part = MIMEImage(image_bytes, "jpeg")
            attach_part.add_header("Content-Disposition", "attachment", filename=f"{vehicle_number}_{hit_ist.strftime('%Y%m%d_%H%M%S')}.jpg")
            msg.attach(attach_part)

        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=15) as server:
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, [recipient], msg.as_string())

        logger.info(f"Successfully sent known vehicle violation email alert for {vehicle_number} to {recipient}")
        return True

    except Exception as e:
        logger.error(f"Failed to send known vehicle violation email alert: {e}", exc_info=True)
        return False
