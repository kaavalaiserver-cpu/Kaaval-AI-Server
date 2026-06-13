import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';
import type { LogEntry } from '../types';
import {
  FileTerminal,
  RefreshCw,
  Filter,
  AlertTriangle,
  Info,
  AlertCircle,
  Bug,
  Search,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Maximize2,
} from 'lucide-react';
import './SystemLogs.css';

interface LogStats {
  total: number;
  error: number;
  warn: number;
  info: number;
  debug: number;
}

const SystemLogs = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [level, setLevel] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [stats, setStats] = useState<LogStats>({ total: 0, error: 0, warn: 0, info: 0, debug: 0 });

  // Debounce search query to avoid spamming requests
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchLogs = useCallback(async (isBackground = false) => {
    if (!isBackground) {
      if (logs.length === 0) setLoading(true);
      else setRefreshing(true);
    }
    try {
      const params: Record<string, string | number> = { limit: 50, page };
      if (level) params.level = level;
      if (debouncedSearch) params.search = debouncedSearch;

      const res = await axios.get(`${API_BASE}/system/logs`, { params });
      const logsData = res.data.data ?? res.data;
      setLogs(Array.isArray(logsData) ? logsData : []);
      setTotalLogs(res.data.total ?? 0);

      if (res.data.stats) {
        setStats(res.data.stats);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [level, page, debouncedSearch]);

  // Initial fetch and auto-refresh polling
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchLogs(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchLogs, autoRefresh]);

  const handleClearLogs = async () => {
    if (!window.confirm('Are you sure you want to permanently clear all logs? This action cannot be undone.')) {
      return;
    }
    try {
      await axios.delete(`${API_BASE}/system/logs`);
      setLogs([]);
      setTotalLogs(0);
      setStats({ total: 0, error: 0, warn: 0, info: 0, debug: 0 });
      alert('System logs successfully cleared.');
    } catch (err) {
      console.error(err);
      alert('Failed to clear logs.');
    }
  };

  const handleExportCSV = () => {
    if (logs.length === 0) return;
    const headers = ['ID', 'Level', 'Timestamp', 'Source', 'Message'];
    const rows = logs.map(l => [
      l.id,
      l.level.toUpperCase(),
      new Date(l.timestamp).toISOString(),
      l.source ?? '',
      l.message.replace(/"/g, '""')
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `kaaval_system_logs_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const levelIcon = (l: string) => {
    switch (l.toLowerCase()) {
      case 'error': return <AlertCircle size={13} />;
      case 'warn':
      case 'warning': return <AlertTriangle size={13} />;
      case 'debug': return <Bug size={13} />;
      default: return <Info size={13} />;
    }
  };

  const levelClass = (l: string) => {
    switch (l.toLowerCase()) {
      case 'error': return 'error';
      case 'warn':
      case 'warning': return 'warn';
      case 'debug': return 'debug';
      default: return 'info';
    }
  };

  const totalPages = Math.max(Math.ceil(totalLogs / 50), 1);

  return (
    <div className="logs-page">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="logs-header">
        <div className="logs-header-left">
          <div className="logs-title-icon"><FileTerminal size={20} /></div>
          <div>
            <h2>System Logs</h2>
            <p className="logs-subtitle">Real-time application audit trail and telemetry</p>
          </div>
        </div>

        <div className="logs-header-actions">
          <button 
            className={`btn-auto-refresh ${autoRefresh ? 'active' : ''}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
            title={autoRefresh ? 'Pause Auto-refresh' : 'Resume Auto-refresh'}
          >
            {autoRefresh ? <Pause size={14} /> : <Play size={14} />}
            <span>{autoRefresh ? 'Live Streaming' : 'Paused'}</span>
            {autoRefresh && <span className="live-dot" />}
          </button>
          
          <button className="btn-secondary-logs" onClick={handleExportCSV} disabled={logs.length === 0}>
            <Download size={14} /> Export CSV
          </button>

          <button className="btn-danger-logs" onClick={handleClearLogs}>
            <Trash2 size={14} /> Clear Logs
          </button>

          <button className="btn-refresh-logs" onClick={() => fetchLogs()} disabled={refreshing}>
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ── Stats Overview ─────────────────────────────────── */}
      <div className="logs-stats-row">
        <div className="log-stat-card total">
          <span className="log-stat-count">{stats.total.toLocaleString()}</span>
          <span className="log-stat-label">Total Logs</span>
        </div>
        <div className="log-stat-card error">
          <span className="log-stat-count">{stats.error.toLocaleString()}</span>
          <span className="log-stat-label">Errors</span>
        </div>
        <div className="log-stat-card warn">
          <span className="log-stat-count">{stats.warn.toLocaleString()}</span>
          <span className="log-stat-label">Warnings</span>
        </div>
        <div className="log-stat-card info">
          <span className="log-stat-count">{stats.info.toLocaleString()}</span>
          <span className="log-stat-label">Information</span>
        </div>
        <div className="log-stat-card debug">
          <span className="log-stat-count">{stats.debug.toLocaleString()}</span>
          <span className="log-stat-label">Debug Logs</span>
        </div>
      </div>

      {/* ── Filter & Search controls ────────────────────────── */}
      <div className="logs-search-bar">
        <div className="search-input-wrap">
          <Search size={15} />
          <input 
            type="text" 
            placeholder="Search by source module or message content..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && <button className="clear-search" onClick={() => setSearch('')}>×</button>}
        </div>

        <div className="filter-dropdown-wrap">
          <Filter size={14} />
          <select value={level} onChange={(e) => { setLevel(e.target.value); setPage(1); }}>
            <option value="">All Log Levels</option>
            <option value="info">Info</option>
            <option value="warn">Warning</option>
            <option value="error">Error</option>
            <option value="debug">Debug</option>
          </select>
        </div>
      </div>

      {/* ── Logs Display ───────────────────────────────────── */}
      <div className="logs-table-wrap">
        <table className="logs-table">
          <thead>
            <tr>
              <th style={{ width: '130px' }}>Level</th>
              <th style={{ width: '190px' }}>Timestamp</th>
              <th style={{ width: '170px' }}>Source Module</th>
              <th>Message</th>
              <th style={{ width: '40px' }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i} className="logs-row-skeleton">
                  <td colSpan={5}><div className="skeleton-bar" /></td>
                </tr>
              ))
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="logs-empty-state">
                  <AlertCircle size={28} />
                  <p>No matching system logs found.</p>
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                const className = levelClass(log.level);
                return (
                  <>
                    <tr 
                      key={log.id} 
                      className={`log-row-item ${className} ${isExpanded ? 'row-active' : ''}`}
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    >
                      <td>
                        <span className={`level-badge ${className}`}>
                          {levelIcon(log.level)} {log.level.toUpperCase()}
                        </span>
                      </td>
                      <td className="log-time-cell">
                        {new Date(log.timestamp).toLocaleDateString('en-IN', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit', second: '2-digit'
                        })}
                      </td>
                      <td className="log-source-cell">
                        <code>{log.source ?? 'System'}</code>
                      </td>
                      <td className="log-msg-cell">
                        <div className="log-msg-truncate">{log.message}</div>
                      </td>
                      <td className="log-action-cell">
                        <Maximize2 size={12} className={`expand-icon ${isExpanded ? 'rotated' : ''}`} />
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${log.id}-expanded`} className={`log-expanded-row ${className}`}>
                        <td colSpan={5}>
                          <div className="log-detail-box">
                            <div className="log-detail-header">
                              <span>SOURCE: <code>{log.source ?? 'System'}</code></span>
                              <span>LEVEL: <span className={`level-badge ${className}`}>{log.level.toUpperCase()}</span></span>
                              <span>TIME: <code>{new Date(log.timestamp).toISOString()}</code></span>
                            </div>
                            <pre className="log-detail-body">{log.message}</pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ─────────────────────────────────────── */}
      <div className="logs-footer-pagination">
        <div className="pagination-info">
          Showing <strong>{logs.length}</strong> of <strong>{totalLogs.toLocaleString()}</strong> log entries
        </div>
        <div className="pagination-buttons">
          <button 
            disabled={page <= 1} 
            onClick={() => setPage(page - 1)}
            title="Previous Page"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="pagination-current">
            Page <strong>{page}</strong> of <strong>{totalPages}</strong>
          </span>
          <button 
            disabled={page >= totalPages} 
            onClick={() => setPage(page + 1)}
            title="Next Page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SystemLogs;
