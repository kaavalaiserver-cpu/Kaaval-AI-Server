import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface InactivityAlertDetails {
  cameraCode: string;
  cameraName: string;
  subdivisionName?: string;
  junctionName?: string;
  minutesInactive: number;
  lastViolationTimestamp: Date | null;
}

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'kaaval.ai.kanyakumari@gmail.com',
        pass: process.env.EMAIL_PASS || 'hqjmrekwvtowgfxu',
      },
    });
  }

  async sendBiMonthlyReport(zipFilePath: string, zipFileName: string) {
    try {
      const sender = process.env.EMAIL_USER || 'kaaval.ai.kanyakumari@gmail.com';
      const mailOptions = {
        from: `"KAAVAL AI Reports" <${sender}>`,
        to: 'sajiv2580@gmail.com',
        subject: `Bi-Monthly Kaaval AI Export: ${zipFileName}`,
        text: `Attached is the bi-monthly zipped Excel reports for all Kaaval AI kits.`,
        attachments: [
          {
            filename: zipFileName,
            path: zipFilePath,
          },
        ],
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent successfully: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send email: ${error}`);
    }
  }

  async sendCameraInactivityAlert(details: InactivityAlertDetails) {
    const adminRecipients = [
      'sajiv2580@gmail.com',
      'binu.ji@gmail.com',
      'harish250510@gmail.com',
    ];

    const sender = process.env.EMAIL_USER || 'kaaval.ai.kanyakumari@gmail.com';

    let lastSeenText = 'No violations recorded yet';
    if (details.lastViolationTimestamp) {
      const istTime = new Date(details.lastViolationTimestamp).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'medium',
        hour12: true,
      });
      lastSeenText = `${istTime} IST`;
    }

    const currentIst = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'medium',
      hour12: true,
    });

    const subject = `🚨 HIGH ALERT: KAAVAL AI Feed Inactive (>20 Mins) — ${details.cameraCode} (${details.cameraName})`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f3f4f6; margin: 0; padding: 24px; }
        .container { max-width: 620px; margin: 0 auto; background: #131b2e; border-radius: 12px; border: 2px solid #ef4444; overflow: hidden; box-shadow: 0 12px 30px rgba(239, 68, 68, 0.25); }
        .header { background: linear-gradient(135deg, #7f1d1d 0%, #1e1b4b 100%); padding: 24px; border-bottom: 2px solid #ef4444; }
        .pulse-badge { display: inline-block; padding: 6px 14px; background: #dc2626; color: #ffffff; font-size: 12px; font-weight: 800; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; box-shadow: 0 0 12px rgba(239, 68, 68, 0.6); }
        h1 { margin: 0 0 6px 0; font-size: 22px; color: #ffffff; letter-spacing: -0.5px; }
        .subtitle { color: #fca5a5; font-size: 14px; line-height: 1.4; }
        .content { padding: 24px; }
        .alert-box { background: rgba(239, 68, 68, 0.12); border-left: 4px solid #ef4444; padding: 14px 16px; border-radius: 6px; margin-bottom: 20px; color: #fee2e2; font-size: 14px; line-height: 1.5; }
        .info-table { width: 100%; border-collapse: collapse; margin-bottom: 22px; }
        .info-table td { padding: 10px 12px; border-bottom: 1px solid #1f293d; font-size: 14px; }
        .info-table td.label { color: #94a3b8; font-weight: 500; width: 40%; }
        .info-table td.val { color: #f8fafc; font-weight: 600; }
        .code-tag { font-family: monospace; background: #0f172a; padding: 3px 8px; border-radius: 4px; border: 1px solid #334155; color: #38bdf8; font-weight: bold; }
        .action-box { background: #0b1120; border-radius: 8px; padding: 16px; border: 1px solid #1e293b; margin-top: 10px; }
        .action-box h4 { margin: 0 0 10px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #38bdf8; }
        .action-box ol { margin: 0; padding-left: 20px; color: #cbd5e1; font-size: 13px; line-height: 1.6; }
        .footer { background: #0b0f19; padding: 16px 24px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #1e293b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="pulse-badge">🚨 CRITICAL HIGH ALERT</div>
          <h1>KAAVAL AI — Camera Feed Inactive</h1>
          <div class="subtitle">No violation detections or telemetry received for more than 20 minutes from this monitored kit.</div>
        </div>
        <div class="content">
          <div class="alert-box">
            <strong>ATTENTION REQUIRED:</strong> This camera is designated by Super Admin for 20-minute heartbeat/inactivity monitoring. The camera has been silent for <strong>${details.minutesInactive} minutes</strong>, exceeding the critical threshold.
          </div>
          <table class="info-table">
            <tr>
              <td class="label">Camera Unit</td>
              <td class="val"><span class="code-tag">${details.cameraCode}</span> &nbsp;${details.cameraName}</td>
            </tr>
            <tr>
              <td class="label">Subdivision</td>
              <td class="val">${details.subdivisionName || 'Kanyakumari District'}</td>
            </tr>
            <tr>
              <td class="label">Location / Junction</td>
              <td class="val">${details.junctionName || 'N/A'}</td>
            </tr>
            <tr>
              <td class="label">Duration Silent</td>
              <td class="val" style="color: #ef4444; font-size: 16px; font-weight: 800;">${details.minutesInactive} Minutes</td>
            </tr>
            <tr>
              <td class="label">Last Violation Transmitted</td>
              <td class="val">${lastSeenText}</td>
            </tr>
            <tr>
              <td class="label">Alert Dispatch Time</td>
              <td class="val">${currentIst} IST</td>
            </tr>
            <tr>
              <td class="label">Alert Recipient Group</td>
              <td class="val" style="font-size: 12px; color: #94a3b8;">Sajiv, Binu, Harish (High Alert Distribution)</td>
            </tr>
          </table>

          <div class="action-box">
            <h4>Immediate Troubleshooting Steps:</h4>
            <ol>
              <li>Check physical power and UPS supply at <strong>${details.junctionName || details.cameraName}</strong> junction enclosure.</li>
              <li>Verify that the optical camera RTSP stream is accessible over the local network / VPN.</li>
              <li>Inspect the edge processing kit (RDK) process status and ensure <code>pipeline.py</code> or AI pipeline is streaming violation events.</li>
            </ol>
          </div>
        </div>
        <div class="footer">
          KAAVAL AI Automated System Sentinel • High Alert Notification System • Kanyakumari District Police
        </div>
      </div>
    </body>
    </html>
    `;

    try {
      const info = await this.transporter.sendMail({
        from: `"KAAVAL AI High Alert" <${sender}>`,
        to: adminRecipients.join(', '),
        subject,
        html,
        priority: 'high',
        headers: {
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'Importance': 'high',
        },
      });

      this.logger.log(`High-alert camera inactivity email dispatched to ${adminRecipients.join(', ')} for camera ${details.cameraCode}. MessageId: ${info.messageId}`);
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to dispatch high-alert camera inactivity email for ${details.cameraCode}: ${err.message || err}`, err.stack);
      return false;
    }
  }
}
