import { useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';
import type { ViolationItem } from '../types';
import {
  Archive,
  Search,
  Download,
  Eye,
  Calendar,
  Filter,
} from 'lucide-react';
import './EvidenceArchive.css';

const EvidenceArchive = () => {
  const [results, setResults] = useState<ViolationItem[]>([]);
  const [query, setQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query && !dateFrom) return;
    setLoading(true);
    setSearched(true);
    try {
      const params: Record<string, string> = {};
      if (query) params.query = query;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const res = await axios.get(`${API_BASE}/search`, { params });
      const data = res.data.data ?? res.data;
      setResults(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (results.length === 0) return;
    const headers = ['ID', 'Vehicle', 'Type', 'Camera', 'Location', 'Time', 'Status', 'Confidence'];
    const rows = results.map((r) => [
      r.id,
      r.vehicle_number,
      r.type,
      r.camera_id,
      r.location,
      r.timestamp,
      r.status,
      Math.round((r.confidence || 0) * 100) + '%',
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evidence_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="archive-page">
      <div className="archive-header">
        <h2><Archive size={22} /> Evidence Archive</h2>
        {results.length > 0 && (
          <button className="btn-secondary" onClick={exportCSV}>
            <Download size={16} /> Export CSV
          </button>
        )}
      </div>

      {/* Search Form */}
      <div className="archive-search">
        <div className="search-row">
          <div className="search-field main">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search by vehicle number, camera ID, or violation type..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <div className="search-field">
            <Calendar size={16} />
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="search-field">
            <Calendar size={16} />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <button className="btn-primary" onClick={handleSearch} disabled={loading}>
            <Filter size={16} /> Search
          </button>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="archive-status">Searching...</div>
      ) : !searched ? (
        <div className="archive-status">
          <Archive size={40} />
          <p>Search the evidence archive by vehicle number, camera, or date range.</p>
        </div>
      ) : results.length === 0 ? (
        <div className="archive-status">No results found</div>
      ) : (
        <>
          <div className="archive-info">{results.length} records found</div>
          <div className="archive-table-wrap">
            <table className="archive-table">
              <thead>
                <tr>
                  <th>Evidence</th>
                  <th>Vehicle</th>
                  <th>Type</th>
                  <th>Camera / Location</th>
                  <th>Timestamp</th>
                  <th>Confidence</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <div className="arch-thumb">
                        {v.image_url ? <img src={v.image_url} alt="" /> : <span>—</span>}
                      </div>
                    </td>
                    <td className="arch-vehicle">{v.vehicle_number}</td>
                    <td>
                      <span className="arch-type-badge">{v.type}</span>
                    </td>
                    <td>
                      <span className="arch-location">{v.location}</span>
                      <span className="arch-cam-id">{v.camera_id}</span>
                    </td>
                    <td className="arch-time">
                      {new Date(v.timestamp).toLocaleDateString()}
                      <br />
                      <span>{new Date(v.timestamp).toLocaleTimeString()}</span>
                    </td>
                    <td>{v.confidence != null ? `${Math.round(v.confidence * 100)}%` : 'N/A'}</td>
                    <td>
                      <span className={`status-badge ${v.status === 'Verified' ? 'green' : v.status === 'Rejected' ? 'red' : 'orange'}`}>
                        {v.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="act-btn view"
                        onClick={() => v.image_url && window.open(v.image_url, '_blank')}
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default EvidenceArchive;
