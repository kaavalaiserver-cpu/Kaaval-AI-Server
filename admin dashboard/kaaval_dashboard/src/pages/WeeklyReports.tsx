import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';
import { BarChart2, Download, RefreshCw, Calendar, TrendingUp, CheckCircle, XCircle, Clock, Layers } from 'lucide-react';
import './WeeklyReports.css';

interface DayData { date: string; total: number; verified: number; rejected: number; }
interface WeeklyData {
  period: { start: string; end: string };
  summary: {
    total: number; verified: number; rejected: number; pending: number;
    approvalRate: number; avgConfidence: number;
    byType: Record<string, number>;
    bySubdivision: Record<string, number>;
    byCamera: Record<string, number>;
  };
  dailyTrend: DayData[];
}

const getISO = (d: Date) => d.toISOString().split('T')[0];
const nowDate = getISO(new Date());
const weekAgo = getISO(new Date(Date.now() - 6 * 86400000));

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const WeeklyReports = () => {
  const [start, setStart] = useState(weekAgo);
  const [end, setEnd] = useState(nowDate);
  const [data, setData] = useState<WeeklyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const trendRef = useRef<HTMLCanvasElement>(null);
  const finesRef = useRef<HTMLCanvasElement>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get<WeeklyData>(`${API_BASE}/reports/weekly`, {
        params: { start, end },
      });
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [start, end]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  useEffect(() => {
    if (!data) return;
    if (trendRef.current) drawTrendChart(trendRef.current, data.dailyTrend);
    if (finesRef.current) drawFinesChart(finesRef.current, data.dailyTrend);
  }, [data]);

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const url = `${API_BASE}/reports/weekly/pdf?start=${start}&end=${end}`;
      const res = await axios.get(url, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `kaaval-report-${start}-to-${end}.pdf`;
      a.click();
    } catch { alert('PDF generation failed'); }
    finally { setDownloading(false); }
  };

  return (
    <div className="reports-page">
      {/* Header */}
      <div className="reports-header">
        <div>
          <h2><BarChart2 size={22} /> Weekly Reports</h2>
          <p className="reports-sub">Analytics and performance insights for the selected period</p>
        </div>
        <div className="reports-actions">
          <div className="date-range-picker">
            <Calendar size={15} />
            <input type="date" value={start} max={end} onChange={e => setStart(e.target.value)} />
            <span>to</span>
            <input type="date" value={end} min={start} max={nowDate} onChange={e => setEnd(e.target.value)} />
          </div>
          <button className="btn-refresh" onClick={fetchReport} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
          </button>
          <button className="btn-download" onClick={handleDownloadPdf} disabled={downloading || !data}>
            <Download size={15} /> {downloading ? 'Generating...' : 'Download PDF'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="reports-loading"><RefreshCw size={28} className="spin" /><span>Loading report data...</span></div>
      ) : !data ? (
        <div className="reports-empty"><BarChart2 size={40} /><p>No data available for this period</p></div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="reports-summary">
            <SummaryCard icon={<Layers size={20} />} label="Total Violations" value={data.summary.total} color="blue" />
            <SummaryCard icon={<CheckCircle size={20} />} label="Fines Issued" value={data.summary.verified} color="green" />
            <SummaryCard icon={<XCircle size={20} />} label="Rejected" value={data.summary.rejected} color="red" />
            <SummaryCard icon={<Clock size={20} />} label="Pending" value={data.summary.pending} color="yellow" />
            <SummaryCard icon={<TrendingUp size={20} />} label="Approval Rate" value={`${data.summary.approvalRate}%`} color="purple" />
          </div>

          {/* Daily Trend Chart */}
          <div className="reports-grid-2">
            <div className="reports-card">
              <h3><TrendingUp size={17} /> Daily Violation Trend</h3>
              <div className="chart-legend">
                <span><span className="dot blue" /> Total</span>
                <span><span className="dot red" /> Rejected</span>
              </div>
              <canvas ref={trendRef} className="trend-canvas" height={200} />
            </div>

            <div className="reports-card">
              <h3><TrendingUp size={17} /> Fines Issued Trend</h3>
              <div className="chart-legend">
                <span><span className="dot green" /> Approved</span>
              </div>
              <canvas ref={finesRef} className="trend-canvas" height={200} />
            </div>
          </div>

          {/* Two-column breakdown */}
          <div className="reports-grid-2">
            {/* Violation Type Breakdown */}
            <div className="reports-card">
              <h3><BarChart2 size={17} /> Violation Types</h3>
              <div className="breakdown-list">
                {Object.entries(data.summary.byType)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count], i) => {
                    const pct = data.summary.total ? Math.round((count / data.summary.total) * 100) : 0;
                    return (
                      <div className="breakdown-row" key={type}>
                        <span className="breakdown-label">{type}</span>
                        <div className="breakdown-bar-wrap">
                          <div className="breakdown-bar" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                        </div>
                        <span className="breakdown-count">{count} <span className="breakdown-pct">({pct}%)</span></span>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Subdivision Comparison */}
            <div className="reports-card">
              <h3><Layers size={17} /> Subdivision Performance</h3>
              <div className="breakdown-list">
                {Object.entries(data.summary.bySubdivision)
                  .sort((a, b) => b[1] - a[1])
                  .map(([sub, count], i) => {
                    const pct = data.summary.total ? Math.round((count / data.summary.total) * 100) : 0;
                    return (
                      <div className="breakdown-row" key={sub}>
                        <span className="breakdown-label">{sub}</span>
                        <div className="breakdown-bar-wrap">
                          <div className="breakdown-bar" style={{ width: `${pct}%`, background: COLORS[(i + 2) % COLORS.length] }} />
                        </div>
                        <span className="breakdown-count">{count}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Daily Table */}
          <div className="reports-card">
            <h3><Calendar size={17} /> Day-by-Day Breakdown</h3>
            <div className="table-wrap">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Total</th>
                    <th>Approved</th>
                    <th>Rejected</th>
                    <th>Pending</th>
                    <th>Approval %</th>
                  </tr>
                </thead>
                <tbody>
                  {data.dailyTrend.map(day => {
                    const pending = day.total - day.verified - day.rejected;
                    const rate = day.total ? Math.round((day.verified / day.total) * 100) : 0;
                    return (
                      <tr key={day.date}>
                        <td>{new Date(day.date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', weekday: 'short' })}</td>
                        <td className="td-num">{day.total}</td>
                        <td className="td-num green">{day.verified}</td>
                        <td className="td-num red">{day.rejected}</td>
                        <td className="td-num yellow">{Math.max(0, pending)}</td>
                        <td>
                          <div className="rate-bar-wrap">
                            <div className="rate-bar" style={{ width: `${rate}%` }} />
                            <span>{rate}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ─── Summary Card Component ──────────────────────────────────────────────────
const SummaryCard = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) => (
  <div className={`report-stat-card ${color}`}>
    <div className="rsc-icon">{icon}</div>
    <div className="rsc-num">{value}</div>
    <div className="rsc-label">{label}</div>
  </div>
);

// ─── Canvas Trend Chart ──────────────────────────────────────────────────────
function drawTrendChart(canvas: HTMLCanvasElement, data: DayData[]) {
  const ctx = canvas.getContext('2d');
  if (!ctx || !data.length) return;

  const dpr = window.devicePixelRatio || 1;
  const width = canvas.offsetWidth;
  const height = 200;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, width, height);

  const pad = { top: 20, right: 20, bottom: 40, left: 40 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;
  const maxVal = Math.max(...data.map(d => d.total), 1);

  const x = (i: number) => pad.left + (i / (data.length - 1 || 1)) * w;
  const y = (v: number) => pad.top + h - (v / maxVal) * h;

  // Grid lines
  ctx.strokeStyle = 'rgba(148,163,184,0.1)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const yy = pad.top + (i / 4) * h;
    ctx.beginPath(); ctx.moveTo(pad.left, yy); ctx.lineTo(pad.left + w, yy); ctx.stroke();
    ctx.fillStyle = '#475569'; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(String(Math.round(maxVal * (1 - i / 4))), pad.left - 5, yy + 3);
  }

  const drawLine = (color: string, getValue: (d: DayData) => number, fill?: string) => {
    ctx.beginPath();
    data.forEach((d, i) => i === 0 ? ctx.moveTo(x(i), y(getValue(d))) : ctx.lineTo(x(i), y(getValue(d))));
    ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke();
    if (fill) {
      ctx.lineTo(x(data.length - 1), pad.top + h);
      ctx.lineTo(x(0), pad.top + h);
      ctx.closePath();
      ctx.fillStyle = fill; ctx.fill();
    }
    // Dots
    data.forEach((d, i) => {
      ctx.beginPath(); ctx.arc(x(i), y(getValue(d)), 3, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
    });
  };

  drawLine('#3b82f6', d => d.total, 'rgba(59,130,246,0.06)');
  drawLine('#ef4444', d => d.rejected);

  // X labels
  ctx.fillStyle = '#64748b'; ctx.font = '9px Inter, sans-serif'; ctx.textAlign = 'center';
  data.forEach((d, i) => {
    const label = new Date(d.date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    ctx.fillText(label, x(i), pad.top + h + 14);
  });
}

function drawFinesChart(canvas: HTMLCanvasElement, data: DayData[]) {
  const ctx = canvas.getContext('2d');
  if (!ctx || !data.length) return;

  const dpr = window.devicePixelRatio || 1;
  const width = canvas.offsetWidth;
  const height = 200;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, width, height);

  const pad = { top: 20, right: 20, bottom: 40, left: 40 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;
  const maxVal = Math.max(...data.map(d => d.verified), 1);

  const x = (i: number) => pad.left + (i / (data.length - 1 || 1)) * w;
  const y = (v: number) => pad.top + h - (v / maxVal) * h;

  ctx.strokeStyle = 'rgba(148,163,184,0.1)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const yy = pad.top + (i / 4) * h;
    ctx.beginPath(); ctx.moveTo(pad.left, yy); ctx.lineTo(pad.left + w, yy); ctx.stroke();
    ctx.fillStyle = '#475569'; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(String(Math.round(maxVal * (1 - i / 4))), pad.left - 5, yy + 3);
  }

  const drawLine = (color: string, getValue: (d: DayData) => number, fill?: string) => {
    ctx.beginPath();
    data.forEach((d, i) => i === 0 ? ctx.moveTo(x(i), y(getValue(d))) : ctx.lineTo(x(i), y(getValue(d))));
    ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke();
    if (fill) {
      ctx.lineTo(x(data.length - 1), pad.top + h);
      ctx.lineTo(x(0), pad.top + h);
      ctx.closePath();
      ctx.fillStyle = fill; ctx.fill();
    }
    data.forEach((d, i) => {
      ctx.beginPath(); ctx.arc(x(i), y(getValue(d)), 3, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
    });
  };

  drawLine('#22c55e', d => d.verified, 'rgba(34,197,94,0.06)');

  ctx.fillStyle = '#64748b'; ctx.font = '9px Inter, sans-serif'; ctx.textAlign = 'center';
  data.forEach((d, i) => {
    const label = new Date(d.date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    ctx.fillText(label, x(i), pad.top + h + 14);
  });
}

export default WeeklyReports;
