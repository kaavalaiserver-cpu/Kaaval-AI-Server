import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';
import type { LogEntry } from '../types';
import {
  ScrollText,
  RefreshCw,
  Filter,
  AlertTriangle,
  Info,
  AlertCircle,
  Bug,
} from 'lucide-react';
import './SystemLogs.css';

const SystemLogs = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState('');
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(async (background = false) => {
    if (!background) setLoading(true);
    try {
      const params: Record<string, string | number> = { limit: 50, page };
      if (level) params.level = level;
      const res = await axios.get(`${API_BASE}/system/logs`, { params });
      const data = res.data.data ?? res.data;
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      if (!background) setLoading(false);
    }
  }, [level, page]);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(() => fetchLogs(true), 1000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  const levelIcon = (l: string) => {
    switch (l.toLowerCase()) {
      case 'error': return <AlertCircle size={14} />;
      case 'warn':
      case 'warning': return <AlertTriangle size={14} />;
      case 'debug': return <Bug size={14} />;
      default: return <Info size={14} />;
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

  return (
    <div className="logs-page">
      <div className="logs-header">
        <h2><ScrollText size={22} /> System Logs</h2>
        <div className="logs-controls">
          <div className="logs-filter">
            <Filter size={14} />
            <select value={level} onChange={(e) => { setLevel(e.target.value); setPage(1); }}>
              <option value="">All Levels</option>
              <option value="info">Info</option>
              <option value="warn">Warning</option>
              <option value="error">Error</option>
              <option value="debug">Debug</option>
            </select>
          </div>
          <button className="btn-secondary" onClick={fetchLogs}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      <div className="logs-table-wrap">
        <table className="logs-table">
          <thead>
            <tr>
              <th>Level</th>
              <th>Timestamp</th>
              <th>Source</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="logs-loading">Loading logs...</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="logs-loading">No logs found</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className={`log-row ${levelClass(log.level)}`}>
                  <td>
                    <span className={`level-badge ${levelClass(log.level)}`}>
                      {levelIcon(log.level)} {log.level.toUpperCase()}
                    </span>
                  </td>
                  <td className="log-time">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="log-source">{log.source ?? '—'}</td>
                  <td className="log-message">{log.message}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="logs-pagination">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
        <span>Page {page}</span>
        <button disabled={logs.length < 50} onClick={() => setPage(page + 1)}>Next</button>
      </div>
    </div>
  );
};

export default SystemLogs;
