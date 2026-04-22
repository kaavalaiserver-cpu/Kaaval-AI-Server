import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';
import type { ViolationItem, ViolationStats, PaginatedViolations } from '../types';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Download,
  Filter,
  Upload,
  Trash2,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Shield, // Added for modal
  ChevronLeft,
  ChevronRight,
  Edit2,
  Save,
  X
} from 'lucide-react';
import './Violations.css';

const Violations = () => {
  const [violations, setViolations] = useState<ViolationItem[]>([]);
  const [stats, setStats] = useState<ViolationStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: '', cameraId: '', vehicleNumber: '', violationType: '' });
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  
  // Review Modal State
  const [selectedViolation, setSelectedViolation] = useState<ViolationItem | null>(null);
  const [reviewZoom, setReviewZoom] = useState(1);
  const [viewMode, setViewMode] = useState<'proof' | 'plate'>('proof'); // Toggle view
  const [processing, setProcessing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedPlate, setEditedPlate] = useState('');
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const fetchViolations = useCallback(async (background = false) => {
    if (!background) {
      setLoading(true);
      setSelectedIds([]); // Clear selection on manual fetch/filter change
    }
    
    try {
      const params: Record<string, string | number> = { limit: 20, page };
      if (filters.status) params.status = filters.status;
      if (filters.cameraId) params.cameraId = filters.cameraId;
      if (filters.vehicleNumber) params.vehicleNumber = filters.vehicleNumber;
      if (filters.violationType) params.violationType = filters.violationType;

      const [vRes, sRes] = await Promise.all([
        axios.get<PaginatedViolations>(`${API_BASE}/violations`, { params }),
        axios.get<ViolationStats>(`${API_BASE}/violations/stats`),
      ]);

      const data = vRes.data.data ?? (vRes.data as unknown as ViolationItem[]);
      setViolations(Array.isArray(data) ? data : []);
      setTotal(vRes.data.total ?? (Array.isArray(data) ? data.length : 0));
      setStats(sRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      if (!background) setLoading(false);
    }
  }, [page, filters]);

  // Initial fetch when filters change
  useEffect(() => { fetchViolations(); }, [fetchViolations]);

  // Auto-refresh every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchViolations(true);
    }, 2000);
    return () => clearInterval(interval);
  }, [fetchViolations]);

  const handleVerify = async (id: string, action: string) => {
    setProcessing(true);
    try {
      await axios.post(`${API_BASE}/violations/${id}/verify`, { action });
      // If modal is open, close it or update status
      if (selectedViolation && selectedViolation.id === id) {
          setSelectedViolation(null); // Close modal on action
      }
      fetchViolations();
    } catch (err) {
      console.error(err);
    } finally {
        setProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this violation permanently?')) return;
    try {
      await axios.delete(`${API_BASE}/violations/${id}`);
      if (selectedViolation?.id === id) setSelectedViolation(null);
      fetchViolations();
    } catch (err) {
      console.error(err);
    }
  };

  const handleBatchUpload = async (files: FileList) => {
    setUploading(true);
    setUploadResult(null);
    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append('files', f));

    try {
      const res = await axios.post(`${API_BASE}/violations/batch-upload`, formData, {
        timeout: 120000,
      });
      setUploadResult(`Uploaded ${res.data.uploaded} files, ${res.data.errors} errors`);
      fetchViolations();
    } catch {
      setUploadResult('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(violations.map((v) => v.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(s => s !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Permanently delete ${selectedIds.length} violations?`)) return;
    setProcessing(true);
    try {
      // Parallel delete calls for now (simple implementation)
      await Promise.all(selectedIds.map(id => axios.delete(`${API_BASE}/violations/${id}`)));
      fetchViolations();
    } catch (err) {
      console.error(err);
      alert('Failed to delete some items');
    } finally {
      setProcessing(false);
    }
  };
  
  const openReviewModal = (v: ViolationItem) => {
      setSelectedViolation(v);
      setReviewZoom(1);
      setViewMode('proof'); // Default to full proof
      setEditMode(false);
      setEditedPlate(v.vehicle_number);
  };

  const handleNext = () => {
    if (!selectedViolation) return;
    const idx = violations.findIndex(v => v.id === selectedViolation.id);
    if (idx !== -1 && idx < violations.length - 1) {
      openReviewModal(violations[idx + 1]);
    }
  };

  const handlePrev = () => {
    if (!selectedViolation) return;
    const idx = violations.findIndex(v => v.id === selectedViolation.id);
    if (idx > 0) {
      openReviewModal(violations[idx - 1]);
    }
  };
  
  const handleSavePlate = async () => {
    if (!selectedViolation || !editedPlate) return;
    setProcessing(true);
    try {
        await axios.patch(`${API_BASE}/violations/${selectedViolation.id}`, { vehicleNumber: editedPlate });
        // Update local state
        const updated = { ...selectedViolation, vehicle_number: editedPlate };
        setSelectedViolation(updated);
        setEditMode(false);
        // Refresh list
        setViolations(prev => prev.map(v => v.id === updated.id ? updated : v));
    } catch (err) {
        console.error(err);
        alert('Failed to update plate number');
    } finally {
        setProcessing(false);
    }
  };

  const statusColor = (status: string) => {
    if (status === 'Pending' || status === 'Review') return 'orange';
    if (status === 'Verified') return 'green';
    if (status === 'Rejected') return 'red';
    return 'gray';
  };

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
                    {/* Navigation Arrows */}
                    <button 
                        className="nav-arrow left" 
                        onClick={handlePrev} 
                        disabled={!violations.length || (violations.findIndex(v => v.id === selectedViolation.id) === 0)}
                    >
                        <ChevronLeft size={32} />
                    </button>
                    <button 
                        className="nav-arrow right" 
                        onClick={handleNext} 
                        disabled={!violations.length || (violations.findIndex(v => v.id === selectedViolation.id) === violations.length - 1)}
                    >
                        <ChevronRight size={32} />
                    </button>

                    <div className="viewer-toolbar-modal">
                        <button onClick={() => setReviewZoom(Math.min(reviewZoom + 0.25, 3))}><ZoomIn size={16}/></button>
                        <button onClick={() => setReviewZoom(Math.max(reviewZoom - 0.25, 0.5))}><ZoomOut size={16}/></button>
                        <button onClick={() => setReviewZoom(1)}><RotateCw size={16}/></button>
                        <div style={{ width: 1, padding: 0, background: 'rgba(255,255,255,0.2)', height: 20, margin: '0 4px' }}></div>
                        <button 
                            onClick={() => setViewMode(viewMode === 'proof' ? 'plate' : 'proof')}
                            style={{ minWidth: 80, fontSize: 13 }}
                        >
                            {viewMode === 'proof' ? 'Show Plate' : 'Show Scene'}
                        </button>
                    </div>
                    <div className="evidence-canvas-modal">
                        {/* Always prefer proof_img_url if user wants 'dont crop' context, but allow toggle */}
                         {selectedViolation.image_url ? (
                            <img 
                                src={viewMode === 'plate' ? selectedViolation.image_url : (selectedViolation.proof_img_url || selectedViolation.image_url)} 
                                style={{ transform: `scale(${reviewZoom})` }}
                                alt="Evidence" 
                            />
                        ) : <div className="no-image">No Image</div>}
                    </div>
                </div>
                
                <div className="details-panel-modal">
                    <div className="detail-row">
                        <span className="label">Vehicle:</span>
                        {editMode ? (
                            <div className="edit-plate-box" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <input 
                                    type="text" 
                                    value={editedPlate} 
                                    onChange={(e) => setEditedPlate(e.target.value.toUpperCase())}
                                    style={{
                                        width: '140px', 
                                        padding: '4px',
                                        fontSize: '1em',
                                        fontWeight: 'bold',
                                        textTransform: 'uppercase',
                                        background: '#333',
                                        color: '#fff',
                                        border: '1px solid #555'
                                    }}
                                />
                                <button onClick={handleSavePlate} disabled={processing} className="btn-icon" style={{ padding: '4px', background: '#22c55e' }}><Save size={16}/></button>
                                <button onClick={() => setEditMode(false)} className="btn-icon" style={{ padding: '4px', background: '#ef4444' }}><X size={16}/></button>
                            </div>
                        ) : (
                            <div className="plate-display-row" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span className="value highlight">{selectedViolation.vehicle_number}</span>
                                <button 
                                    onClick={() => { setEditMode(true); setEditedPlate(selectedViolation.vehicle_number); }}
                                    style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8em' }}
                                >
                                    <Edit2 size={14} /> Edit
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="detail-row">
                        <span className="label">Type:</span>
                        <span className="value">{selectedViolation.type}</span>
                    </div>
                     <div className="detail-row">
                        <span className="label">Confidence:</span>
                        <div className="conf-wrapper">
                             <div className="conf-bar-fill" style={{width: `${selectedViolation.confidence * 100}%`, background: selectedViolation.confidence > 0.8 ? '#22c55e' : 'orange'}}></div>
                             <span>{Math.round(selectedViolation.confidence * 100)}%</span>
                        </div>
                    </div>
                    
                    <div className="modal-actions">
                        {(selectedViolation.status === 'Pending' || selectedViolation.status === 'Review') && (
                            <>
                                <button className="btn-approve" disabled={processing} onClick={() => handleVerify(selectedViolation.id, 'approve')}>
                                    <CheckCircle size={16}/> Approve
                                </button>
                                <button className="btn-reject" disabled={processing} onClick={() => handleVerify(selectedViolation.id, 'reject')}>
                                    <XCircle size={16}/> Reject
                                </button>
                            </>
                        )}
                        <button className="btn-delete" disabled={processing} onClick={() => handleDelete(selectedViolation.id)}>
                            <Trash2 size={16} /> Delete
                        </button>
                    </div>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <div className="stats-bar">
        <StatChip label="Total" value={stats?.total ?? 0} color="blue" />
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
          {selectedIds.length > 0 && (
             <button 
                className="btn-danger-outline" 
                onClick={handleBulkDelete} 
                disabled={processing}
                style={{ 
                    border: '1px solid #ef4444', 
                    color: '#ef4444', 
                    background: 'rgba(239, 68, 68, 0.1)',
                    marginRight: '8px'
                }}
             >
              <Trash2 size={16} /> Delete Selected ({selectedIds.length})
            </button>
          )}
          <button className="btn-secondary" onClick={() => setShowUpload(!showUpload)}>
            <Upload size={16} /> Batch Upload
          </button>
          <button className="btn-secondary" onClick={fetchViolations}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>


      {/* Upload Panel */}
      {showUpload && (
        <div className="upload-panel">
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => e.target.files && handleBatchUpload(e.target.files)}
            disabled={uploading}
          />
          {uploading && <span className="upload-status">Processing...</span>}
          {uploadResult && <span className="upload-result">{uploadResult}</span>}
        </div>
      )}

      {/* Filters */}
      <div className="filters-bar">
        <Filter size={16} />
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="READY">Ready</option>
          <option value="MANUAL_REVIEW">Manual Review</option>
          <option value="CHALLAN_ISSUED">Challan Issued</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <select
          value={filters.violationType}
          onChange={(e) => setFilters({ ...filters, violationType: e.target.value })}
        >
          <option value="">All Types</option>
          <option value="NO_HELMET">No Helmet</option>
          <option value="TRIPLE_RIDING">Triple Riding</option>
          <option value="NO_SEATBELT">No Seatbelt</option>
          <option value="RED_LIGHT_JUMP">Red Light Jump</option>
          <option value="OVER_SPEEDING">Over Speeding</option>
        </select>
        <input
          type="text"
          placeholder="Vehicle Number..."
          value={filters.vehicleNumber}
          onChange={(e) => setFilters({ ...filters, vehicleNumber: e.target.value })}
        />
        <button
          className="btn-clear"
          onClick={() => setFilters({ status: '', cameraId: '', vehicleNumber: '', violationType: '' })}
        >
          Clear
        </button>
      </div>

      {/* Table */}
      <div className="violations-table-wrapper">
        <table className="violations-table">
          <thead>
            <tr>
              <th className="checkbox-col" style={{ width: '40px', padding: '0 10px' }}>
                <input 
                  type="checkbox" 
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  checked={violations.length > 0 && selectedIds.length === violations.length}
                />
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
              <tr>
                <td colSpan={9} className="loading-cell">Loading...</td>
              </tr>
            ) : violations.length === 0 ? (
              <tr>
                <td colSpan={9} className="loading-cell">No violations found</td>
              </tr>
            ) : (
              violations.map((v) => (
                <tr key={v.id} style={selectedIds.includes(v.id) ? { background: 'rgba(59, 130, 246, 0.05)' } : {}}>
                  <td className="checkbox-col" style={{ textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      onChange={() => handleSelectOne(v.id)}
                      checked={selectedIds.includes(v.id)}
                    />
                  </td>
                  <td>
                    <div 
                        className="evidence-thumb" 
                        onClick={(e) => { e.stopPropagation(); openReviewModal(v); }}
                        style={{ cursor: 'pointer', border: '1px solid #e5e7eb' }}
                        title="Click to Review"
                    >
                      {(v.proof_img_url || v.image_url) ? (
                        <img src={v.proof_img_url || v.image_url} alt="Evidence" />
                      ) : (
                        <div className="no-evidence">—</div>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="plate-number">{v.vehicle_number}</span>
                    <span className="vehicle-type">{v.vehicle_type}</span>
                  </td>
                  <td>
                    <span className="violation-type-badge">{v.type}</span>
                  </td>
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
                    <div className="confidence-bar">
                      <div
                        className="confidence-fill"
                        style={{ width: `${Math.round(v.confidence * 100)}%` }}
                      />
                      <span>{Math.round(v.confidence * 100)}%</span>
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${statusColor(v.status)}`}>
                      {v.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-btns">
                      {v.status === 'Pending' || v.status === 'Review' ? (
                        <>
                          <button
                            className="act-btn approve"
                            title="Approve Fine"
                            onClick={() => handleVerify(v.id, 'approve')}
                          >
                            <CheckCircle size={14} />
                          </button>
                          <button
                            className="act-btn reject"
                            title="Reject"
                            onClick={() => handleVerify(v.id, 'reject')}
                          >
                            <XCircle size={14} />
                          </button>
                        </>
                      ) : null}
                        <button
                        className="act-btn view"
                        title="View Evidence"
                        onClick={() => openReviewModal(v)}
                      >
                        <Maximize2 size={14} />
                      </button>
                      <button
                        className="act-btn delete"
                        title="Delete"
                        onClick={() => handleDelete(v.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="pagination">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
          Prev
        </button>
        <span>
          Page {page} &bull; {total} total
        </span>
        <button disabled={violations.length < 20} onClick={() => setPage(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
};

const StatChip = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className={`stat-chip ${color}`}>
    <span className="stat-value">{value}</span>
    <span className="stat-label">{label}</span>
  </div>
);

export default Violations;
