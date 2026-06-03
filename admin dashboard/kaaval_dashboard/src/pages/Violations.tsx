import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';
import type { ViolationItem, ViolationStats, PaginatedViolations } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  AlertTriangle, CheckCircle, XCircle, Eye, Download, Filter, Upload,
  Trash2, RefreshCw, ZoomIn, ZoomOut, RotateCw, Maximize2, Shield,
  ChevronLeft, ChevronRight, Edit2, Save, X, Calendar, Clock, Target
} from 'lucide-react';
import './Violations.css';

const PAGE_SIZE = 20;

interface Filters {
  status: string;
  cameraId: string;
  vehicleNumber: string;
  violationType: string;
  dateFrom: string;
  dateTo: string;
  timeFrom: string;
  timeTo: string;
  minConfidence: string;
  maxConfidence: string;
}

const EMPTY_FILTERS: Filters = {
  status: '', cameraId: '', vehicleNumber: '', violationType: '',
  dateFrom: '', dateTo: '', timeFrom: '', timeTo: '',
  minConfidence: '', maxConfidence: '',
};

const Violations = () => {
  const { hasRole } = useAuth();
  const [violations, setViolations] = useState<ViolationItem[]>([]);
  const [stats, setStats] = useState<ViolationStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const [pageInput, setPageInput] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Review Modal
  const [selectedViolation, setSelectedViolation] = useState<ViolationItem | null>(null);
  const [reviewZoom, setReviewZoom] = useState(1);
  const [viewMode, setViewMode] = useState<'proof' | 'plate'>('proof');
  const [processing, setProcessing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedPlate, setEditedPlate] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hideNA, setHideNA] = useState(false);

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  const setFilter = useCallback((key: keyof Filters, value: string) => {
    setPage(1);
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setPage(1);
    setFilters(EMPTY_FILTERS);
  }, []);

  const fetchViolations = useCallback(async (background = false, signal?: AbortSignal) => {
    if (!background) { setLoading(true); setSelectedIds([]); }
    if (background && document.visibilityState !== 'visible') return;

    try {
      const params: Record<string, string | number> = { limit: PAGE_SIZE, page };
      if (filters.status) params.status = filters.status;
      if (filters.cameraId) params.cameraId = filters.cameraId;
      if (filters.vehicleNumber) params.vehicleNumber = filters.vehicleNumber;
      if (filters.violationType) params.violationType = filters.violationType;

      // Combine date + time into ISO strings
      if (filters.dateFrom) {
        const t = filters.timeFrom || '00:00';
        params.dateFrom = `${filters.dateFrom}T${t}:00`;
      }
      if (filters.dateTo) {
        const t = filters.timeTo || '23:59';
        params.dateTo = `${filters.dateTo}T${t}:59`;
      }

      // Confidence as 0.0–1.0
      if (filters.minConfidence) {
        params.minConfidence = (parseFloat(filters.minConfidence) / 100).toFixed(4);
      } else if (hideNA) {
        params.minConfidence = '0.0001';
      }
      if (filters.maxConfidence) params.maxConfidence = (parseFloat(filters.maxConfidence) / 100).toFixed(4);

      const [vRes, sRes] = await Promise.all([
        axios.get<PaginatedViolations>(`${API_BASE}/violations`, { params, signal }),
        axios.get<ViolationStats>(`${API_BASE}/violations/stats`, { signal }),
      ]);

      const data = vRes.data.data ?? (vRes.data as unknown as ViolationItem[]);
      setViolations(Array.isArray(data) ? data : []);
      setTotal(vRes.data.total ?? (Array.isArray(data) ? data.length : 0));
      setStats(sRes.data);
    } catch (err) {
      if (axios.isCancel(err)) return;
      console.error(err);
    } finally {
      if (!background) setLoading(false);
    }
  }, [page, filters, hideNA]);

  useEffect(() => {
    const controller = new AbortController();
    fetchViolations(false, controller.signal);
    return () => controller.abort();
  }, [fetchViolations]);

  useEffect(() => {
    const interval = setInterval(() => fetchViolations(true), 2000); // 2s polling
    return () => clearInterval(interval);
  }, [fetchViolations]);

  const handlePageJump = () => {
    const p = parseInt(pageInput, 10);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      setPage(p);
      setPageInput('');
    }
  };

  const handleVerify = async (id: string, action: string) => {
    setProcessing(true);
    try {
      await axios.post(`${API_BASE}/violations/${id}/verify`, { action });
      if (selectedViolation?.id === id) setSelectedViolation(null);
      fetchViolations();
    } catch (err) { console.error(err); }
    finally { setProcessing(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this violation permanently?')) return;
    try {
      await axios.delete(`${API_BASE}/violations/${id}`);
      if (selectedViolation?.id === id) setSelectedViolation(null);
      fetchViolations();
    } catch (err) { console.error(err); }
  };

  const handleBatchUpload = async (files: FileList) => {
    setUploading(true); setUploadResult(null);
    const formData = new FormData();
    Array.from(files).forEach(f => formData.append('files', f));
    try {
      const res = await axios.post(`${API_BASE}/violations/batch-upload`, formData, { timeout: 120000 });
      setUploadResult(`Uploaded ${res.data.uploaded} files, ${res.data.errors} errors`);
      fetchViolations();
    } catch { setUploadResult('Upload failed'); }
    finally { setUploading(false); }
  };

  const handleSelectAll = (checked: boolean) =>
    setSelectedIds(checked ? violations.map(v => v.id) : []);

  const handleSelectOne = (id: string) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);

  const handleBulkDelete = async () => {
    if (!confirm(`Permanently delete ${selectedIds.length} violations?`)) return;
    setProcessing(true);
    try {
      await Promise.all(selectedIds.map(id => axios.delete(`${API_BASE}/violations/${id}`)));
      fetchViolations();
    } catch { alert('Failed to delete some items'); }
    finally { setProcessing(false); }
  };

  const openReviewModal = (v: ViolationItem) => {
    setSelectedViolation(v); setReviewZoom(1); setViewMode('proof');
    setEditMode(false); setEditedPlate(v.vehicle_number);
  };

  const handleNext = () => {
    if (!selectedViolation) return;
    const idx = violations.findIndex(v => v.id === selectedViolation.id);
    if (idx !== -1 && idx < violations.length - 1) openReviewModal(violations[idx + 1]);
  };

  const handlePrev = () => {
    if (!selectedViolation) return;
    const idx = violations.findIndex(v => v.id === selectedViolation.id);
    if (idx > 0) openReviewModal(violations[idx - 1]);
  };

  const handleSavePlate = async () => {
    if (!selectedViolation || !editedPlate) return;
    setProcessing(true);
    try {
      await axios.patch(`${API_BASE}/violations/${selectedViolation.id}`, { vehicleNumber: editedPlate });
      const updated = { ...selectedViolation, vehicle_number: editedPlate };
      setSelectedViolation(updated); setEditMode(false);
      setViolations(prev => prev.map(v => v.id === updated.id ? updated : v));
    } catch { alert('Failed to update plate number'); }
    finally { setProcessing(false); }
  };

  const statusColor = (status: string) => {
    if (status === 'Pending' || status === 'Review') return 'orange';
    if (status === 'Verified') return 'green';
    if (status === 'Rejected') return 'red';
    return 'gray';
  };

  const hasActiveFilters = Object.entries(filters).some(([, v]) => v !== '');

  return (
    <div className="violations-page">
      {/* Review Modal */}
      {selectedViolation && (
        <div className="modal-backdrop" onClick={() => setSelectedViolation(null)}>
          <div className="modal-content review-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Shield size={20} /> Review Violation</h3>
              <button className="btn-close" onClick={() => setSelectedViolation(null)}><XCircle size={24} /></button>
            </div>
            <div className="review-layout-modal">
              <div className="evidence-viewer-modal">
                <button className="nav-arrow left" onClick={handlePrev}
                  disabled={violations.findIndex(v => v.id === selectedViolation.id) === 0}>
                  <ChevronLeft size={32} />
                </button>
                <button className="nav-arrow right" onClick={handleNext}
                  disabled={violations.findIndex(v => v.id === selectedViolation.id) === violations.length - 1}>
                  <ChevronRight size={32} />
                </button>
                <div className="viewer-toolbar-modal">
                  <button onClick={() => setReviewZoom(Math.min(reviewZoom + 0.25, 3))}><ZoomIn size={16} /></button>
                  <button onClick={() => setReviewZoom(Math.max(reviewZoom - 0.25, 0.5))}><ZoomOut size={16} /></button>
                  <button onClick={() => setReviewZoom(1)}><RotateCw size={16} /></button>
                  <button onClick={() => setViewMode(viewMode === 'proof' ? 'plate' : 'proof')} style={{ minWidth: 80, fontSize: 13 }}>
                    {viewMode === 'proof' ? 'Show Plate' : 'Show Scene'}
                  </button>
                </div>
                <div className="evidence-canvas-modal">
                  {selectedViolation.image_url ? (
                    <img
                      src={viewMode === 'plate' ? selectedViolation.image_url : (selectedViolation.proof_img_url || selectedViolation.image_url)}
                      style={{ transform: `scale(${reviewZoom})` }} alt="Evidence"
                    />
                  ) : <div className="no-image">No Image</div>}
                </div>
              </div>

              <div className="details-panel-modal">
                <div className="detail-row">
                  <span className="label">Vehicle:</span>
                  {editMode ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <input type="text" value={editedPlate}
                        onChange={e => setEditedPlate(e.target.value.toUpperCase())}
                        style={{ width: 140, padding: 4, fontWeight: 'bold', textTransform: 'uppercase', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: 4 }}
                      />
                      <button onClick={handleSavePlate} disabled={processing} className="btn-icon" style={{ padding: 4, background: '#22c55e' }}><Save size={16} /></button>
                      <button onClick={() => setEditMode(false)} className="btn-icon" style={{ padding: 4, background: '#ef4444' }}><X size={16} /></button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="value highlight">{selectedViolation.vehicle_number}</span>
                      {hasRole('super_admin', 'developer', 'sp', 'dsp', 'nagercoil_admin', 'thuckalay_admin', 'colachel_admin', 'kanyakumari_admin', 'marthandam_admin', 'inspector', 'sub_inspector') && (
                        <button onClick={() => { setEditMode(true); setEditedPlate(selectedViolation.vehicle_number); }}
                          style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8em' }}>
                          <Edit2 size={14} /> Edit
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="detail-row">
                  <span className="label">Type:</span>
                  <span className="value">{selectedViolation.type}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Time:</span>
                  <span className="value" style={{ fontSize: '0.95rem' }}>
                    {new Date(selectedViolation.timestamp).toLocaleDateString()}{' '}
                    {new Date(selectedViolation.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">Camera:</span>
                  <span className="value" style={{ fontSize: '0.95rem' }}>{selectedViolation.location} <span style={{ color: 'var(--text-dim)', fontSize: '0.8em' }}>({selectedViolation.camera_id})</span></span>
                </div>
                <div className="detail-row">
                  <span className="label">Detection Confidence:</span>
                  <div className="conf-wrapper">
                    <div className="conf-bar-fill" style={{ width: `${(selectedViolation.violation_confidence || 0) * 100}%`, background: (selectedViolation.violation_confidence || 0) > 0.8 ? '#22c55e' : 'orange' }} />
                    <span>{Math.round((selectedViolation.violation_confidence || 0) * 100)}%</span>
                  </div>
                </div>
                <div className="detail-row">
                  <span className="label">Plate OCR Confidence:</span>
                  {selectedViolation.plate_confidence > 0 ? (
                    <div className="conf-wrapper">
                      <div className="conf-bar-fill" style={{ width: `${selectedViolation.plate_confidence * 100}%`, background: selectedViolation.plate_confidence > 0.8 ? '#22c55e' : '#f59e0b' }} />
                      <span>{Math.round(selectedViolation.plate_confidence * 100)}%</span>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>
                      Not available — plate was unreadable or not extracted by OCR
                    </span>
                  )}
                </div>
                <div className="modal-actions">
                  {(['Pending', 'Ready', 'Review'].includes(selectedViolation.status)) && hasRole('super_admin', 'developer', 'sp', 'dsp', 'nagercoil_admin', 'thuckalay_admin', 'colachel_admin', 'kanyakumari_admin', 'marthandam_admin', 'inspector', 'sub_inspector') && (
                    <>
                      <button className="btn-approve" disabled={processing} onClick={() => handleVerify(selectedViolation.id, 'approve')}>
                        <CheckCircle size={16} /> Approve
                      </button>
                      <button className="btn-reject" disabled={processing} onClick={() => handleVerify(selectedViolation.id, 'reject')}>
                        <XCircle size={16} /> Reject
                      </button>
                    </>
                  )}
                  {hasRole('super_admin', 'developer') && (
                    <button className="btn-delete" disabled={processing} onClick={() => handleDelete(selectedViolation.id)}>
                      <Trash2 size={16} /> Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <div className="stats-bar">
        <StatChip label="Total" value={stats?.total ?? 0} color="blue" />
        <StatChip label="With Confidence" value={stats?.with_confidence ?? 0} color="cyan" />
        <StatChip label="Pending" value={stats?.pending ?? 0} color="orange" />
        <StatChip label="Verified" value={stats?.verified ?? 0} color="green" />
        <StatChip label="Rejected" value={stats?.rejected ?? 0} color="red" />
        <StatChip label="Manual Review" value={stats?.manual_review ?? 0} color="purple" />
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-left">
          <h2><AlertTriangle size={20} /> Violation Management</h2>
        </div>
        <div className="toolbar-right">
          {selectedIds.length > 0 && hasRole('super_admin', 'developer') && (
            <button className="btn-secondary" onClick={handleBulkDelete} disabled={processing}
              style={{ border: '1px solid #ef4444', color: '#ef4444', background: 'rgba(239,68,68,0.1)' }}>
              <Trash2 size={16} /> Delete Selected ({selectedIds.length})
            </button>
          )}
          {hasRole('super_admin', 'developer', 'sp') && (
            <button className="btn-secondary" onClick={() => setShowUpload(!showUpload)}>
              <Upload size={16} /> Batch Upload
            </button>
          )}
          <button className="btn-secondary" onClick={() => fetchViolations()}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* Upload Panel */}
      {showUpload && (
        <div className="upload-panel">
          <input type="file" multiple accept="image/*"
            onChange={e => e.target.files && handleBatchUpload(e.target.files)}
            disabled={uploading} />
          {uploading && <span className="upload-status">Processing...</span>}
          {uploadResult && <span className="upload-result">{uploadResult}</span>}
        </div>
      )}

      {/* Filters */}
      <div className={`filters-bar ${showAdvanced ? 'expanded' : ''}`}>
        <div className="filter-row-primary">
          <Filter size={16} className="filter-icon" />

          <select value={filters.status} onChange={e => setFilter('status', e.target.value)}>
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="READY">Ready</option>
            <option value="MANUAL_REVIEW">Manual Review</option>
            <option value="CHALLAN_ISSUED">Challan Issued</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <select value={filters.violationType} onChange={e => setFilter('violationType', e.target.value)}>
            <option value="">All Types</option>
            <option value="NO_HELMET">No Helmet</option>
            <option value="TRIPLE_RIDING">Triple Riding</option>
            <option value="NO_SEATBELT">No Seatbelt</option>
            <option value="RED_LIGHT_JUMP">Red Light Jump</option>
            <option value="OVER_SPEEDING">Over Speeding</option>
          </select>

          <input type="text" placeholder="Vehicle Number..."
            value={filters.vehicleNumber} onChange={e => setFilter('vehicleNumber', e.target.value)} />

          <button
            className={`btn-advanced-toggle ${showAdvanced ? 'active' : ''}`}
            onClick={() => setShowAdvanced(!showAdvanced)}
            title="Advanced Filters"
          >
            <Calendar size={14} />
            {showAdvanced ? 'Hide Advanced' : 'Advanced'}
            {hasActiveFilters && <span className="filter-dot" />}
          </button>

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', marginLeft: 'auto' }}>
            <input type="checkbox" checked={hideNA} onChange={(e) => setHideNA(e.target.checked)} />
            Hide N/A Confidence
          </label>

          <button className="btn-clear" onClick={clearFilters}>Clear</button>
        </div>

        {showAdvanced && (
          <div className="filter-row-advanced">
            {/* Date Range */}
            <div className="filter-group">
              <label className="filter-label"><Calendar size={12} /> Date Range</label>
              <div className="filter-group-inputs">
                <input type="date" value={filters.dateFrom}
                  onChange={e => setFilter('dateFrom', e.target.value)}
                  title="From Date" />
                <span className="filter-sep">→</span>
                <input type="date" value={filters.dateTo}
                  onChange={e => setFilter('dateTo', e.target.value)}
                  title="To Date" />
              </div>
            </div>

            {/* Time Range */}
            <div className="filter-group">
              <label className="filter-label"><Clock size={12} /> Time Range</label>
              <div className="filter-group-inputs">
                <input type="time" value={filters.timeFrom}
                  onChange={e => setFilter('timeFrom', e.target.value)}
                  title="From Time" />
                <span className="filter-sep">→</span>
                <input type="time" value={filters.timeTo}
                  onChange={e => setFilter('timeTo', e.target.value)}
                  title="To Time" />
              </div>
            </div>

            {/* Confidence Range */}
            <div className="filter-group">
              <label className="filter-label"><Target size={12} /> Confidence %</label>
              <div className="filter-group-inputs">
                <input type="number" min={0} max={100} placeholder="Min %"
                  value={filters.minConfidence}
                  onChange={e => setFilter('minConfidence', e.target.value)}
                  style={{ width: 72 }} />
                <span className="filter-sep">—</span>
                <input type="number" min={0} max={100} placeholder="Max %"
                  value={filters.maxConfidence}
                  onChange={e => setFilter('maxConfidence', e.target.value)}
                  style={{ width: 72 }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="violations-table-wrapper">
        <table className="violations-table">
          <thead>
            <tr>
              <th style={{ width: 40, padding: '0 10px' }}>
                <input type="checkbox"
                  onChange={e => handleSelectAll(e.target.checked)}
                  checked={violations.length > 0 && selectedIds.length === violations.length} />
              </th>
              <th>Evidence</th>
              <th>Vehicle</th>
              <th>Violation</th>
              <th>Camera</th>
              <th>Time</th>
              <th>Confidence</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="loading-cell">Loading...</td></tr>
            ) : violations.length === 0 ? (
              <tr><td colSpan={9} className="loading-cell">No violations found</td></tr>
            ) : violations.map(v => (
              <tr key={v.id} style={selectedIds.includes(v.id) ? { background: 'rgba(59,130,246,0.05)' } : {}}>
                <td style={{ textAlign: 'center' }}>
                  <input type="checkbox" onChange={() => handleSelectOne(v.id)} checked={selectedIds.includes(v.id)} />
                </td>
                <td>
                  <div className="evidence-thumb" onClick={e => { e.stopPropagation(); openReviewModal(v); }}
                    style={{ cursor: 'pointer', border: '1px solid #e5e7eb' }} title="Click to Review">
                    {(v.proof_img_url || v.image_url) ? (
                      <img src={v.proof_img_url || v.image_url} alt="Evidence" loading="lazy"
                        style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                    ) : <div className="no-evidence">—</div>}
                  </div>
                </td>
                <td>
                  <span className="plate-number">{v.vehicle_number}</span>
                  <span className="vehicle-type">{v.vehicle_type}</span>
                </td>
                <td><span className="violation-type-badge">{v.type}</span></td>
                <td>
                  <span className="camera-location">{v.location}</span>
                  <span className="camera-id">{v.camera_id}</span>
                </td>
                <td className="time-cell">
                  {new Date(v.timestamp).toLocaleDateString()}
                  <br />
                  <span className="time-sub">{new Date(v.timestamp).toLocaleTimeString()}</span>
                </td>
                <td>
                  {v.confidence > 0 ? (
                    <div className="confidence-bar">
                      <div className="confidence-fill" style={{ width: `${Math.round(v.confidence * 100)}%` }} />
                      <span>{Math.round(v.confidence * 100)}%</span>
                    </div>
                  ) : (
                    <span className="conf-na">N/A</span>
                  )}
                </td>
                <td>
                  <span className={`status-badge ${statusColor(v.status)}`}>{v.status}</span>
                </td>
                <td>
                  <div className="action-btns">
                    {(['Pending', 'Ready', 'Review'].includes(v.status)) && hasRole('super_admin', 'developer', 'sp', 'dsp', 'nagercoil_admin', 'thuckalay_admin', 'colachel_admin', 'kanyakumari_admin', 'marthandam_admin', 'inspector', 'sub_inspector') && (
                      <>
                        <button className="act-btn approve" title="Approve Fine" onClick={() => handleVerify(v.id, 'approve')}>
                          <CheckCircle size={14} />
                        </button>
                        <button className="act-btn reject" title="Reject" onClick={() => handleVerify(v.id, 'reject')}>
                          <XCircle size={14} />
                        </button>
                      </>
                    )}
                    <button className="act-btn view" title="View Evidence" onClick={() => openReviewModal(v)}>
                      <Maximize2 size={14} />
                    </button>
                    {hasRole('super_admin', 'developer') && (
                      <button className="act-btn delete" title="Delete" onClick={() => handleDelete(v.id)}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="pagination">
        <button disabled={page <= 1} onClick={() => setPage(1)} title="First page">«</button>
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}>‹ Prev</button>

        <div className="pagination-info">
          Page <strong>{page}</strong> of <strong>{totalPages}</strong>
          <span className="pag-total">• {total.toLocaleString()} total</span>
        </div>

        <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next ›</button>
        <button disabled={page >= totalPages} onClick={() => setPage(totalPages)} title="Last page">»</button>

        <div className="page-jump">
          <input
            type="number" min={1} max={totalPages}
            placeholder="Page #"
            value={pageInput}
            onChange={e => setPageInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handlePageJump()}
          />
          <button onClick={handlePageJump}>Go</button>
        </div>
      </div>
    </div>
  );
};

const StatChip = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className={`stat-chip ${color}`}>
    <span className="stat-value">{value.toLocaleString()}</span>
    <span className="stat-label">{label}</span>
  </div>
);

export default Violations;
