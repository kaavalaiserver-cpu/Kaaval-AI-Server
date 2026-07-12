// src/challan/challan.service.ts
import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import axios from 'axios';
import { ViolationsService } from '../violations/violations.service.js';

@Injectable()
export class ChallanService {
  private readonly logger = new Logger(ChallanService.name);

  constructor(private readonly violationsService: ViolationsService) {}

  async generateChallan(violationId: string): Promise<Buffer> {
    const violation = await this.violationsService.findOne(violationId).catch(() => null);
    if (!violation) {
      throw new Error('Violation not found');
    }

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      this.buildPdfContent(doc, violation).catch((err) => {
        this.logger.error(`Error building PDF: ${err.message}`);
        doc.end(); // Ensure stream ends even on error
      });
    });
  }

  private async buildPdfContent(doc: PDFKit.PDFDocument, violation: any) {
    // 1. Header
    doc.font('Helvetica-Bold').fontSize(24).text('E-Challan', { align: 'center' });
    doc.fontSize(12).text('Traffic Police Department - Kaaval AI', { align: 'center' });
    doc.moveDown();
    doc.lineWidth(2).moveTo(50, 100).lineTo(550, 100).stroke();
    doc.moveDown();

    // 2. Violation Details
    doc.fontSize(14).text(`Challan ID: ${violation.id}`);
    doc.moveDown(0.5);
    doc.text(`Date & Time: ${new Date(violation.violationTimestamp || violation.createdAt).toLocaleString()}`);
    doc.moveDown(0.5);
    doc.text(`Vehicle Number: ${violation.vehicle?.registrationNumber ?? 'UNREAD'}`, { underline: true });
    doc.moveDown(0.5);
    doc.text(`Location: ${violation.camera?.junction?.junctionName || violation.camera?.cameraName || 'Unknown Location'}`);
    doc.moveDown(0.5);
    doc.fillColor('red').text(`Violation Type: ${violation.violationType?.typeCode || 'Unknown'}`);
    doc.fillColor('black');
    doc.moveDown(0.5);
    doc.text(`Fine Amount: ₹${violation.violationType?.defaultFineAmount || 1000}`);
    doc.moveDown();

    // 3. Evidence Image
    const evidenceImage = violation.evidence?.find((e: any) => e.evidenceType === 'RAW_IMAGE')?.filePath;
    if (evidenceImage) {
      try {
        let imageUrl = evidenceImage;
        if (imageUrl.startsWith('/')) {
            const aiBackendUrl = process.env.AI_BACKEND_URL || 'http://localhost:8000';
            imageUrl = `${aiBackendUrl}${imageUrl}`;
        }
        
        this.logger.warn(`Fetching image for PDF: ${imageUrl}`);
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 5000 });
        const imageBuffer = Buffer.from(response.data);
  
        doc.image(imageBuffer, {
          fit: [500, 300],
          align: 'center',
          valign: 'center',
        });
        doc.moveDown();
        doc.fontSize(10).text('Evidence Image', { align: 'center' });
      } catch (error) {
        this.logger.error(`Failed to fetch image: ${error instanceof Error ? error.message : 'Unknown error'}`);
        doc.text('[Image Evidence Not Available]');
      }
    } else {
      doc.text('[No Image Evidence]');
    }

    // 4. Footer
    doc.moveDown(2);
    const pageHeight = doc.page.height;
    doc.fontSize(10).fillColor('grey');
    doc.text(
      'This consists of a computer-generated challan and does not require a signature.',
      50,
      doc.y,
      { align: 'center' }
    );
    doc.fillColor('blue');
    doc.text(
      'Pay online at: https://kaaval-traffic.gov.in/pay',
      { align: 'center', link: 'https://kaaval-traffic.gov.in/pay' }
    );
    
    doc.end();
  }

  // Helper embedded in buildPdfContent for simplicity
}
