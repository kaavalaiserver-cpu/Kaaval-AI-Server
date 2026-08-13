import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';
import { Search, Plus, EyeOff, Trash2, X, Clock, FileText } from 'lucide-react';
import { formatDateIST } from '../utils/dateIST';
import { useAuth } from '../context/AuthContext';
import './KnownVehicles.css';

export default function KnownVehicles() {
  const [knownVehicles, setKnownVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({ vehicleNumber: '', reason: '' });
  const [saving, setSaving] = useState(false);

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState('');

  const { hasRole } = useAuth();
  const canManage = hasRole('super_admin');

  useEffect(() => {
    fetchKnownVehicles();
  }, []);

  const fetchKnownVehicles = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/known-vehicles`);
      setKnownVehicles(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    setSaving(true);
    try {
      await axios.post(`${API_BASE}/known-vehicles`, formData);
      setIsAddModalOpen(false);
      setFormData({ vehicleNumber: '', reason: '' });
      fetchKnownVehicles();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to add known vehicle.');
    }
    setSaving(false);
  };

  const removeVehicle = async (id: string, number: string) => {
    if (!canManage) return;
    if (!window.confirm(`Are you sure you want to stop ignoring violations for ${number}?`)) return;
    try {
      await axios.delete(`${API_BASE}/known-vehicles/${id}`);
      fetchKnownVehicles();
    } catch (err) {
      console.error(err);
    }
  };

  const viewHistory = async (vehicleNumber: string) => {
    setSelectedVehicle(vehicleNumber);
    setHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/known-vehicles/history/${vehicleNumber}`);
      setHistoryData(res.data);
    } catch (err) {
      console.error(err);
    }
    setHistoryLoading(false);
  };

  const filteredList = knownVehicles.filter(w => 
    w.vehicleNumber.toLowerCase().includes(search.toLowerCase()) || 
    (w.reason || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="known-vehicles-page">
      <div className="known-vehicles-header">
        <div>
          <h1><EyeOff size={28} style={{ color: 'var(--blue)', verticalAlign: 'middle', marginRight: '10px' }} /> Known Vehicles</h1>
          <p>Vehicles listed here will have their violations automatically suppressed from the main dashboard.</p>
        </div>
      </div>

      <div className="known-vehicles-toolbar">
        <div className="known-vehicles-search">
          <Search size={16} />
          <input 
            type="text" 
            placeholder="Search license plate or reason..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
        </div>
        {canManage && (
          <button className="btn-add-known" onClick={() => setIsAddModalOpen(true)}>
            <Plus size={16} /> Add Known Vehicle
          </button>
        )}
      </div>

      <div className="known-vehicles-table-wrap">
        <table className="known-vehicles-table">
          <thead>
            <tr>
              <th>License Plate</th>
              <th>Reason</th>
              <th>Added On</th>
              <th>Suppressed History</th>
              {canManage && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={canManage ? 5 : 4} style={{ textAlign: 'center', padding: '2rem' }}>Loading known vehicles...</td></tr>
            ) : filteredList.length === 0 ? (
              <tr><td colSpan={canManage ? 5 : 4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>No known vehicles found.</td></tr>
            ) : (
              filteredList.map(v => (
                <tr key={v.id}>
                  <td><strong>{v.vehicleNumber}</strong></td>
                  <td>{v.reason || '-'}</td>
                  <td>{formatDateIST(v.createdAt)}</td>
                  <td>
                    <button className="btn-view-history" onClick={() => viewHistory(v.vehicleNumber)}>
                      <Clock size={14} /> View History
                    </button>
                  </td>
                  {canManage && (
                    <td>
                      <button className="btn-delete" onClick={() => removeVehicle(v.id, v.vehicleNumber)} title="Remove from list">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isAddModalOpen && canManage && (
        <div className="modal-backdrop">
          <div className="modal-content small-modal">
            <div className="modal-header">
              <h3><Plus size={20} /> Add Known Vehicle</h3>
              <button className="btn-close" onClick={() => setIsAddModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddSubmit} className="known-vehicle-form">
              <div className="form-group">
                <label>Vehicle Number</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. TN74AA1234" 
                  value={formData.vehicleNumber} 
                  onChange={e => setFormData({...formData, vehicleNumber: e.target.value.toUpperCase()})}
                  className="plate-input"
                />
              </div>
              <div className="form-group">
                <label>Reason for Suppression</label>
                <textarea 
                  required 
                  rows={3} 
                  placeholder="e.g. Undercover police vehicle, VIP convoy..."
                  value={formData.reason} 
                  onChange={e => setFormData({...formData, reason: e.target.value})}
                ></textarea>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-save" disabled={saving}>
                  {saving ? 'Saving...' : 'Add Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {historyModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content medium-modal">
            <div className="modal-header">
              <h3><FileText size={20} /> Suppressed Violations: {selectedVehicle}</h3>
              <button className="btn-close" onClick={() => setHistoryModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="history-modal-body">
              {historyLoading ? (
                <div style={{ padding: '2rem', textAlign: 'center' }}>Loading history...</div>
              ) : historyData.length === 0 ? (
                <div className="no-history-msg">No suppressed violations recorded for this vehicle yet.</div>
              ) : (
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Date & Time</th>
                      <th>Violation Type</th>
                      <th>Camera / Location</th>
                      <th>Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.map(h => (
                      <tr key={h.id}>
                        <td>{formatDateIST(h.hitTimestamp)}</td>
                        <td>{h.violationType || 'Unknown'}</td>
                        <td>{h.cameraName || h.cameraId}</td>
                        <td>{h.confidence ? `${(h.confidence * 100).toFixed(1)}%` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
