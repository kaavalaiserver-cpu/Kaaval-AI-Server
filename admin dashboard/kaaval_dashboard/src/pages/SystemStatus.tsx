import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';
import type { SystemStatus as SystemStatusData } from '../types';
import {
  Server,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Wifi,
  WifiOff,
  HardDrive,
  Clock,
  Database,
  Cpu,
} from 'lucide-react';
import './SystemStatus.css';

const SystemStatus = () => {
  const [status, setStatus] = useState<SystemStatusData | null>(null);
  const [health, setHealth] = useState<{ config?: Record<string, string>, database?: string, redis?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    try {
      const [sRes, hRes] = await Promise.all([
        axios.get<SystemStatusData>(`${API_BASE}/system/status`),
        axios.get(`${API_BASE}/system/health`),
      ]);
      setStatus(sRes.data);
      setHealth(hRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  if (loading || !status) {
    return (
      <div className="sysstatus-page">
        <div className="sysstatus-loading">Loading system status...</div>
      </div>
    );
  }

  const dbOk = health && (health as { database?: string }).database === 'ok';
  const redisOk = health && (health as { redis?: string }).redis === 'ok';

  return (
    <div className="sysstatus-page">
      <div className="sysstatus-header">
        <h2><Server size={22} /> System Status</h2>
        <button className="btn-secondary" onClick={fetch}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Health Overview */}
      <div className="health-grid">
        <HealthCard
          icon={<Server size={20} />}
          label="API Server"
          status="Healthy"
          ok
        />
        <HealthCard
          icon={<Database size={20} />}
          label="PostgreSQL"
          status={dbOk ? 'Connected' : 'Disconnected'}
          ok={!!dbOk}
        />
        <HealthCard
          icon={<HardDrive size={20} />}
          label="Redis Cache"
          status={redisOk ? 'Connected' : 'Disconnected'}
          ok={!!redisOk}
        />
        <HealthCard
          icon={<Cpu size={20} />}
          label="AI Pipeline"
          status={status.aiPipelineStatus ?? 'Unknown'}
          ok={status.aiPipelineStatus === 'healthy'}
        />
      </div>

      {/* Camera Overview */}
      <div className="sys-section">
        <h3><Wifi size={18} /> Camera Network</h3>
        <div className="cam-overview-grid">
          <div className="cam-ov-card">
            <Wifi size={24} className="green" />
            <span className="cam-ov-val">{status.camerasOnline}</span>
            <span className="cam-ov-lbl">Online</span>
          </div>
          <div className="cam-ov-card">
            <WifiOff size={24} className="red" />
            <span className="cam-ov-val">{status.camerasOffline}</span>
            <span className="cam-ov-lbl">Offline</span>
          </div>
          <div className="cam-ov-card">
            <Clock size={24} className="blue" />
            <span className="cam-ov-val">{status.uptime ?? '—'}</span>
            <span className="cam-ov-lbl">Uptime</span>
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="sys-section">
        <h3><HardDrive size={18} /> System Information</h3>
        <div className="sys-info-table">
          <InfoRow label="API Port" value={health?.config?.apiPort ?? 'Unknown'} />
          <InfoRow label="Database" value={health?.config?.dbType ?? 'Unknown'} />
          <InfoRow label="Cache Layer" value={health?.config?.cacheType ?? 'Unknown'} />
          <InfoRow label="AI Backend" value={health?.config?.aiBackend ?? 'Unknown'} />
          <InfoRow label="Version" value="2.0.0" />
          <InfoRow label="Environment" value={health?.config?.environment ?? import.meta.env.MODE} />
        </div>
      </div>
    </div>
  );
};

const HealthCard = ({
  icon,
  label,
  status,
  ok,
}: {
  icon: React.ReactNode;
  label: string;
  status: string;
  ok: boolean;
}) => (
  <div className={`health-card ${ok ? 'ok' : 'err'}`}>
    <div className="health-icon">{icon}</div>
    <div className="health-info">
      <span className="health-label">{label}</span>
      <span className="health-status">
        {ok ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
        {status}
      </span>
    </div>
  </div>
);

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="info-row">
    <span className="info-label">{label}</span>
    <span className="info-value">{value}</span>
  </div>
);

export default SystemStatus;
