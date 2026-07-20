import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';
import {
  ShieldCheck, Filter, RefreshCw, LogIn, LogOut,
  Eye, Trash2, FileEdit, Download, ChevronLeft, ChevronRight,
  User, Activity,
} from 'lucide-react';
import './AuditLog.css';

interface AuditEntry {
  id: string;
  action: string;
  module: string | null;
  entity: string | null;
  entity_id: string | null;
  ip_address: string | null;
  new_data: any;
  created_at: string;
  username: string | null;
  full_name: string | null;
  role_code: string | null;
  subdivision_name: string | null;
}

interface AuditResponse {
  data: AuditEntry[];
  total: number;
  page: number;
  totalPages: number;
}

const SUBDIVISIONS = ['Nagercoil', 'Kanyakumari', 'Marthandam', 'Colachel', 'Thuckalay'];

function getActionClass(action: string): string {
  const a = action?.toLowerCase() ?? '';
  if (a.includes('login')) return 'login';
  if (a.includes('logout')) return 'logout';
  if (a.includes('create') || a.includes('add')) return 'create';
  if (a.includes('update') || a.includes('edit') || a.includes('change') || a.includes('password')) return 'update';
  if (a.includes('delete') || a.includes('remove')) return 'delete';
  if (a.includes('approve') || a.includes('review')) return 'approve';
  if (a.includes('reject')) return 'reject';
  if (a.includes('view') || a.includes('export')) return 'export';
  return 'system';
}

function getActionIcon(action: string) {
  const a = action?.toLowerCase() ?? '';
  const size = 11;
  if (a.includes('login')) return <LogIn size={size} />;
  if (a.includes('logout')) return <LogOut size={size} />;
  if (a.includes('delete') || a.includes('remove')) return <Trash2 size={size} />;
  if (a.includes('create') || a.includes('add')) return <FileEdit size={size} />;
  if (a.includes('export') || a.includes('view')) return <Download size={size} />;
  if (a.includes('update') || a.includes('edit') || a.includes('change')) return <FileEdit size={size} />;
  return <Activity size={size} />;
}

function formatAction(action: string) {
  return action?.replace(/_/g, ' ') ?? '—';
}

function formatDateTime(dt: string) {
  const d = new Date(dt);
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: true,
  });
}

