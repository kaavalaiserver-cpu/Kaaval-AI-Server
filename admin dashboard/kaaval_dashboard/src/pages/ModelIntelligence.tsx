import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';
import { useAuth } from '../context/AuthContext';
import {
  Brain,
  Users,
  Download,
  Plus,
  RefreshCw,
  Sun,
  Camera,
  MapPin,
  CheckCircle,
  XCircle,
  AlertTriangle,
  PhoneCall,
  Sparkles,
} from 'lucide-react';
import './ModelIntelligence.css';

interface AnalyticsData {
  totalEvaluations: number;
  overallAccuracy: number;
  ocrMetrics: {
    total: number;
    exactMatchRate: number;
    incorrectRate: number;
    unreadableRate: number;
  };
  lightingAnalysis: Array<{
    condition: string;
    reviewed: number;
    incorrect: number;
    errorRate: number;
  }>;
  cameraPerformance: Array<{
    cameraCode: string;
    cameraName: string;
    totalReviewed: number;
    errorRate: number;
    ocrMatchRate: number;
  }>;
  stateAnalysis: Array<{
    state: string;
    total: number;
    correct: number;
    accuracy: number;
  }>;
  failureReasons: Array<{
    reason: string;
    count: number;
  }>;
  phoneUseSummary: {
    confirmed: number;
    possible: number;
  };
}

interface InternUser {
  userId: string;
  username: string;
  fullName: string;
  isActive: boolean;
  totalReviewed: number;
  avgDurationSeconds: number;
  ocrCorrections: number;
  flaggedFailures: number;
  phoneTags: number;
}

