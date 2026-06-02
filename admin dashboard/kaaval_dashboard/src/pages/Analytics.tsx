import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';
import type { FastAPIAnalyticsSummary } from '../types';
import './Analytics.css';
import {
  BarChart3,
  RefreshCw,
  Car,
  AlertTriangle,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';


ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  ArcElement, Title, Tooltip, Legend, Filler,
);

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { labels: { color: '#4a5568' } } },
  scales: {
    x: { ticks: { color: '#4a5568' }, grid: { color: 'rgba(0,0,0,0.06)' } },
    y: { ticks: { color: '#4a5568' }, grid: { color: 'rgba(0,0,0,0.06)' } },
  },
};

const Analytics = () => {
  const [data, setData] = useState<FastAPIAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
        const res = await axios.get<FastAPIAnalyticsSummary>(`${API_BASE}/analytics/summary`);
        setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading || !data) {
    return (
      <div className="analytics-page">
        <div className="analytics-loading">Loading analytics...</div>
      </div>
    );
  }

  /* Violations by Day */
  const dailyChart = {
    labels: data.daily_last_30.map((d) => d.date),
    datasets: [
      {
        label: 'Violations',
        data: data.daily_last_30.map((d) => d.count),
        backgroundColor: 'rgba(11, 58, 110, 0.7)',
        borderColor: '#1e6fd9',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  /* Violations by Camera */
  const cameraChart = {
    labels: data.top_cameras.map((c) => c.camera_id),
    datasets: [
      {
        label: 'Count',
        data: data.top_cameras.map((c) => c.count),
        backgroundColor: [
          '#1e6fd9', '#e31b23', '#f59e0b', '#22c55e', '#a78bfa',
        ],
      },
    ],
  };

  /* Violations by Type */
  const typeChart = {
    labels: data.by_type.map((t) => t.violation_type),
    datasets: [
      {
        data: data.by_type.map((t) => t.count),
        backgroundColor: ['#1e6fd9', '#e31b23', '#f59e0b', '#22c55e', '#a78bfa'],
        borderWidth: 0,
      },
    ],
  };

  /* Top Vehicles */
  const vehicleChart = {
    labels: data.top_vehicles.map((v) => v.vehicle_number),
    datasets: [
      {
        label: 'Violations',
        data: data.top_vehicles.map((v) => v.count),
        backgroundColor: '#e31b23',
        borderRadius: 4,
      },
    ],
  };

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <h2><BarChart3 size={22} /> Police Analytics Dashboard</h2>
        <button className="btn-secondary" onClick={fetchData}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* KPI Row */}
      <div className="kpi-row">
        <KPI label="Total Violations" value={data.total_violations} />
        <KPI label="Violations Today" value={data.violations_today} />
        <KPI label="Pending Review" value={data.pending_review} />
        <KPI label="Challans Issued" value={data.challans_issued} />
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        <div className="chart-card full">
          <h3>Violations by Day</h3>
          <div className="chart-wrap tall">
            <Bar data={dailyChart} options={chartDefaults as never} />
          </div>
        </div>

        <div className="chart-card">
          <h3 title="Top Offending Vehicles"><Car size={16} style={{marginRight: 8}}/> Top Vehicles</h3>
          <div className="chart-wrap">
            <Bar data={vehicleChart} options={chartDefaults as never} />
          </div>
        </div>

        <div className="chart-card narrow">
          <h3><AlertTriangle size={16} style={{marginRight: 8}}/> By Type</h3>
          <div className="chart-wrap doughnut">
            <Doughnut
              data={typeChart}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: { legend: { position: 'bottom', labels: { color: '#4a5568' } } },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const KPI = ({ label, value }: { label: string; value: string | number }) => (
  <div className="kpi-card">
    <span className="kpi-value">{value}</span>
    <span className="kpi-label">{label}</span>
  </div>
);

export default Analytics;
