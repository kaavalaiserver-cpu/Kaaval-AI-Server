import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';
import type { FastAPIAnalyticsSummary, ViolationItem, CameraStatus, ViolationStats } from '../types';
import {
  Camera,
  AlertTriangle,
  Clock,
  CheckCircle,
  Shield,
  Eye,
  TrendingUp,
  MapPin,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../context/AuthContext';
import './Dashboard.css';

const FULL_ACCESS_ROLES: Role[] = ['super_admin', 'sp', 'dsp', 'developer'];

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<FastAPIAnalyticsSummary | null>(null);
  const [violationStats, setViolationStats] = useState<ViolationStats | null>(null);
  const [recentViolations, setRecentViolations] = useState<ViolationItem[]>([]);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus | null>(null);
  const navigate = useNavigate();

  const [selectedSubdivision, setSelectedSubdivision] = useState<string>('all');

  const canUseDistrictFeatures = !!user && FULL_ACCESS_ROLES.includes(user.role);

  const isInScope = (location?: string | null) => {
    if (canUseDistrictFeatures) return true;
    if (selectedSubdivision !== 'all') {
      return (location ?? '').toLowerCase().includes(selectedSubdivision.toLowerCase());
    }
    // Very basic fallback if they are an admin
    return true;
  };

  useEffect(() => {
    const fetchAll = async (background = false) => {
      // Skip if page is hidden to save resources
      if (background && document.visibilityState !== 'visible') return;

      const subQuery = selectedSubdivision !== 'all' ? `?subdivisionCode=${selectedSubdivision}` : '';
      const [statsRes, violationsRes, camerasRes, violationStatsRes] = await Promise.allSettled([
        axios.get<FastAPIAnalyticsSummary>(`${API_BASE}/analytics/summary${subQuery}`),
        axios.get<{ data: ViolationItem[] }>(`${API_BASE}/violations?limit=5${selectedSubdivision !== 'all' ? `&subdivisionCode=${selectedSubdivision}` : ''}`),
        axios.get<CameraStatus>(`${API_BASE}/cameras/status${subQuery}`),
        axios.get<ViolationStats>(`${API_BASE}/violations/stats${subQuery}`),
      ]);

      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data);
      }

      if (violationStatsRes.status === 'fulfilled') {
        setViolationStats(violationStatsRes.value.data);
      }

      if (violationsRes.status === 'fulfilled') {
        const data = violationsRes.value.data.data ?? (violationsRes.value.data as unknown as ViolationItem[]);
        setRecentViolations(Array.isArray(data) ? data : []);
      }

      if (camerasRes.status === 'fulfilled') {
        setCameraStatus(camerasRes.value.data);
      }
    };
    fetchAll();
    const interval = setInterval(() => fetchAll(true), 30000); // 30s polling
    return () => clearInterval(interval);
  }, [selectedSubdivision]);

  const todayCount = stats?.total_violations ?? 0;
  const pendingCount = stats?.pending_review ?? 0;
  const finesCount = stats?.challans_issued ?? 0;
  const withConfidenceCount = violationStats?.with_confidence ?? 0;
  
  const noHelmetCount = useMemo(() => {
    if (!stats?.by_type) return 0;
    const match = stats.by_type.find(t => {
      const norm = t.violation_type.toLowerCase();
      return norm.includes('helmet') || norm.includes('no_helmet') || norm === 'nohelmet';
    });
    return match ? match.count : 0;
  }, [stats]);

  const visibleCameras = useMemo(() => {
    if (!cameraStatus?.cameras) return [];
    return cameraStatus.cameras.filter((c) => isInScope(c.location));
  }, [cameraStatus, canUseDistrictFeatures, selectedSubdivision]);

  const visibleRecentViolations = useMemo(() => {
    const filtered = recentViolations.filter((v) => isInScope(v.location));
    return filtered.slice(0, 10);
  }, [recentViolations, canUseDistrictFeatures, selectedSubdivision]);



  const visibleOnline = visibleCameras.filter((c) => c.status === 'online').length;
  const visibleOffline = Math.max(0, visibleCameras.length - visibleOnline);

  return (
    <div className="dashboard-page">
      {/* Overview Widgets */}
      <div className="widget-grid">
        <WidgetCard
          icon={<AlertTriangle size={22} />}
          label="TOTAL Violations Detected"
          value={String(todayCount)}
          sub="All-time"
          color="red"
        />
        <WidgetCard
          icon={<Clock size={22} />}
          label="Pending Review"
          value={String(pendingCount)}
          sub="Awaiting action"
          color="orange"
        />
        <WidgetCard
          icon={<CheckCircle size={22} />}
          label="TOTAL Fines Issued"
          value={String(finesCount)}
          sub="All-time"
          color="green"
        />
      </div>

      {/* Subdivision Filter for Superadmin */}
      {canUseDistrictFeatures && (
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Filter by Subdivision:</label>
          <select 
            value={selectedSubdivision} 
            onChange={(e) => setSelectedSubdivision(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none' }}
          >
            <option value="all">All District (Kanyakumari)</option>
            <option value="nagercoil">Nagercoil</option>
            <option value="colachel">Colachel</option>
            <option value="kanyakumari">Kanyakumari</option>
            <option value="thuckalay">Thuckalay</option>
            <option value="marthandam">Marthandam</option>
          </select>
        </div>
      )}

      {/* Live Violation Feed */}
      <div className="dash-card live-feed-card" style={{ marginBottom: '24px' }}>
        <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
          <h3><Shield size={18} /> Live Violation Action Feed</h3>
          {canUseDistrictFeatures && (
            <button className="link-btn" onClick={() => navigate('/violations')}>
              View All Violations
            </button>
          )}
        </div>
        <div className="live-feed-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', marginTop: '16px' }}>
          {visibleRecentViolations.length === 0 ? (
            <div className="empty-state" style={{ gridColumn: '1/-1', padding: '40px' }}>No recent violations detected.</div>
          ) : (
            visibleRecentViolations.map((v) => (
              <div key={v.id} className="live-feed-item" style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                <div style={{ height: '140px', background: '#000', position: 'relative' }}>
                  {v.image_url ? (
                    <img src={v.image_url} alt="Evidence" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><Camera size={30} /></div>
                  )}
                  <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(239, 68, 68, 0.9)', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                    {v.type}
                  </div>
                </div>
                <div style={{ padding: '12px' }}>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '4px' }}>{v.vehicle_number}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '12px' }}>
                    <MapPin size={12} /> {v.location}
                  </div>
                  <button onClick={() => navigate('/violations')} style={{ width: '100%', background: 'var(--accent)', color: '#fff', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <Eye size={14} /> Review Offense
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Real-Time Alerts */}
        <div className="dash-card alerts-card">
          <div className="card-header">
            <h3><AlertTriangle size={18} /> Real-Time Alerts</h3>
            {canUseDistrictFeatures && (
              <button className="link-btn" onClick={() => navigate('/violations')}>
                View All
              </button>
            )}
          </div>
          <div className="alerts-list">
            {visibleRecentViolations.length === 0 ? (
              <div className="empty-state">No recent violations</div>
            ) : (
              visibleRecentViolations.map((v) => (
                <div key={v.id} className="alert-item">
                  <div className="alert-thumb">
                    {v.image_url ? (
                      <>
                        <img 
                          src={v.image_url} 
                          alt="Evidence" 
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fb = e.currentTarget.parentElement?.querySelector('.no-img-fallback');
                            if (fb) (fb as HTMLElement).style.display = 'flex';
                          }}
                        />
                        <div className="no-img no-img-fallback" style={{ display: 'none' }}>
                          <Camera size={20} />
                        </div>
                      </>
                    ) : (
                      <div className="no-img"><Camera size={20} /></div>
                    )}
                  </div>
                  <div className="alert-info">
                    <span className="alert-type">{v.type}</span>
                    <span className="alert-plate">{v.vehicle_number}</span>
                    <span className="alert-meta">
                      {v.location} &bull; {new Date(v.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  {canUseDistrictFeatures && (
                    <button
                      className="btn-review"
                      onClick={() => navigate('/violations')}
                    >
                      <Eye size={14} /> Review
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Analytics */}
        <div className="dash-card stats-card">
          <div className="card-header">
            <h3><TrendingUp size={18} /> Violation Breakdown</h3>
          </div>
          <div className="type-breakdown">
            <div className="type-row active-row">
              <span className="type-label">No Helmet</span>
              <div className="type-bar-container">
                <div
                  className="type-bar"
                  style={{
                    width: `${Math.min((noHelmetCount / Math.max(todayCount, 1)) * 100, 100)}%`,
                  }}
                />
              </div>
              <span className="type-count">{noHelmetCount}</span>
            </div>

            <div className="type-row coming-soon-row">
              <span className="type-label disabled-label">Triple Riding</span>
              <span className="coming-soon-badge">Coming Soon</span>
            </div>

            <div className="type-row coming-soon-row">
              <span className="type-label disabled-label">Red Light Jump</span>
              <span className="coming-soon-badge">Coming Soon</span>
            </div>

            <div className="type-row coming-soon-row">
              <span className="type-label disabled-label">Over Speeding</span>
              <span className="coming-soon-badge">Coming Soon</span>
            </div>

            <div className="type-row coming-soon-row">
              <span className="type-label disabled-label">No Seatbelt</span>
              <span className="coming-soon-badge">Coming Soon</span>
            </div>
          </div>
        </div>

        {/* Camera Status */}
        <div className="dash-card camera-card">
          <div className="card-header">
            <h3><Camera size={18} /> Camera Status</h3>
            {canUseDistrictFeatures && (
              <button className="link-btn" onClick={() => navigate('/cameras')}>
                Details
              </button>
            )}
          </div>
          <div className="camera-summary">
            <div className="cam-stat online-premium">
              <span className="cam-num-premium">{canUseDistrictFeatures ? (cameraStatus?.online ?? 0) : visibleOnline}</span>
              <span className="cam-label-premium">Online</span>
            </div>
            <div className="cam-stat offline-premium">
              <span className="cam-num-premium">{canUseDistrictFeatures ? (cameraStatus?.offline ?? 0) : visibleOffline}</span>
              <span className="cam-label-premium">Offline</span>
            </div>
          </div>
          <div className="camera-list-premium">
            {visibleCameras.slice(0, 5).map((cam) => (
              <div key={cam.id} className="cam-row-premium">
                <div className="cam-status-indicator">
                  <span className={`cam-pulse-dot ${cam.status}`}></span>
                </div>
                <div className="cam-details-premium">
                  <span className="cam-name-premium">{cam.location}</span>
                  <span className="cam-id-premium">{cam.camera_id}</span>
                </div>
                <span className={`cam-badge-premium ${cam.status}`}>{cam.status.toUpperCase()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

interface WidgetProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: string;
}

const WidgetCard = ({ icon, label, value, sub, color }: WidgetProps) => (
  <div className={`widget-card ${color}`}>
    <div className="widget-header">
      <span className="widget-label">{label}</span>
      <div className="widget-icon">{icon}</div>
    </div>
    <div className="widget-body">
      <span className="widget-value">{value}</span>
      <span className="widget-sub">{sub}</span>
    </div>
  </div>
);

export default Dashboard;