export default function ModelIntelligence() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'analytics' | 'interns' | 'export'>('analytics');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [interns, setInterns] = useState<InternUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal for creating intern
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPassword, setNewPassword] = useState('Intern@123');
  const [creating, setCreating] = useState(false);

  // Check if system developer
  const isDeveloper = user?.role === 'developer' || user?.role === 'super_admin';

  const loadAnalytics = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/model-evaluations/analytics`);
      setAnalytics(res.data);
    } catch (e) {
      console.error('Failed to load analytics', e);
    }
  }, []);

  const loadInterns = useCallback(async () => {
    if (!isDeveloper) return;
    try {
      const res = await axios.get(`${API_BASE}/model-evaluations/interns`);
      setInterns(res.data);
    } catch (e) {
      console.error('Failed to load interns', e);
    }
  }, [isDeveloper]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadAnalytics(), loadInterns()]).finally(() => setLoading(false));
  }, [loadAnalytics, loadInterns]);

  const handleCreateIntern = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newFullName.trim()) return;
    setCreating(true);
    try {
      await axios.post(`${API_BASE}/model-evaluations/interns`, {
        username: newUsername.trim(),
        fullName: newFullName.trim(),
        password: newPassword,
      });
      alert(`Intern account '${newUsername}' created successfully!`);
      setIsModalOpen(false);
      setNewUsername('');
      setNewFullName('');
      loadInterns();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create intern account');
    } finally {
      setCreating(false);
    }
  };

  const [exporting, setExporting] = useState(false);

  const handleDownloadDataset = async (format: 'json' | 'csv') => {
    setExporting(true);
    try {
      const res = await axios.get(`${API_BASE}/model-evaluations/export?format=${format}`, {
        responseType: 'blob',
      });
      const mimeType = format === 'csv' ? 'text/csv' : 'application/json';
      const blob = new Blob([res.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kaaval_model_evaluations_${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.parentNode?.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to download dataset: ' + (err.response?.data?.message || err.message));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="model-intel-container">
      {/* Header */}
      <header className="model-intel-header">
        <div className="model-intel-title">
          <h1>
            <Brain size={26} color="#38bdf8" />
            <span>KAAVAL AI</span>
            <span style={{ color: '#38bdf8' }}>Model Intelligence & Evaluation</span>
          </h1>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
            Continuous model diagnostics, intern review productivity, and retraining dataset generation
          </p>
        </div>

        <div className="model-intel-actions">
          <button className="intel-btn" onClick={() => { loadAnalytics(); loadInterns(); }}>
            <RefreshCw size={14} /> Refresh
          </button>
          {isDeveloper && (
            <button className="intel-btn primary" onClick={() => setIsModalOpen(true)}>
              <Plus size={14} /> Create Intern Login
            </button>
          )}
        </div>
      </header>

      {/* Tabs */}
      <nav className="intel-tabs">
        <button
          className={`intel-tab-btn ${tab === 'analytics' ? 'active' : ''}`}
          onClick={() => setTab('analytics')}
        >
          <Brain size={16} /> Model Failure Analytics
        </button>

        {isDeveloper && (
          <button
            className={`intel-tab-btn ${tab === 'interns' ? 'active' : ''}`}
            onClick={() => setTab('interns')}
          >
            <Users size={16} /> Intern Productivity & Management
          </button>
        )}

        <button
          className={`intel-tab-btn ${tab === 'export' ? 'active' : ''}`}
          onClick={() => setTab('export')}
        >
          <Download size={16} /> Retraining Dataset Export
        </button>
      </nav>

      {/* Tab 1: Model Failure Analytics */}
      {tab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top KPI Grid */}
          <div className="intel-metrics-grid">
            <div className="intel-card">
              <span className="intel-card-label">Verified Image Evaluations</span>
              <span className="intel-card-val" style={{ color: '#38bdf8' }}>
                {analytics?.totalEvaluations || 0}
              </span>
              <span className="intel-card-sub">Human-verified ground truth samples</span>
            </div>

            <div className="intel-card">
              <span className="intel-card-label">Overall Detection Accuracy</span>
              <span className="intel-card-val" style={{ color: '#10b981' }}>
                {analytics?.overallAccuracy || 0}%
              </span>
              <span className="intel-card-sub">Helmet & violation classification</span>
            </div>

            <div className="intel-card">
              <span className="intel-card-label">OCR Exact-Match Rate</span>
              <span className="intel-card-val" style={{ color: '#f59e0b' }}>
                {analytics?.ocrMetrics.exactMatchRate || 0}%
              </span>
              <span className="intel-card-sub">
                Incorrect: {analytics?.ocrMetrics.incorrectRate || 0}% | Unreadable: {analytics?.ocrMetrics.unreadableRate || 0}%
              </span>
            </div>

            <div className="intel-card">
              <span className="intel-card-label">Phone-Use Discoveries</span>
              <span className="intel-card-val" style={{ color: '#fb7185' }}>
                {analytics?.phoneUseSummary.confirmed || 0}
              </span>
              <span className="intel-card-sub">
                Confirmed cases (+{analytics?.phoneUseSummary.possible || 0} possible)
              </span>
            </div>
          </div>

          {/* Section: Lighting Condition Breakdown */}
          <div className="intel-table-wrap">
            <div className="intel-table-header">
              <h3>
                <Sun size={16} style={{ display: 'inline', marginRight: '6px' }} />
                Lighting Condition Failure Analysis
              </h3>
            </div>
            <table className="intel-table">
              <thead>
                <tr>
                  <th>Lighting Condition</th>
                  <th>Evaluations</th>
                  <th>Model Errors</th>
                  <th>Error Rate</th>
                  <th>Diagnostic Verdict</th>
                </tr>
              </thead>
              <tbody>
                {analytics?.lightingAnalysis && analytics.lightingAnalysis.length > 0 ? (
                  analytics.lightingAnalysis.map(l => (
                    <tr key={l.condition}>
                      <td><strong>{l.condition}</strong></td>
                      <td>{l.reviewed}</td>
                      <td>{l.incorrect}</td>
                      <td>
                        <span className={`rate-badge ${l.errorRate <= 10 ? 'good' : l.errorRate <= 25 ? 'warn' : 'bad'}`}>
                          {l.errorRate}%
                        </span>
                      </td>
                      <td style={{ color: '#94a3b8' }}>
                        {l.errorRate > 20
                          ? 'Needs dataset augmentation & night tuning'
                          : 'Within acceptable baseline'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: '#64748b' }}>No lighting evaluation data yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Section: Camera-Wise Diagnostic Table */}
          <div className="intel-table-wrap">
            <div className="intel-table-header">
              <h3>
                <Camera size={16} style={{ display: 'inline', marginRight: '6px' }} />
                Camera & Location Performance Breakdown
              </h3>
            </div>
            <table className="intel-table">
              <thead>
                <tr>
                  <th>Camera Code</th>
                  <th>Location Name</th>
                  <th>Reviewed Images</th>
                  <th>Violation Error Rate</th>
                  <th>OCR Match Rate</th>
                  <th>Primary Issue Observed</th>
                </tr>
              </thead>
              <tbody>
                {analytics?.cameraPerformance && analytics.cameraPerformance.length > 0 ? (
                  analytics.cameraPerformance.map(c => (
                    <tr key={c.cameraCode}>
                      <td><strong>{c.cameraCode}</strong></td>
                      <td>{c.cameraName}</td>
                      <td>{c.totalReviewed}</td>
                      <td>
                        <span className={`rate-badge ${c.errorRate <= 10 ? 'good' : 'bad'}`}>
                          {c.errorRate}%
                        </span>
                      </td>
                      <td>
                        <span className={`rate-badge ${c.ocrMatchRate >= 80 ? 'good' : 'warn'}`}>
                          {c.ocrMatchRate}%
                        </span>
                      </td>
                      <td style={{ color: '#94a3b8' }}>
                        {c.errorRate > 15 ? 'Oblique angle / occlusion' : c.ocrMatchRate < 70 ? 'Low plate resolution' : 'Optimal'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: '#64748b' }}>No camera evaluation records yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Section: Registration State Analysis */}
          <div className="intel-table-wrap">
            <div className="intel-table-header">
              <h3>
                <MapPin size={16} style={{ display: 'inline', marginRight: '6px' }} />
                Registration Plate State Performance
              </h3>
            </div>
            <table className="intel-table">
              <thead>
                <tr>
                  <th>State / Region</th>
                  <th>Total Plates</th>
                  <th>Exact Matches</th>
                  <th>OCR Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {analytics?.stateAnalysis && analytics.stateAnalysis.length > 0 ? (
                  analytics.stateAnalysis.map(s => (
                    <tr key={s.state}>
                      <td><strong>{s.state}</strong></td>
                      <td>{s.total}</td>
                      <td>{s.correct}</td>
                      <td>
                        <span className={`rate-badge ${s.accuracy >= 85 ? 'good' : 'warn'}`}>
                          {s.accuracy}%
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: '#64748b' }}>No state OCR data yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Intern Productivity & Management */}
      {tab === 'interns' && isDeveloper && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="intel-table-wrap">
            <div className="intel-table-header">
              <h3>Intern Productivity & Review Performance</h3>
              <button className="intel-btn primary" onClick={() => setIsModalOpen(true)}>
                <Plus size={14} /> Add New Intern
              </button>
            </div>

            <table className="intel-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Full Name</th>
                  <th>Total Reviewed</th>
                  <th>Avg Review Speed</th>
                  <th>OCR Corrections</th>
                  <th>Model Failure Flags</th>
                  <th>Phone Tags</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {interns.length > 0 ? (
                  interns.map(i => (
                    <tr key={i.userId}>
                      <td><strong>{i.username}</strong></td>
                      <td>{i.fullName}</td>
                      <td>{i.totalReviewed}</td>
                      <td>
                        <span style={{ color: i.avgDurationSeconds <= 10 ? '#34d399' : '#f59e0b', fontWeight: 600 }}>
                          {i.avgDurationSeconds > 0 ? `${i.avgDurationSeconds}s` : '—'}
                        </span>
                      </td>
                      <td>{i.ocrCorrections}</td>
                      <td>{i.flaggedFailures}</td>
                      <td>{i.phoneTags}</td>
                      <td>
                        <span className={`rate-badge ${i.isActive ? 'good' : 'bad'}`}>
                          {i.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', color: '#64748b', padding: '24px' }}>
                      No intern activity recorded yet. Click &quot;Add New Intern&quot; to create the first intern reviewer account.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Dataset Export */}
      {tab === 'export' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px' }}>
          <div className="intel-card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem' }}>Export Cleaned Ground-Truth Dataset</h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6 }}>
              Export all human-verified model evaluations for retraining vehicle detection, helmet classification,
              triple riding counts, and Indian registration plate OCR models from scratch.
            </p>

            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button className="intel-btn success" onClick={() => handleDownloadDataset('json')}>
                <Download size={16} /> Export as Structured JSON (Full Annotations)
              </button>
              <button className="intel-btn" onClick={() => handleDownloadDataset('csv')}>
                <Download size={16} /> Export as CSV (Tabular Ground Truth)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Intern Modal */}
      {isModalOpen && (
        <div className="intel-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="intel-modal" onClick={e => e.stopPropagation()}>
            <h2>Create New Intern Reviewer</h2>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
              Intern accounts are restricted solely to the Model Review Studio queue and cannot issue or delete violations.
            </p>

            <form onSubmit={handleCreateIntern} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-field">
                <label>Username (e.g., intern_02)</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  placeholder="intern_02"
                  required
                />
              </div>

              <div className="form-field">
                <label>Full Name</label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={e => setNewFullName(e.target.value)}
                  placeholder="K. Arun (Intern)"
                  required
                />
              </div>

              <div className="form-field">
                <label>Password</label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Intern@123"
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="intel-btn" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="intel-btn primary" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Intern Login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
