import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';
import type { FastAPIAnalyticsSummary } from '../types';
import './Analytics.css';
import {
  BarChart3, RefreshCw, Car, AlertTriangle, TrendingUp,
  CheckCircle, Clock, ShieldAlert, Activity, Eye,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler,
);

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#22c55e', '#ec4899', '#14b8a6', '#f97316'];

const tooltipPlugin = {
  backgroundColor: '#0f172a',
  borderColor: '#1e293b',
  borderWidth: 1,
  titleColor: '#e2e8f0',
  bodyColor: '#94a3b8',
  cornerRadius: 8,
  padding: 10,
};

const gridColor = 'rgba(148,163,184,0.07)';
const tickColor = '#475569';

const Analytics = () => {
  const [data, setData] = useState<FastAPIAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'trend' | 'vehicles'>('trend');
  const [finesActiveTab, setFinesActiveTab] = useState<'trend' | 'vehicles'>('trend');
  const mountTime = useRef(Date.now());

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await axios.get<FastAPIAnalyticsSummary>(`${API_BASE}/analytics/summary`);
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ─── Chart Configs ────────────────────────────────────────────────────────

  const dailyChart = data ? {
    labels: data.daily_last_30.map(d => {
      const dt = new Date(d.date);
      return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    }),
    datasets: [{
      label: 'Violations',
      data: data.daily_last_30.map(d => d.count),
      backgroundColor: (ctx: any) => {
        const canvas = ctx.chart.ctx;
        const gradient = canvas.createLinearGradient(0, 0, 0, 280);
        gradient.addColorStop(0, 'rgba(59,130,246,0.85)');
        gradient.addColorStop(1, 'rgba(59,130,246,0.1)');
        return gradient;
      },
      borderColor: '#3b82f6',
      borderWidth: 1.5,
      borderRadius: 5,
      borderSkipped: false,
    }],
  } : null;

  const lineChart = data ? {
    labels: data.daily_last_30.map(d => {
      const dt = new Date(d.date);
      return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    }),
    datasets: [{
      label: 'Violations',
      data: data.daily_last_30.map(d => d.count),
      borderColor: '#3b82f6',
      backgroundColor: (ctx: any) => {
        const canvas = ctx.chart.ctx;
        const gradient = canvas.createLinearGradient(0, 0, 0, 250);
        gradient.addColorStop(0, 'rgba(59,130,246,0.25)');
        gradient.addColorStop(1, 'rgba(59,130,246,0.0)');
        return gradient;
      },
      borderWidth: 2.5,
      pointRadius: 3,
      pointBackgroundColor: '#3b82f6',
      pointBorderColor: '#1e293b',
      pointBorderWidth: 2,
      tension: 0.4,
      fill: true,
    }],
  } : null;

  const finesBarChart = data?.fines_issued_last_30 ? {
    labels: data.fines_issued_last_30.map(d => {
      const dt = new Date(d.date);
      return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    }),
    datasets: [{
      label: 'Fines Issued',
      data: data.fines_issued_last_30.map(d => d.count),
      backgroundColor: (ctx: any) => {
        const canvas = ctx.chart.ctx;
        const gradient = canvas.createLinearGradient(0, 0, 0, 280);
        gradient.addColorStop(0, 'rgba(34,197,94,0.85)');
        gradient.addColorStop(1, 'rgba(34,197,94,0.1)');
        return gradient;
      },
      borderColor: '#22c55e',
      borderWidth: 1.5,
      borderRadius: 5,
      borderSkipped: false,
    }],
  } : null;

  const finesLineChart = data?.fines_issued_last_30 ? {
    labels: data.fines_issued_last_30.map(d => {
      const dt = new Date(d.date);
      return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    }),
    datasets: [{
      label: 'Fines Issued',
      data: data.fines_issued_last_30.map(d => d.count),
      borderColor: '#22c55e',
      backgroundColor: (ctx: any) => {
        const canvas = ctx.chart.ctx;
        const gradient = canvas.createLinearGradient(0, 0, 0, 250);
        gradient.addColorStop(0, 'rgba(34,197,94,0.25)');
        gradient.addColorStop(1, 'rgba(34,197,94,0.0)');
        return gradient;
      },
      borderWidth: 2.5,
      pointRadius: 3,
      pointBackgroundColor: '#22c55e',
      pointBorderColor: '#1e293b',
      pointBorderWidth: 2,
      tension: 0.4,
      fill: true,
    }],
  } : null;

  const typeChart = data ? {
    labels: data.by_type.map(t => t.violation_type),
    datasets: [{
      data: data.by_type.map(t => t.count),
      backgroundColor: CHART_COLORS,
      borderColor: '#0f172a',
      borderWidth: 3,
      hoverOffset: 8,
    }],
  } : null;

  const vehicleChart = data ? {
    labels: data.top_vehicles.map(v => v.vehicle_number || 'UNREAD'),
    datasets: [{
      label: 'Violations',
      data: data.top_vehicles.map(v => v.count),
      backgroundColor: (ctx: any) => {
        const canvas = ctx.chart.ctx;
        const gradient = canvas.createLinearGradient(0, 0, 0, 240);
        gradient.addColorStop(0, 'rgba(239,68,68,0.9)');
        gradient.addColorStop(1, 'rgba(239,68,68,0.2)');
        return gradient;
      },
      borderColor: '#ef4444',
      borderWidth: 1.5,
      borderRadius: 6,
      borderSkipped: false,
    }],
  } : null;

  const cameraChart = data ? {
    labels: data.top_cameras.map(c => c.camera_id),
    datasets: [{
      data: data.top_cameras.map(c => c.count),
      backgroundColor: CHART_COLORS.slice(0, data.top_cameras.length),
      borderColor: '#0f172a',
      borderWidth: 3,
      hoverOffset: 8,
    }],
  } : null;

  const commonBarOpts: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { ...tooltipPlugin },
    },
    scales: {
      x: {
        ticks: { color: tickColor, font: { size: 11 }, maxRotation: 45 },
        grid: { color: gridColor },
        border: { color: 'transparent' },
      },
      y: {
        ticks: { color: tickColor, font: { size: 11 } },
        grid: { color: gridColor },
        border: { color: 'transparent' },
        beginAtZero: true,
      },
    },
  };

  const lineOpts: any = {
    ...commonBarOpts,
    scales: {
      x: {
        ticks: { color: tickColor, font: { size: 10 }, maxRotation: 45, maxTicksLimit: 15 },
        grid: { color: gridColor },
        border: { color: 'transparent' },
      },
      y: {
        ticks: { color: tickColor, font: { size: 11 } },
        grid: { color: gridColor },
        border: { color: 'transparent' },
        beginAtZero: true,
      },
    },
  };

  const doughnutOpts: any = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: '#94a3b8', font: { size: 11 }, padding: 14, boxWidth: 12, boxHeight: 12 },
      },
      tooltip: { ...tooltipPlugin },
    },
  };

  // ─── Derived Stats ─────────────────────────────────────────────────────────
  const approvalRate = data && data.total_violations > 0
    ? Math.round((data.challans_issued / data.total_violations) * 100)
    : 0;

  const pendingRate = data && data.total_violations > 0
    ? Math.round((data.pending_review / data.total_violations) * 100)
    : 0;

  const topType = data?.by_type?.[0]?.violation_type ?? '—';
  const topTypeCount = data?.by_type?.[0]?.count ?? 0;

  // ─── Loading Skeleton ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="analytics-page">
        <div className="analytics-skeleton-header">
          <div className="skeleton-line w60" />
          <div className="skeleton-btn" />
        </div>
        <div className="kpi-row">
          {[...Array(4)].map((_, i) => <div key={i} className="kpi-card skeleton" />)}
        </div>
        <div className="skeleton-chart-full" />
        <div className="charts-grid-2">
          <div className="skeleton-chart" />
          <div className="skeleton-chart" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="analytics-page">
        <div className="analytics-empty">
          <BarChart3 size={48} />
          <p>Analytics data unavailable</p>
          <button className="btn-secondary" onClick={() => fetchData()}>
            <RefreshCw size={15} /> Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="analytics-header">
        <div className="analytics-header-left">
          <div className="analytics-title-row">
            <div className="analytics-title-icon"><BarChart3 size={20} /></div>
            <div>
              <h2>Analytics Dashboard</h2>
              <p className="analytics-subtitle">District Command Center · Kanyakumari</p>
            </div>
          </div>
        </div>
        <div className="analytics-header-right">
          <div className="last-refresh">Updated just now</div>
          <button className="btn-refresh-icon" onClick={() => fetchData(true)} disabled={refreshing} title="Refresh">
            <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ── KPI Row ───────────────────────────────────────── */}
      <div className="kpi-row">
        <KPICard
          icon={<Activity size={18} />}
          label="Total Violations"
          value={data.total_violations}
          color="blue"
          sub="All time"
        />
        <KPICard
          icon={<AlertTriangle size={18} />}
          label="Today's Violations"
          value={data.violations_today}
          color="orange"
          sub={new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
        />
        <KPICard
          icon={<Clock size={18} />}
          label="Pending Review"
          value={data.pending_review}
          color="yellow"
          sub={`${pendingRate}% of total`}
        />
        <KPICard
          icon={<CheckCircle size={18} />}
          label="Fines Issued"
          value={data.challans_issued}
          color="green"
          sub={`${approvalRate}% approval rate`}
        />
        <KPICard
          icon={<ShieldAlert size={18} />}
          label="Top Violation"
          value={topType}
          color="purple"
          sub={`${topTypeCount} cases`}
          isText
        />
      </div>

      {/* ── Trend Chart (full width) ───────────────────────── */}
      <div className="chart-card full-card">
        <div className="chart-card-header">
          <div className="chart-card-title">
            <TrendingUp size={16} />
            <span>Violation Trend — Last 30 Days</span>
          </div>
          <div className="chart-tab-group">
            <button
              className={`chart-tab ${activeTab === 'trend' ? 'active' : ''}`}
              onClick={() => setActiveTab('trend')}
            >
              Bar
            </button>
            <button
              className={`chart-tab ${activeTab === 'vehicles' ? 'active' : ''}`}
              onClick={() => setActiveTab('vehicles')}
            >
              Line
            </button>
          </div>
        </div>
        <div className="chart-area tall">
          {activeTab === 'trend' && dailyChart && (
            <Bar data={dailyChart} options={commonBarOpts} />
          )}
          {activeTab === 'vehicles' && lineChart && (
            <Line data={lineChart} options={lineOpts} />
          )}
        </div>
      </div>

      {/* ── Fines Issued Trend Chart (full width) ───────────────────────── */}
      <div className="chart-card full-card" style={{ marginTop: '20px' }}>
        <div className="chart-card-header">
          <div className="chart-card-title">
            <TrendingUp size={16} />
            <span>Fines Issued Trend — Last 30 Days</span>
          </div>
          <div className="chart-tab-group">
            <button
              className={`chart-tab ${finesActiveTab === 'trend' ? 'active' : ''}`}
              onClick={() => setFinesActiveTab('trend')}
            >
              Bar
            </button>
            <button
              className={`chart-tab ${finesActiveTab === 'vehicles' ? 'active' : ''}`}
              onClick={() => setFinesActiveTab('vehicles')}
            >
              Line
            </button>
          </div>
        </div>
        <div className="chart-area tall">
          {finesActiveTab === 'trend' && finesBarChart && (
            <Bar data={finesBarChart} options={commonBarOpts} />
          )}
          {finesActiveTab === 'vehicles' && finesLineChart && (
            <Line data={finesLineChart} options={lineOpts} />
          )}
        </div>
      </div>

      {/* ── Two-col: Type + Camera ────────────────────────── */}
      <div className="charts-grid-2">
        {/* Violation Type Doughnut */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-card-title">
              <AlertTriangle size={15} />
              <span>By Violation Type</span>
            </div>
          </div>
          <div className="chart-area doughnut-area">
            {typeChart && <Doughnut data={typeChart} options={doughnutOpts} />}
          </div>
          {/* Type Legend Breakdown */}
          <div className="type-breakdown">
            {data.by_type.slice(0, 5).map((t, i) => {
              const pct = data.total_violations ? Math.round((t.count / data.total_violations) * 100) : 0;
              return (
                <div className="type-row" key={t.violation_type}>
                  <span className="type-dot" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="type-name">{t.violation_type}</span>
                  <div className="type-bar-wrap">
                    <div className="type-bar" style={{ width: `${pct}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  </div>
                  <span className="type-count">{t.count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Camera Performance */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-card-title">
              <Eye size={15} />
              <span>Camera Performance</span>
            </div>
          </div>
          <div className="chart-area doughnut-area">
            {cameraChart && <Doughnut data={cameraChart} options={doughnutOpts} />}
          </div>
          {/* Camera table */}
          <div className="type-breakdown">
            {data.top_cameras.slice(0, 5).map((c, i) => {
              const pct = data.total_violations ? Math.round((c.count / data.total_violations) * 100) : 0;
              return (
                <div className="type-row" key={c.camera_id}>
                  <span className="type-dot" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="type-name">{c.camera_id}</span>
                  <div className="type-bar-wrap">
                    <div className="type-bar" style={{ width: `${pct}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  </div>
                  <span className="type-count">{c.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Top Offenders Table ───────────────────────────── */}
      <div className="chart-card">
        <div className="chart-card-header">
          <div className="chart-card-title">
            <Car size={15} />
            <span>Top Offending Vehicles</span>
          </div>
          <span className="chart-badge">{data.top_vehicles.length} vehicles</span>
        </div>
        <div className="offenders-wrap">
          {vehicleChart && (
            <div className="chart-area vehicle-area">
              <Bar data={vehicleChart} options={commonBarOpts} />
            </div>
          )}
          <div className="offenders-table" style={{ maxHeight: '350px', overflowY: 'auto' }}>
            <div className="offenders-header" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
              <span>#</span>
              <span>Plate Number</span>
              <span>Violations</span>
              <span>Risk Level</span>
            </div>
            {data.top_vehicles
              .filter(v => v.vehicle_number && v.vehicle_number.toUpperCase() !== 'UNKNOWN')
              .slice(0, 20)
              .map((v, i) => {
              const risk = v.count >= 10 ? 'Critical' : v.count >= 5 ? 'High' : v.count >= 3 ? 'Medium' : 'Low';
              const riskClass = v.count >= 10 ? 'critical' : v.count >= 5 ? 'high' : v.count >= 3 ? 'medium' : 'low';
              return (
                <div className="offender-row" key={v.vehicle_number}>
                  <span className="offender-rank">#{i + 1}</span>
                  <span className="offender-plate">{v.vehicle_number || 'UNREAD'}</span>
                  <span className="offender-count">{v.count}</span>
                  <span className={`risk-badge ${riskClass}`}>{risk}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── KPI Card Component ────────────────────────────────────────────────────
const KPICard = ({
  icon, label, value, color, sub, isText = false,
}: {
  icon: React.ReactNode; label: string; value: string | number;
  color: string; sub?: string; isText?: boolean;
}) => (
  <div className={`kpi-card kpi-${color}`}>
    <div className="kpi-icon-wrap">{icon}</div>
    <div className={`kpi-value ${isText ? 'kpi-text' : ''}`}>{value}</div>
    <div className="kpi-label">{label}</div>
    {sub && <div className="kpi-sub">{sub}</div>}
  </div>
);

export default Analytics;
