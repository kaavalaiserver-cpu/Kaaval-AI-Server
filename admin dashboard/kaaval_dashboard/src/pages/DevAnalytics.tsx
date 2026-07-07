import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';
import type { DevAnalytics as DevAnalyticsData } from '../types';
import {
  Code2, RefreshCw, Cpu, Gauge, Bike,
  ScanLine, CheckCircle2, XCircle, Activity,
  Key, Zap, AlertCircle, CheckCircle, Clock,
  BarChart3, Terminal, Wifi, WifiOff, TrendingUp,
  Shield, Database,
} from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, LineElement, PointElement, ArcElement,
  Tooltip, Legend, Filler,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import './DevAnalytics.css';

ChartJS.register(
  CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, ArcElement,
  Tooltip, Legend, Filler,
);


const tooltipStyle = {
  backgroundColor: '#0f172a',
  borderColor: '#1e293b',
  borderWidth: 1,
  titleColor: '#e2e8f0',
  bodyColor: '#94a3b8',
  cornerRadius: 8,
  padding: 10,
};

const DevAnalytics = () => {
  const [data, setData]                 = useState<DevAnalyticsData | null>(null);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);

  const [uptime, setUptime]             = useState(0); // seconds

  // Live uptime counter
  useEffect(() => {
    const t = setInterval(() => setUptime(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await axios.get<DevAnalyticsData>(`${API_BASE}/analytics/dev`);
      setData(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  };


  useEffect(() => { fetchData(); }, []);

  // ─── Derived Values ───────────────────────────────────────────────
  const ocrTotal        = (data?.ocrSuccessCount ?? 0) + (data?.ocrFailCount ?? 0);
  const ocrSuccessRate  = ocrTotal > 0 ? Math.round(((data?.ocrSuccessCount ?? 0) / ocrTotal) * 100) : 0;
  const confPct         = Math.round((data?.avgConfidence ?? 0) * 100);
  const extractPct      = parseFloat((data?.plateExtractionRate ?? 0).toFixed(1));
  const isHealthy       = data?.pipelineStatus === 'healthy';

  const fmtUptime = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };

  // ─── Confidence Distribution Chart ───────────────────────────────
  const confBuckets = data?.confidenceDistribution ?? [];
  const confChart = {
    labels: confBuckets.map(b => b.bucket),
    datasets: [{
      label: 'Count',
      data: confBuckets.map(b => b.count),
      backgroundColor: ['#ef4444','#f97316','#f59e0b','#84cc16','#22c55e'],
      borderColor: '#0f172a',
      borderWidth: 2,
      borderRadius: 6,
      borderSkipped: false,
    }],
  };

  // ─── Source Doughnut ─────────────────────────────────────────────
  const sourceChart = {
    labels: ['Camera Feed', 'Batch Upload'],
    datasets: [{
      data: [data?.cameraFeedCount ?? 0, data?.batchUploadCount ?? 0],
      backgroundColor: ['#3b82f6', '#f59e0b'],
      borderColor: '#0f172a',
      borderWidth: 3,
      hoverOffset: 8,
    }],
  };

  const barOpts: any = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: tooltipStyle },
    scales: {
      x: { ticks: { color: '#475569', font: { size: 11 } }, grid: { color: 'rgba(148,163,184,0.07)' }, border: { color: 'transparent' } },
      y: { ticks: { color: '#475569', font: { size: 11 } }, grid: { color: 'rgba(148,163,184,0.07)' }, border: { color: 'transparent' }, beginAtZero: true },
    },
  };

  const doughnutOpts: any = {
    responsive: true, maintainAspectRatio: false, cutout: '65%',
    plugins: {
      legend: { position: 'bottom' as const, labels: { color: '#94a3b8', font: { size: 11 }, padding: 14, boxWidth: 10 } },
      tooltip: tooltipStyle,
    },
  };

  // ─── Loading ──────────────────────────────────────────────────────
  if (loading) return (
    <div className="da-page">
      <div className="da-skeleton-header"><div className="da-sk-line w50" /><div className="da-sk-btn" /></div>
      <div className="da-metrics-grid">{[...Array(6)].map((_, i) => <div key={i} className="da-sk-card" />)}</div>
      <div className="da-sk-chart-full" />
    </div>
  );

  return (
    <div className="da-page">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="da-header">
        <div className="da-header-left">
          <div className="da-header-icon"><Code2 size={20} /></div>
          <div>
            <h2>Developer Analytics</h2>
            <p className="da-subtitle">AI Pipeline · OCR Engine · System Diagnostics</p>
          </div>
        </div>
        <div className="da-header-right">
          <div className="da-uptime-chip">
            <Terminal size={12} />
            <span className="da-uptime-label">Session</span>
            <code className="da-uptime-val">{fmtUptime(uptime)}</code>
          </div>
          <div className={`da-pipeline-pill ${isHealthy ? 'healthy' : 'error'}`}>
            {isHealthy ? <Wifi size={13} /> : <WifiOff size={13} />}
            {data?.pipelineStatus ?? 'Unknown'}
          </div>
          <button className="da-btn-refresh" onClick={() => fetchData(true)} disabled={refreshing}>
            <RefreshCw size={15} className={refreshing ? 'da-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>


      {/* ── Detection Statistics ─────────────────────────────────── */}
      <div className="da-section-label"><Cpu size={14} /> Detection Statistics</div>
      <div className="da-metrics-grid">
        <MetricCard icon={<Bike size={20} />}   label="Two-Wheelers" value={data?.twoWheelerCount ?? 0}  color="blue" />
        <MetricCard icon={<ScanLine size={20}/>} label="Plates Extracted" value={data?.plateExtractionCount ?? 0} color="green" />
        <MetricCard icon={<Gauge size={20} />}   label="Extraction Rate" value={`${extractPct}%`} color="purple"
          bar={{ value: extractPct, color: '#8b5cf6' }} />
      </div>

      {/* ── OCR & AI Pipeline ────────────────────────────────────── */}
      <div className="da-section-label"><Activity size={14} /> OCR &amp; AI Pipeline</div>
      <div className="da-metrics-grid">
        <MetricCard icon={<CheckCircle2 size={20}/>} label="Successful OCR" value={data?.ocrSuccessCount ?? 0} color="green" />
        <MetricCard icon={<XCircle size={20} />}     label="Failed OCR"     value={data?.ocrFailCount ?? 0}    color="red" />
        <MetricCard icon={<TrendingUp size={20}/>}   label="OCR Success Rate" value={`${ocrSuccessRate}%`}    color="teal"
          bar={{ value: ocrSuccessRate, color: '#14b8a6' }} />
        <MetricCard icon={<Gauge size={20} />}       label="Avg Confidence" value={`${confPct}%`}              color="orange"
          bar={{ value: confPct, color: '#f59e0b' }} />
      </div>

      {/* ── Charts Row ───────────────────────────────────────────── */}
      <div className="da-charts-row">
        {/* Confidence Distribution */}
        <div className="da-card da-chart-card">
          <div className="da-card-header">
            <div className="da-card-title"><BarChart3 size={15} /><span>AI Confidence Distribution</span></div>
          </div>
          <div className="da-chart-area">
            {confBuckets.length > 0
              ? <Bar data={confChart} options={barOpts} />
              : <div className="da-no-data">No confidence data available</div>
            }
          </div>
          {/* Bucket legend */}
          <div className="da-conf-legend">
            {['Very Low', 'Low', 'Medium', 'Good', 'High'].map((l, i) => (
              <div className="da-conf-item" key={l}>
                <span className="da-conf-dot" style={{ background: ['#ef4444','#f97316','#f59e0b','#84cc16','#22c55e'][i] }} />
                <span>{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Source Breakdown Doughnut */}
        <div className="da-card da-chart-card narrow">
          <div className="da-card-header">
            <div className="da-card-title"><Database size={15} /><span>Source Breakdown</span></div>
          </div>
          <div className="da-chart-area doughnut">
            <Doughnut data={sourceChart} options={doughnutOpts} />
          </div>
          <div className="da-source-stats">
            <div className="da-source-row">
              <span className="da-source-dot blue" />
              <span>Camera Feed</span>
              <strong>{data?.cameraFeedCount ?? 0}</strong>
            </div>
            <div className="da-source-row">
              <span className="da-source-dot orange" />
              <span>Batch Upload</span>
              <strong>{data?.batchUploadCount ?? 0}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ── System Status Footer ─────────────────────────────────── */}
      <div className="da-status-footer">
        <div className="da-status-item">
          <Shield size={13} />
          <span>Pipeline</span>
          <span className={`da-status-val ${isHealthy ? 'green' : 'red'}`}>{data?.pipelineStatus ?? '—'}</span>
        </div>
        <div className="da-status-divider" />
        <div className="da-status-item">
          <Database size={13} />
          <span>Total Detections</span>
          <span className="da-status-val blue">{((data?.twoWheelerCount ?? 0))}</span>
        </div>
        <div className="da-status-divider" />
        <div className="da-status-item">
          <Activity size={13} />
          <span>OCR Jobs</span>
          <span className="da-status-val orange">{ocrTotal}</span>
        </div>
        <div className="da-status-divider" />
        <div className="da-status-item">
          <TrendingUp size={13} />
          <span>Avg Confidence</span>
          <span className="da-status-val purple">{confPct}%</span>
        </div>
      </div>
    </div>
  );
};

// ─── Sub-Components ────────────────────────────────────────────────────────

const MetricCard = ({
  icon, label, value, color, bar,
}: {
  icon: React.ReactNode; label: string; value: string | number;
  color: string; bar?: { value: number; color: string };
}) => (
  <div className={`da-metric-card da-${color}`}>
    <div className="da-metric-icon">{icon}</div>
    <div className="da-metric-body">
      <div className="da-metric-value">{value}</div>
      <div className="da-metric-label">{label}</div>
    </div>
    {bar && (
      <div className="da-metric-bar-wrap">
        <div className="da-metric-bar" style={{ width: `${Math.min(bar.value, 100)}%`, background: bar.color }} />
      </div>
    )}
  </div>
);

const ApiStatChip = ({ label, value, color }: { label: string; value: string; color: string }) => (
  <div className={`da-api-chip da-${color}`}>
    <div className="da-api-chip-val">{value}</div>
    <div className="da-api-chip-label">{label}</div>
  </div>
);

export default DevAnalytics;
