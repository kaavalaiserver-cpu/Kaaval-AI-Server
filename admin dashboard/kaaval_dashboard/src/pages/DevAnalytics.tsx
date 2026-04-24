import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';
import type { DevAnalytics as DevAnalyticsData } from '../types';
import {
  Code2,
  RefreshCw,
  Cpu,
  Gauge,
  Bike,
  Car,
  ScanLine,
  CheckCircle2,
  XCircle,
  Activity,
  Key,
  Server,
  Zap
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import './DevAnalytics.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

interface PlateApiStatus {
  account_name: string;
  key_prefix: string;
  calls_used: number;
  total_limit: number;
  remaining: number;
  status: string;
}

const DevAnalytics = () => {
  const [data, setData] = useState<DevAnalyticsData | null>(null);
  const [plateStatus, setPlateStatus] = useState<PlateApiStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<string>('all');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get<DevAnalyticsData>(`${API_BASE}/analytics/dev`);
      setData(res.data);
    } catch (err) {
      console.error(err);
    } 

    try {
      // Fetch Plate Recognizer API usage via backend proxy
      const plateRes = await axios.get<PlateApiStatus[]>(`${API_BASE}/system/ai-status`);
      setPlateStatus(plateRes.data);
    } catch (err) {
      console.error("Failed to fetch plate api status", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading || !data) {
    return (
      <div className="dev-analytics-page">
        <div className="dev-loading">Loading dev analytics...</div>
      </div>
    );
  }

  const confBuckets = data.confidenceDistribution ?? [];
  const confChart = {
    labels: confBuckets.map((b: { bucket: string }) => b.bucket),
    datasets: [{
      label: 'Count',
      data: confBuckets.map((b: { count: number }) => b.count),
      backgroundColor: confBuckets.map((_: unknown, i: number) => {
        const colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e'];
        return colors[i % colors.length];
      }),
      borderRadius: 4,
    }],
  };

  const sourceChart = {
    labels: ['Camera Feed', 'Batch Upload'],
    datasets: [{
      data: [data.cameraFeedCount ?? 0, data.batchUploadCount ?? 0],
      backgroundColor: ['#1e6fd9', '#f59e0b'],
      borderWidth: 0,
    }],
  };

  const totalCalls = plateStatus.reduce((acc, curr) => acc + curr.calls_used, 0);
  const totalLimit = plateStatus.reduce((acc, curr) => acc + curr.total_limit, 0);

  const getStatusType = (acct: PlateApiStatus) => {
    const s = acct.status.toLowerCase();
    if (s.includes('invalid') || s.includes('error')) return 'invalid'; 
    if (acct.remaining <= 0 || s.includes('quota_exceeded')) return 'exceeded';
    if (acct.remaining < 200) return 'warning';
    return 'active';
  };

  const getStatusIcon = (type: string) => {
    switch(type) {
      case 'invalid': return '🔴';
      case 'exceeded': return '🔴';
      case 'warning': return '🟠';
      default: return '🟢';
    }
  };

  return (
    <div className="dev-analytics-page">
      <div className="dev-header">
        <h2><Code2 size={22} /> Developer Analytics</h2>
        <button className="btn-secondary" onClick={fetchData}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

       {/* Plate API Usage Section */}
       <div className="dev-section">
        <div className="plate-section-header">
          <h3><Key size={18} /> Plate Recognizer API Usage</h3>
          
          <div className="plate-controls">
            <div className="plate-summary-text">
               <span className="p-sum-item">Used: <b>{totalCalls.toLocaleString()}</b></span>
               <span className="p-sum-div">/</span>
               <span className="p-sum-item">Limit: <b>{totalLimit.toLocaleString()}</b></span>
            </div>
            
            <select 
              className="plate-account-select"
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
            >
              <option value="all">View All Accounts</option>
              {plateStatus.map(acct => {
                const type = getStatusType(acct);
                const icon = getStatusIcon(type);
                return (
                  <option key={acct.account_name} value={acct.account_name}>
                    {icon} {acct.account_name} ({acct.remaining} left)
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <div className="plate-api-grid">
          {plateStatus.length === 0 ? (
            <div className="no-data">No Plate API data available (Is service running on port 8000?)</div>
          ) : (
            plateStatus
              .filter(acct => selectedAccount === 'all' || acct.account_name === selectedAccount)
              .map((acct) => {
                const type = getStatusType(acct);
                return (
                  <div key={acct.account_name} className={`plate-card ${type}`}>
                    <div className="plate-card-header">
                      <span className="acct-name">{acct.account_name}</span>
                      <span className={`status-badge ${acct.status.toLowerCase().replace(' ', '-')}`}>
                        {acct.status}
                      </span>
                    </div>
                    <div className="plate-card-body">
                      <div className="metric-row">
                        <span className="label">Key Prefix:</span>
                        <span className="value mono">{acct.key_prefix}</span>
                      </div>
                      
                      <div className="usage-bar-container">
                        <div 
                          className="usage-bar" 
                          style={{ width: `${Math.min(((acct.calls_used || 0) / (acct.total_limit || 1)) * 100, 100)}%` }}
                        ></div>
                      </div>
                      
                      <div className="metric-stats">
                        <div className="stat">
                          <span className="val">{acct.calls_used}</span>
                          <span className="lbl">Used</span>
                        </div>
                        <div className="stat divider">/</div>
                        <div className="stat">
                          <span className="val">{acct.total_limit}</span>
                          <span className="lbl">Limit</span>
                        </div>
                        <div className="stat right">
                          <span className="val highlight">{acct.remaining}</span>
                          <span className="lbl">Left</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>

      {/* Detection Stats */}
      <div className="dev-section">
        <h3><Cpu size={18} /> Detection Statistics</h3>
        <div className="dev-cards">
          <DevCard
            icon={<Bike size={22} />}
            label="Two-Wheelers Detected"
            value={data.twoWheelerCount}
            color="blue"
          />
          <DevCard
            icon={<Car size={22} />}
            label="Four-Wheelers Detected"
            value={data.fourWheelerCount}
            color="navy"
          />
          <DevCard
            icon={<ScanLine size={22} />}
            label="Plates Extracted"
            value={data.plateExtractionCount}
            color="green"
          />
          <DevCard
            icon={<Gauge size={22} />}
            label="Extraction Rate"
            value={`${data.plateExtractionRate?.toFixed(1) ?? 0}%`}
            color="orange"
          />
        </div>
      </div>

      {/* OCR Pipeline */}
      <div className="dev-section">
        <h3><Activity size={18} /> OCR & AI Pipeline</h3>
        <div className="dev-cards">
          <DevCard
            icon={<CheckCircle2 size={22} />}
            label="Successful OCR"
            value={data.ocrSuccessCount ?? 0}
            color="green"
          />
          <DevCard
            icon={<XCircle size={22} />}
            label="Failed OCR"
            value={data.ocrFailCount ?? 0}
            color="red"
          />
          <DevCard
            icon={<Gauge size={22} />}
            label="Avg Confidence"
            value={`${(data.avgConfidence * 100).toFixed(1)}%`}
            color="blue"
          />
          <DevCard
            icon={<Activity size={22} />}
            label="Pipeline Status"
            value={data.pipelineStatus ?? 'Unknown'}
            color={data.pipelineStatus === 'healthy' ? 'green' : 'red'}
          />
        </div>
      </div>

      {/* Charts */}
      <div className="dev-charts">
        <div className="dev-chart-card">
          <h3>AI Confidence Distribution</h3>
          <div className="dev-chart-wrap">
            <Bar
              data={confChart}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: { ticks: { color: '#4a5568' }, grid: { color: 'rgba(0,0,0,0.06)' } },
                  y: { ticks: { color: '#4a5568' }, grid: { color: 'rgba(0,0,0,0.06)' } },
                },
              }}
            />
          </div>
        </div>

        <div className="dev-chart-card small">
          <h3>Source Breakdown</h3>
          <div className="dev-chart-wrap doughnut">
            <Doughnut
              data={sourceChart}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: { legend: { position: 'bottom', labels: { color: '#4a5568' } } },
              }}
            />
          </div>
          <div className="source-breakdown-legend">
            <span><span className="dot blue" /> Camera: {data.cameraFeedCount ?? 0}</span>
            <span><span className="dot orange" /> Batch: {data.batchUploadCount ?? 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const DevCard = ({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) => (
  <div className={`dev-card ${color}`}>
    <div className="dev-card-icon">{icon}</div>
    <div className="dev-card-info">
      <span className="dev-card-value">{value}</span>
      <span className="dev-card-label">{label}</span>
    </div>
  </div>
);

export default DevAnalytics;