const LIMIT = 25;

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [actions, setActions] = useState<string[]>([]);

  // Filter state
  const [filters, setFilters] = useState({
    action: '',
    subdivision: '',
    dateFrom: '',
    dateTo: '',
    username: '',
  });
  const [applied, setApplied] = useState(filters);

  const fetchLogs = useCallback(async (p: number, f: typeof filters) => {
    setLoading(true);
    try {
      const params: any = { page: p, limit: LIMIT };
      if (f.action) params.action = f.action;
      if (f.subdivision) params.subdivision = f.subdivision;
      if (f.dateFrom) params.dateFrom = f.dateFrom;
      if (f.dateTo) params.dateTo = f.dateTo;
      if (f.username) params.username = f.username;

      const res = await axios.get<AuditResponse>(`${API_BASE}/audit-logs`, { params });
      setLogs(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages || 1);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(page, applied);
  }, [page, applied, fetchLogs]);

  useEffect(() => {
    axios.get<string[]>(`${API_BASE}/audit-logs/actions`).then((r) => setActions(r.data)).catch(() => {});
  }, []);

  const handleApply = () => {
    setPage(1);
    setApplied({ ...filters });
  };

  const handleReset = () => {
    const empty = { action: '', subdivision: '', dateFrom: '', dateTo: '', username: '' };
    setFilters(empty);
    setPage(1);
    setApplied(empty);
  };

  // Stats
  const loginCount = logs.filter((l) => l.action?.toLowerCase().includes('login')).length;
  const logoutCount = logs.filter((l) => l.action?.toLowerCase().includes('logout')).length;
  const mutationCount = logs.filter((l) => {
    const a = l.action?.toLowerCase() ?? '';
    return a.includes('create') || a.includes('update') || a.includes('delete') || a.includes('approve') || a.includes('reject');
  }).length;

  // Pagination range
  const pageRange = () => {
    const range: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let i = start; i <= end; i++) range.push(i);
    return range;
  };

  const handleDownloadCSV = async () => {
    try {
      const params: any = { page: 1, limit: 10000, ...applied };
      const res = await axios.get(`${API_BASE}/system/audit-logs`, { params });
      const logs = res.data.data;
      
      let csv = 'Date & Time,User,Role,Subdivision,Action,IP Address\n';
      logs.forEach((log: any) => {
        csv += `"${new Date(log.createdAt).toLocaleString()}","${log.user?.username || 'System'}","${(log.user?.role?.roleCode || '').replace(/_/g, ' ')}","${log.user?.subdivision?.subdivisionName || '-'}","${log.action}","${log.ipAddress || '-'}"\n`;
      });
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      alert('Failed to download logs');
    }
  };

  return (
    <div className="audit-log-page">
      {/* Header */}
      <div className="audit-header">
        <div className="audit-header-icon">
          <ShieldCheck size={24} />
        </div>
        <div className="audit-header-text">
          <h1>Master Audit Log</h1>
          <p>Complete immutable record of all actions taken across the Kaaval AI platform — visible only to Super Admin</p>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="audit-stats-bar">
        <div className="audit-stat-card">
          <span className="audit-stat-label">Total Records</span>
          <span className="audit-stat-value">{total.toLocaleString()}</span>
          <span className="audit-stat-sub">All-time entries</span>
        </div>
        <div className="audit-stat-card">
          <span className="audit-stat-label">Logins (page)</span>
          <span className="audit-stat-value" style={{ color: '#22c55e' }}>{loginCount}</span>
          <span className="audit-stat-sub">Current page</span>
        </div>
        <div className="audit-stat-card">
          <span className="audit-stat-label">Logouts (page)</span>
          <span className="audit-stat-value" style={{ color: '#ef4444' }}>{logoutCount}</span>
          <span className="audit-stat-sub">Current page</span>
        </div>
        <div className="audit-stat-card">
          <span className="audit-stat-label">Data Changes</span>
          <span className="audit-stat-value" style={{ color: '#f59e0b' }}>{mutationCount}</span>
          <span className="audit-stat-sub">Creates / updates / deletes</span>
        </div>
        <div className="audit-stat-card">
          <span className="audit-stat-label">Page</span>
          <span className="audit-stat-value">{page} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 400 }}>/ {totalPages}</span></span>
          <span className="audit-stat-sub">{LIMIT} per page</span>
        </div>
      </div>

      {/* Filters */}
      <div className="audit-filters">
        <div className="audit-filter-group">
          <label>Search Username</label>
          <input
            id="audit-filter-username"
            type="text"
            placeholder="e.g. sp_officer"
            value={filters.username}
            onChange={(e) => setFilters((f) => ({ ...f, username: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && handleApply()}
          />
        </div>

        <div className="audit-filter-group">
          <label>Action Type</label>
          <select
            id="audit-filter-action"
            value={filters.action}
            onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
          >
            <option value="">All Actions</option>
            {actions.map((a) => (
              <option key={a} value={a}>{formatAction(a)}</option>
            ))}
          </select>
        </div>

        <div className="audit-filter-group">
          <label>Subdivision</label>
          <select
            id="audit-filter-subdivision"
            value={filters.subdivision}
            onChange={(e) => setFilters((f) => ({ ...f, subdivision: e.target.value }))}
          >
            <option value="">All Subdivisions</option>
            {SUBDIVISIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="audit-filter-group">
          <label>From Date</label>
          <input
            id="audit-filter-from"
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
          />
        </div>

        <div className="audit-filter-group">
          <label>To Date</label>
          <input
            id="audit-filter-to"
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
          />
        </div>

        <div className="audit-filter-actions">
          <button id="audit-apply-btn" className="btn-apply" onClick={handleApply}>
            <Filter size={14} /> Apply
          </button>
          <button id="audit-reset-btn" className="btn-reset" onClick={handleReset}>
            Reset
          </button>
          <button
            id="audit-refresh-btn"
            className="btn-reset"
            onClick={() => fetchLogs(page, applied)}
            title="Refresh"
            style={{ width: 38, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <RefreshCw size={15} />
          </button>
          <button
            id="audit-download-btn"
            className="btn-reset"
            onClick={handleDownloadCSV}
            title="Download CSV"
            style={{ width: 38, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '5px' }}
          >
            <Download size={15} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="audit-table-wrap">
        <div className="audit-table-header">
          <span className="audit-table-title">
            <Activity size={16} />
            Activity Log
            <span className="audit-total-badge">{total.toLocaleString()} records</span>
          </span>
        </div>

        {loading ? (
          <div className="audit-loading">
            <div className="spinner" />
            Loading logs…
          </div>
        ) : logs.length === 0 ? (
          <div className="audit-empty">
            <ShieldCheck size={48} className="audit-empty-icon" />
            <span>No audit logs found for the selected filters.</span>
          </div>
        ) : (
          <div className="audit-table-scroll">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>User</th>
                  <th>Role</th>
                  <th>Subdivision</th>
                  <th>Action</th>
                  <th>IP Address</th>
                  <th>Date &amp; Time</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, idx) => (
                  <tr key={log.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {(page - 1) * LIMIT + idx + 1}
                    </td>
                    <td>
                      {log.username ? (
                        <div className="audit-user-cell">
                          <span className="audit-username">
                            <User size={11} style={{ marginRight: 4, opacity: 0.6 }} />
                            {log.username}
                          </span>
                          {log.full_name && (
                            <span className="audit-fullname">{log.full_name}</span>
                          )}
                        </div>
                      ) : (
                        <span className="audit-system-label">System</span>
                      )}
                    </td>
                    <td>
                      {log.role_code ? (
                        <span className="role-badge">{log.role_code.replace(/_/g, ' ')}</span>
                      ) : '—'}
                    </td>
                    <td>
                      {log.subdivision_name ? (
                        <span className="subdivision-pill">{log.subdivision_name}</span>
                      ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td>
                      <span className={`action-badge ${getActionClass(log.action)}`}>
                        {getActionIcon(log.action)}
                        {formatAction(log.action)}
                      </span>
                    </td>
                    <td>
                      <span className="ip-text">{log.ip_address ?? '—'}</span>
                    </td>
                    <td>
                      <span className="datetime-text">{formatDateTime(log.created_at)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="audit-pagination">
            <span className="pagination-info">
              Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total.toLocaleString()} entries
            </span>
            <div className="pagination-controls">
              <button
                className="page-btn"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft size={14} />
              </button>
              {pageRange().map((p) => (
                <button
                  key={p}
                  className={`page-btn ${p === page ? 'active' : ''}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className="page-btn"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
