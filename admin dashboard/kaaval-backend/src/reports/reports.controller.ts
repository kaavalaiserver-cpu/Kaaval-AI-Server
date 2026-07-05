import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from './reports.service.js';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/index.js';

const DAILY_ROLES = ['SUPER_ADMIN', 'DEVELOPER', 'SP', 'DSP', 'INSPECTOR', 'SUB_INSPECTOR', 'OPERATOR'];
const WEEKLY_ROLES = ['SUPER_ADMIN', 'DEVELOPER', 'SP', 'DSP'];

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('daily')
  @Roles(...DAILY_ROLES)
  getDaily(@Query('date') date?: string) {
    return this.reportsService.getDailyReport(date);
  }

  @Get('weekly')
  @Roles(...WEEKLY_ROLES)
  getWeekly(@Query('start') start?: string, @Query('end') end?: string) {
    return this.reportsService.getWeeklyReport(start, end);
  }

  /** Stream Daily PDF report to the client */
  @Get('daily/pdf')
  @Roles(...DAILY_ROLES)
  async getDailyPdf(@Query('date') dateStr: string, @Res() res: Response) {
    const report = await this.reportsService.getDailyReport(dateStr);
    const PDFDocument = (await import('pdfkit')).default;
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="kaaval-daily-report-${report.date}.pdf"`,
    );
    doc.pipe(res);

    const bgFill = () => {
      doc.rect(0, 0, doc.page.width, doc.page.height).fill('#0b1120');
    };
    doc.on('pageAdded', bgFill);
    bgFill();

    // ── Header ─────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 80).fill('#0f172a');
    doc.fillColor('#fff').fontSize(22).font('Helvetica-Bold')
       .text('KAAVAL AI', 50, 24);
    doc.fontSize(10).font('Helvetica').fillColor('#94a3b8')
       .text('Traffic Violation Daily Report', 50, 50);
    doc.fillColor('#60a5fa').fontSize(10)
       .text(`Date: ${report.date}`, 350, 36, { align: 'right', width: 200 });
    doc.fillColor('#fff').fontSize(9)
       .text(`Generated: ${new Date().toLocaleString('en-IN')}`, 350, 52, { align: 'right', width: 200 });

    // ── Summary Cards ───────────────────────────────────────────────────
    doc.moveDown(2.5);
    const cards = [
      { label: 'Total', value: report.total, color: '#3b82f6' },
      { label: 'Approved', value: report.verified, color: '#22c55e' },
      { label: 'Rejected', value: report.rejected, color: '#ef4444' },
      { label: 'Pending', value: report.pending, color: '#f59e0b' },
    ];
    const cardW = 115, cardH = 60, cardGap = 10;
    let cx = 50;
    for (const card of cards) {
      doc.rect(cx, 100, cardW, cardH).fillAndStroke('#1e293b', card.color);
      doc.fillColor(card.color).fontSize(24).font('Helvetica-Bold')
         .text(String(card.value), cx, 110, { width: cardW, align: 'center' });
      doc.fillColor('#94a3b8').fontSize(9).font('Helvetica')
         .text(card.label, cx, 140, { width: cardW, align: 'center' });
      cx += cardW + cardGap;
    }

    doc.moveDown(5);
    const sectionY = 178;

    // ── Approval Rate ───────────────────────────────────────────────────
    doc.fillColor('#e2e8f0').fontSize(11).font('Helvetica-Bold')
       .text(`Approval Rate: ${report.approvalRate}%   |   Avg Confidence: ${(report.avgConfidence * 100).toFixed(1)}%`, 50, sectionY);

    // ── Violation Type Breakdown ────────────────────────────────────────
    doc.moveDown(1.5);
    doc.fillColor('#60a5fa').fontSize(13).font('Helvetica-Bold').text('Violation Types', 50);
    doc.moveDown(0.4);
    for (const [type, count] of Object.entries(report.byType).sort((a, b) => (b[1] as number) - (a[1] as number))) {
      const pct = report.total ? Math.round(((count as number) / report.total) * 100) : 0;
      doc.fillColor('#94a3b8').fontSize(9).font('Helvetica').text(`${type}:`, 55, doc.y, { continued: true });
      doc.fillColor('#e2e8f0').text(` ${count} (${pct}%)`, { indent: 0 });
    }

    // ── Subdivision Breakdown ───────────────────────────────────────────
    if (Object.keys(report.bySubdivision).length) {
      doc.moveDown(0.8);
      doc.fillColor('#60a5fa').fontSize(13).font('Helvetica-Bold').text('Subdivision Breakdown', 50);
      doc.moveDown(0.4);
      for (const [sub, count] of Object.entries(report.bySubdivision).sort((a, b) => (b[1] as number) - (a[1] as number))) {
        doc.fillColor('#94a3b8').fontSize(9).font('Helvetica').text(`${sub}:`, 55, doc.y, { continued: true });
        doc.fillColor('#e2e8f0').text(` ${count}`);
      }
    }

    // ── Footer ──────────────────────────────────────────────────────────
    const footerY = doc.page.height - 40;
    doc.rect(0, footerY - 10, doc.page.width, 50).fill('#0f172a');
    doc.fillColor('#475569').fontSize(8).font('Helvetica')
       .text('KAAVAL AI — Confidential Police Analytical Report. Not for public distribution.', 50, footerY, { align: 'center', width: doc.page.width - 100 });

    doc.end();
  }

  /** Stream PDF report to the client */
  @Get('weekly/pdf')
  @Roles(...WEEKLY_ROLES)
  async getWeeklyPdf(
    @Query('start') start: string,
    @Query('end') end: string,
    @Res() res: Response,
  ) {
    const report = await this.reportsService.getWeeklyReport(start, end);
    const PDFDocument = (await import('pdfkit')).default;
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="kaaval-report-${report.period.start}-to-${report.period.end}.pdf"`,
    );
    doc.pipe(res);

    const bgFill = () => {
      doc.rect(0, 0, doc.page.width, doc.page.height).fill('#0b1120');
    };
    doc.on('pageAdded', bgFill);
    bgFill();

    // ── Header ─────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 80).fill('#0f172a');
    doc.fillColor('#fff').fontSize(22).font('Helvetica-Bold')
       .text('KAAVAL AI', 50, 24);
    doc.fontSize(10).font('Helvetica').fillColor('#94a3b8')
       .text('Traffic Violation Analytics Report', 50, 50);
    doc.fillColor('#60a5fa').fontSize(10)
       .text(`Period: ${report.period.start} to ${report.period.end}`, 350, 36, { align: 'right', width: 200 });
    doc.fillColor('#fff').fontSize(9)
       .text(`Generated: ${new Date().toLocaleString('en-IN')}`, 350, 52, { align: 'right', width: 200 });

    // ── Summary Cards ───────────────────────────────────────────────────
    doc.moveDown(2.5);
    const s = report.summary;
    const cards = [
      { label: 'Total', value: s.total, color: '#3b82f6' },
      { label: 'Approved', value: s.verified, color: '#22c55e' },
      { label: 'Rejected', value: s.rejected, color: '#ef4444' },
      { label: 'Pending', value: s.pending, color: '#f59e0b' },
    ];
    const cardW = 115, cardH = 60, cardGap = 10;
    let cx = 50;
    for (const card of cards) {
      doc.rect(cx, 100, cardW, cardH).fillAndStroke('#1e293b', card.color);
      doc.fillColor(card.color).fontSize(24).font('Helvetica-Bold')
         .text(String(card.value), cx, 110, { width: cardW, align: 'center' });
      doc.fillColor('#94a3b8').fontSize(9).font('Helvetica')
         .text(card.label, cx, 140, { width: cardW, align: 'center' });
      cx += cardW + cardGap;
    }

    doc.moveDown(5);
    const sectionY = 178;

    // ── Approval Rate ───────────────────────────────────────────────────
    doc.fillColor('#e2e8f0').fontSize(11).font('Helvetica-Bold')
       .text(`Approval Rate: ${s.approvalRate}%   |   Avg Confidence: ${(s.avgConfidence * 100).toFixed(1)}%`, 50, sectionY);

    // ── Daily Trend Table ───────────────────────────────────────────────
    doc.moveDown(1.5);
    doc.fillColor('#60a5fa').fontSize(13).font('Helvetica-Bold').text('Daily Trend', 50);
    doc.moveDown(0.4);

    const tableTop = doc.y;
    const cols = [{ w: 120, label: 'Date' }, { w: 80, label: 'Total' }, { w: 80, label: 'Approved' }, { w: 80, label: 'Rejected' }];
    let rx = 50;
    doc.rect(50, tableTop, cols.reduce((a, c) => a + c.w, 0), 22).fill('#1e293b');
    for (const col of cols) {
      doc.fillColor('#94a3b8').fontSize(9).font('Helvetica-Bold')
         .text(col.label, rx + 5, tableTop + 6, { width: col.w - 10 });
      rx += col.w;
    }
    let rowY = tableTop + 22;
    for (const day of report.dailyTrend) {
      const vals = [day.date, day.total, day.verified, day.rejected];
      rx = 50;
      if (rowY > doc.page.height - 80) { doc.addPage(); rowY = 50; }
      doc.rect(50, rowY, cols.reduce((a, c) => a + c.w, 0), 20)
         .fill(rowY % 40 === 0 ? '#0f172a' : '#1a2332').stroke('#334155');
      for (let i = 0; i < cols.length; i++) {
        doc.fillColor('#e2e8f0').fontSize(9).font('Helvetica')
           .text(String(vals[i]), rx + 5, rowY + 5, { width: cols[i].w - 10 });
        rx += cols[i].w;
      }
      rowY += 20;
    }

    // ── Violation Type Breakdown ────────────────────────────────────────
    doc.moveDown(1.5);
    doc.fillColor('#60a5fa').fontSize(13).font('Helvetica-Bold').text('Violation Types', 50);
    doc.moveDown(0.4);
    for (const [type, count] of Object.entries(s.byType).sort((a, b) => (b[1] as number) - (a[1] as number))) {
      const pct = s.total ? Math.round(((count as number) / s.total) * 100) : 0;
      doc.fillColor('#94a3b8').fontSize(9).font('Helvetica').text(`${type}:`, 55, doc.y, { continued: true });
      doc.fillColor('#e2e8f0').text(` ${count} (${pct}%)`, { indent: 0 });
    }

    // ── Subdivision Breakdown ───────────────────────────────────────────
    if (Object.keys(s.bySubdivision).length) {
      doc.moveDown(0.8);
      doc.fillColor('#60a5fa').fontSize(13).font('Helvetica-Bold').text('Subdivision Breakdown', 50);
      doc.moveDown(0.4);
      for (const [sub, count] of Object.entries(s.bySubdivision).sort((a, b) => (b[1] as number) - (a[1] as number))) {
        doc.fillColor('#94a3b8').fontSize(9).font('Helvetica').text(`${sub}:`, 55, doc.y, { continued: true });
        doc.fillColor('#e2e8f0').text(` ${count}`);
      }
    }

    // ── Footer ──────────────────────────────────────────────────────────
    const footerY = doc.page.height - 40;
    doc.rect(0, footerY - 10, doc.page.width, 50).fill('#0f172a');
    doc.fillColor('#475569').fontSize(8).font('Helvetica')
       .text('KAAVAL AI — Confidential Police Analytical Report. Not for public distribution.', 50, footerY, { align: 'center', width: doc.page.width - 100 });

    doc.end();
  }
}
