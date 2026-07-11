import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';
import { Search, Plus, ShieldAlert, Trash2, X, AlertTriangle, Crosshair } from 'lucide-react';
import './WantedVehicles.css';

export default function WantedVehicles() {
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ vehicleNumber: '', reason: '', priority: 'HIGH' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const fetchWatchlist = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/watchlist`);
      setWatchlist(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.post(`${API_BASE}/watchlist`, formData);
      setIsModalOpen(false);
      setFormData({ vehicleNumber: '', reason: '', priority: 'HIGH' });
      fetchWatchlist();
    } catch (err) {
      console.error(err);
      alert('Failed to add to watchlist. Please try again.');
    }
    setSaving(false);
  };

  const removeVehicle = async (id: string, number: string) => {
    if (!window.confirm(`Remove ${number} from watchlist?`)) return;
    try {
      await axios.delete(`${API_BASE}/watchlist/${id}`);
      fetchWatchlist();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredList = watchlist.filter(w => 
    w.vehicleNumber.toLowerCase().includes(search.toLowerCase()) || 
    w.reason.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="watchlist-page">
      <div className="watchlist-header">
        <div>
          <h1><ShieldAlert size={28} style={{ color: 'var(--red)', verticalAlign: 'middle', marginRight: '10px' }} /> Wanted Vehicles (BOLO)</h1>
          <p>Register vehicles for immediate detection alerts across the district camera network.</p>
        </div>
      </div>

      <div className="watchlist-toolbar">
        <div className="watchlist-search">
          <Search size={16} />
          <input 
            type="text" 
            placeholder="Search license plate or reason..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
        </div>
        <button className="btn-add-wanted" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} /> Add Wanted Vehicle
        </button>
      </div>

      <div className="watchlist-table-wrap">
        <table className="watchlist-table">
          <thead>
            <tr>
              <th>License Plate</th>
              <th>Reason</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Added On</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Loading watchlist...</td></tr>
            ) : filteredList.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  <Crosshair size={32} style={{ opacity: 0.3, marginBottom: '10px' }} />
                  <br />No wanted vehicles found.
                </td>
              </tr>
            ) : (
              filteredList.map(w => (
                <tr key={w.id}>
                  <td>
                    <span className="plate-badge">{w.vehicleNumber}</span>
                  </td>
                  <td>{w.reason}</td>
                  <td>
                    <span className={`priority-pill ${w.priority?.toLowerCase() || 'medium'}`}>
                      {w.priority || 'MEDIUM'}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill ${w.status === 'ACTIVE' ? 'active' : 'inactive'}`}>
                      {w.status || 'ACTIVE'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {new Date(w.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <button className="btn-remove" onClick={() => removeVehicle(w.id, w.vehicleNumber)}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Wanted Vehicle</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="bolo-alert">
              <AlertTriangle size={16} />
              <span>If this vehicle is detected by any Kaaval AI camera, an immediate alert will be sent to the respective subdivision.</span>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>License Plate Number *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. TN74A1234" 
                  value={formData.vehicleNumber}
                  onChange={e => setFormData({ ...formData, vehicleNumber: e.target.value.toUpperCase() })}
                  style={{ textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Priority *</label>
                <select 
                  required 
                  value={formData.priority}
                  onChange={e => setFormData({ ...formData, priority: e.target.value })}
                >
                  <option value="CRITICAL">Critical (Immediate Interception)</option>
                  <option value="HIGH">High (Wanted for Crime)</option>
                  <option value="MEDIUM">Medium (Traffic Violator / Absconding)</option>
                  <option value="LOW">Low (Watchlist)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label>Reason / Remarks *</label>
                <textarea 
                  required 
                  placeholder="Reason for adding to watchlist..." 
                  value={formData.reason}
                  onChange={e => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-save" disabled={saving}>
                  {saving ? 'Saving...' : 'Add to Watchlist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
