import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'sajiv2580@gmail.com', // Assuming this is the sender account as well
        pass: process.env.EMAIL_PASS || 'hqjmrekwvtowgfxu',
      },
    });
  }

  async sendBiMonthlyReport(zipFilePath: string, zipFileName: string) {
    try {
      const mailOptions = {
        from: 'sajiv2580@gmail.com',
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
}
