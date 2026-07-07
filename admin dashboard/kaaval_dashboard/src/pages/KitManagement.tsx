import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';
import { MapPin, Camera, AlertTriangle, Plus, Pencil, Trash2, X, Search, Shield, PlayCircle, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './KitManagement.css';

const TABS = [
  { id: 'subdivisions', label: 'Subdivisions', icon: <Shield size={16} /> },
  { id: 'junctions',   label: 'Locations',    icon: <MapPin size={16} /> },
  { id: 'cameras',     label: 'Kaaval Kits',  icon: <Camera size={16} /> },
  { id: 'vtypes',      label: 'Violation Types', icon: <AlertTriangle size={16} /> },
];

const JUNCTION_TYPES = ['ROUNDANA', 'SIGNAL', 'HIGHWAY', 'CHECKPOST'];
const SEVERITIES     = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'];
const CAM_STATUSES   = ['ONLINE', 'OFFLINE', 'MAINTENANCE'];

function emptyJunction() {
  return { junctionName: '', junctionCode: '', address: '', latitude: '', longitude: '', junctionType: 'SIGNAL', isOneWay: false, subdivisionId: '', isActive: true };
}
function emptyCamera() {
  return { cameraName: '', cameraCode: '', junctionId: '', streamUrl: '', ipAddress: '', status: 'OFFLINE' };
}
function emptyVType() {
  return { violationCode: '', violationName: '', description: '', defaultFine: 500, color: '#FF4B4B', severity: 'HIGH' };
}
function emptySubdivision() {
  return { subdivisionCode: '', subdivisionName: '', headquarters: '', districtId: 'e8e3d3b7-7eb9-40e1-bb5c-482a5c4d0a1b' }; // Using default district
}

export default function KitManagement() {
  const [tab, setTab]               = useState('subdivisions');
  const [subdivisions, setSubdivisions] = useState<any[]>([]);
  const [junctions, setJunctions]   = useState<any[]>([]);
  const [cameras, setCameras]       = useState<any[]>([]);
  const [vtypes, setVtypes]         = useState<any[]>([]);
  const [search, setSearch]         = useState('');
  const [loading, setLoading]       = useState(false);
  const [modal, setModal]           = useState<'subdivision'|'junction'|'camera'|'vtype'|'del'|null>(null);
  const [editing, setEditing]       = useState<any>(null);
  const [delTarget, setDelTarget]   = useState<{ type: string; id: string; name: string } | null>(null);
  const [saving, setSaving]         = useState(false);
  const [selectedStream, setSelectedStream] = useState<any>(null);

  const { hasRole } = useAuth();
  const isSuperAdmin = hasRole('super_admin');

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [s, j, c, v] = await Promise.all([
        axios.get(`${API_BASE}/cameras/subdivisions`),
        axios.get(`${API_BASE}/cameras/junctions`),
        axios.get(`${API_BASE}/cameras`),
        axios.get(`${API_BASE}/violations/types`),
      ]);
      setSubdivisions(s.data || []);
      setJunctions(j.data || []);
      setCameras(c.data || []);
      setVtypes(v.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  // ── CRUD helpers ────────────────────────────────────────────────
  async function saveJunction(data: any) {
    setSaving(true);
    try {
      if (data.id) await axios.patch(`${API_BASE}/cameras/junctions/${data.id}`, data);
      else         await axios.post(`${API_BASE}/cameras/junctions`, data);
      await loadAll(); closeModal();
    } catch (e: any) { alert(e.response?.data?.message || 'Failed to save'); }
    setSaving(false);
  }

  async function saveCamera(data: any) {
    setSaving(true);
    try {
      if (data.id) await axios.patch(`${API_BASE}/cameras/${data.id}`, data);
      else         await axios.post(`${API_BASE}/cameras`, data);
      await loadAll(); closeModal();
    } catch (e: any) { alert(e.response?.data?.message || 'Failed to save'); }
    setSaving(false);
  }

  async function saveVType(data: any) {
    setSaving(true);
    try {
      if (data.id) await axios.patch(`${API_BASE}/violations/types/${data.id}`, data);
      else         await axios.post(`${API_BASE}/violations/types`, data);
      await loadAll(); closeModal();
    } catch (e: any) { alert(e.response?.data?.message || 'Failed to save'); }
    setSaving(false);
  }

  async function confirmDelete() {
    if (!delTarget) return;
    setSaving(true);
    try {
      const map: Record<string, string> = {
        subdivision: `${API_BASE}/cameras/subdivisions/${delTarget.id}`,
        junction: `${API_BASE}/cameras/junctions/${delTarget.id}`,
        camera:   `${API_BASE}/cameras/${delTarget.id}`,
        vtype:    `${API_BASE}/violations/types/${delTarget.id}`,
      };
      await axios.delete(map[delTarget.type]);
      await loadAll(); closeModal();
    } catch (e: any) { alert(e.response?.data?.message || 'Delete failed'); }
    setSaving(false);
  }

  function openAdd(type: 'subdivision'|'junction'|'camera'|'vtype') {
    const defaults: Record<string, any> = { subdivision: emptySubdivision(), junction: emptyJunction(), camera: emptyCamera(), vtype: emptyVType() };
    setEditing(defaults[type]);
    setModal(type);
  }

  function openEdit(type: 'subdivision'|'junction'|'camera'|'vtype', row: any) {
    setEditing({ ...row });
    setModal(type);
  }

  function openDel(type: string, id: string, name: string) {
    setDelTarget({ type, id, name });
    setModal('del');
  }

  function closeModal() {
    setModal(null); setEditing(null); setDelTarget(null);
  }

  // ── Filter ──────────────────────────────────────────────────────
  const filteredJunctions = junctions.filter(j =>
    j.junctionName?.toLowerCase().includes(search.toLowerCase()) ||
    j.subdivision?.subdivisionName?.toLowerCase().includes(search.toLowerCase())
  );
  const filteredCameras = cameras.filter(c =>
    c.cameraName?.toLowerCase().includes(search.toLowerCase()) ||
    c.cameraCode?.toLowerCase().includes(search.toLowerCase())
  );
  const filteredVTypes = vtypes.filter(v =>
    v.violationName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="kit-page">
      {/* Header */}
      <div className="kit-page-header">
        <div>
          <h1>🗺️ Kit Management</h1>
          <p>Manage subdivisions, monitoring locations, Kaaval kits, and violation types for Kanyakumari district.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="kit-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`kit-tab ${tab === t.id ? 'active' : ''}`} onClick={() => { setTab(t.id); setSearch(''); }}>
            {t.icon} {t.label}
            <span className="tab-count">
              {t.id === 'subdivisions' ? subdivisions.length
                : t.id === 'junctions' ? junctions.length
                : t.id === 'cameras'   ? cameras.length
                : vtypes.length}
            </span>
          </button>
        ))}
      </div>

      {loading && <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>}

      {/* ── TAB: Subdivisions ─────────────────────────────────────── */}
      {tab === 'subdivisions' && (
        <>
          <div className="kit-toolbar">
            <div className="kit-toolbar-left">
              <div className="search-input-wrap">
                <Search size={15} />
                <input placeholder="Search subdivisions…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            {isSuperAdmin && (
              <button className="kit-add-btn" onClick={() => openAdd('subdivision')}><Plus size={16} /> Add Subdivision</button>
            )}
          </div>
          <div className="subdivision-grid">
            {subdivisions.filter(s => s.subdivisionName?.toLowerCase().includes(search.toLowerCase()) || s.subdivisionCode?.toLowerCase().includes(search.toLowerCase())).map(sub => {
              const jCount = junctions.filter(j => j.subdivisionId === sub.id || j.subdivision?.id === sub.id).length;
              const cCount = cameras.filter(c => c.junction?.subdivisionId === sub.id).length;
              return (
                <div key={sub.id} className="subdivision-card">
                  <div className="subdivision-card-header">
                    <span className="subdivision-badge">{sub.subdivisionCode}</span>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {isSuperAdmin && (
                        <>
                          <button className="btn-icon-edit" onClick={() => openEdit('subdivision', sub)} title="Edit"><Pencil size={14} /></button>
                          <button className="btn-icon-del" onClick={() => openDel('subdivision', sub.id, sub.subdivisionName)} title="Delete"><Trash2 size={14} /></button>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="subdivision-name">{sub.subdivisionName}</p>
                  <p className="subdivision-hq">📍 HQ: {sub.headquarters}</p>
                  <div className="subdivision-stats">
                    <div className="sub-stat"><div className="sub-stat-value">{jCount}</div><div className="sub-stat-label">Locations</div></div>
                    <div className="sub-stat"><div className="sub-stat-value">{cCount}</div><div className="sub-stat-label">Cameras</div></div>
                  </div>
                </div>
              );
            })}
            {subdivisions.length === 0 && !loading && (
              <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                <Shield size={40} /><p>No subdivisions found. Add one above.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── TAB: Junctions ────────────────────────────────────────── */}
      {tab === 'junctions' && (
        <>
          <div className="kit-toolbar">
            <div className="kit-toolbar-left">
              <div className="search-input-wrap">
                <Search size={15} />
                <input placeholder="Search locations…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            {isSuperAdmin && (
              <button className="kit-add-btn" onClick={() => openAdd('junction')}><Plus size={16} /> Add Location</button>
            )}
          </div>
          <div className="kit-table-wrap">
            <table className="kit-table">
              <thead>
                <tr>
                  <th>Name</th><th>Type</th><th>Subdivision</th><th>Coordinates</th><th>Road Type</th><th>Status</th>
                  {isSuperAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredJunctions.map(j => (
                  <tr key={j.id}>
                    <td><strong>{j.junctionName}</strong><br /><span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{j.junctionCode}</span></td>
                    <td>{j.junctionType}</td>
                    <td>{j.subdivision?.subdivisionName || '—'}</td>
                    <td style={{ fontSize: '0.78rem' }}>{j.latitude && j.longitude ? `${Number(j.latitude).toFixed(4)}, ${Number(j.longitude).toFixed(4)}` : '—'}</td>
                    <td>{j.isOneWay ? <span className="warning-text">One Way</span> : 'Two Way'}</td>
                    <td><span className={`status-pill ${j.isActive ? 'active' : 'inactive'}`}>{j.isActive ? 'Active' : 'Inactive'}</span></td>
                    {isSuperAdmin && (
                      <td>
                        <div className="action-btns">
                          <button className="btn-icon-edit" onClick={() => openEdit('junction', j)} title="Edit"><Pencil size={14} /></button>
                          <button className="btn-icon-del" onClick={() => openDel('junction', j.id, j.junctionName)} title="Delete"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {filteredJunctions.length === 0 && <tr><td colSpan={7} className="empty-state">No locations found.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── TAB: Cameras ──────────────────────────────────────────── */}
      {tab === 'cameras' && (
        <>
          <div className="kit-toolbar">
            <div className="kit-toolbar-left">
              <div className="search-input-wrap">
                <Search size={15} />
                <input placeholder="Search cameras…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            {isSuperAdmin && (
              <button className="kit-add-btn" onClick={() => openAdd('camera')}><Plus size={16} /> Add Kaaval Kit</button>
            )}
          </div>
          <div className="kit-table-wrap">
            <table className="kit-table">
              <thead>
                <tr>
                  <th>Camera</th><th>Code</th><th>Location</th><th>IP Address</th><th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCameras.map(c => (
                  <tr key={c.id}>
                    <td><strong>{c.cameraName}</strong></td>
                    <td><code style={{ fontSize: '0.78rem', background: 'var(--border-color)', padding: '2px 6px', borderRadius: 4 }}>{c.cameraCode}</code></td>
                    <td>{c.junction?.junctionName || '—'}</td>
                    <td style={{ fontSize: '0.78rem' }}>{c.ipAddress || '—'}</td>
                    <td><span className={`status-pill ${(c.status || '').toLowerCase()}`}>{c.status || 'OFFLINE'}</span></td>
                    <td>
                      <div className="action-btns">
                        <button className="btn-icon-view" onClick={() => setSelectedStream(c)} title="Live Feed"><PlayCircle size={14} style={{ color: 'var(--accent)' }} /></button>
                        {isSuperAdmin && (
                          <>
                            <button className="btn-icon-edit" onClick={() => openEdit('camera', { ...c, junctionId: c.junctionId || c.junction?.id })} title="Edit"><Pencil size={14} /></button>
                            <button className="btn-icon-del" onClick={() => openDel('camera', c.id, c.cameraName)} title="Delete"><Trash2 size={14} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredCameras.length === 0 && <tr><td colSpan={6} className="empty-state">No cameras found.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── TAB: Violation Types ──────────────────────────────────── */}
      {tab === 'vtypes' && (
        <>
          <div className="kit-toolbar">
            <div className="kit-toolbar-left">
              <div className="search-input-wrap">
                <Search size={15} />
                <input placeholder="Search violation types…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            {isSuperAdmin && (
              <button className="kit-add-btn" onClick={() => openAdd('vtype')}><Plus size={16} /> Add Violation Type</button>
            )}
          </div>
          <div className="kit-table-wrap">
            <table className="kit-table">
              <thead>
                <tr>
                  <th>Name</th><th>Code</th><th>Default Fine</th><th>Severity</th><th>Status</th>
                  {isSuperAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredVTypes.map(v => (
                  <tr key={v.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ width: 12, height: 12, borderRadius: '50%', background: v.color || '#888', display: 'inline-block', flexShrink: 0 }} />
                        <strong>{v.violationName}</strong>
                      </div>
                    </td>
                    <td><code style={{ fontSize: '0.75rem', background: 'var(--border-color)', padding: '2px 6px', borderRadius: 4 }}>{v.violationCode}</code></td>
                    <td><span className="fine-badge">₹{Number(v.defaultFine).toLocaleString('en-IN')}</span></td>
                    <td><span className={`severity-pill ${(v.severity || '').toLowerCase()}`}>{v.severity}</span></td>
                    <td><span className={`status-pill ${v.isActive ? 'active' : 'inactive'}`}>{v.isActive ? 'Active' : 'Inactive'}</span></td>
                    {isSuperAdmin && (
                      <td>
                        <div className="action-btns">
                          <button className="btn-icon-edit" onClick={() => openEdit('vtype', v)} title="Edit"><Pencil size={14} /></button>
                          <button className="btn-icon-del" onClick={() => openDel('vtype', v.id, v.violationName)} title="Deactivate"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {filteredVTypes.length === 0 && <tr><td colSpan={6} className="empty-state">No violation types found.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── MODAL: Subdivision ────────────────────────────────────── */}
      {modal === 'subdivision' && editing && (
        <SubdivisionModal
          data={editing}
          saving={saving}
          onChange={setEditing}
          onSave={() => saveSubdivision(editing)}
          onClose={closeModal}
        />
      )}

      {/* ── MODAL: Junction ───────────────────────────────────────── */}
      {modal === 'junction' && editing && (
        <JunctionModal
          data={editing}
          subdivisions={subdivisions}
          saving={saving}
          onChange={setEditing}
          onSave={() => saveJunction(editing)}
          onClose={closeModal}
        />
      )}

      {/* ── MODAL: Camera ─────────────────────────────────────────── */}
      {modal === 'camera' && editing && (
        <CameraModal
          data={editing}
          junctions={junctions}
          saving={saving}
          onChange={setEditing}
          onSave={() => saveCamera(editing)}
          onClose={closeModal}
        />
      )}

      {/* ── MODAL: Violation Type ─────────────────────────────────── */}
      {modal === 'vtype' && editing && (
        <VTypeModal
          data={editing}
          saving={saving}
          onChange={setEditing}
          onSave={() => saveVType(editing)}
          onClose={closeModal}
        />
      )}

      {/* ── MODAL: Delete Confirm ─────────────────────────────────── */}
      {modal === 'del' && delTarget && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-box confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="confirm-icon">⚠️</div>
            <p><strong>Delete "{delTarget.name}"?</strong></p>
            <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
              {delTarget.type === 'subdivision' && 'This will remove all locations and cameras within this subdivision.'}
              {delTarget.type === 'junction' && 'This will also remove all cameras attached to this location.'}
              {delTarget.type === 'camera' && 'Camera data will be removed. Associated violations will remain.'}
              {delTarget.type === 'vtype' && 'The violation type will be deactivated (historical data is preserved).'}
            </p>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={closeModal}>Cancel</button>
              <button className="btn-delete-confirm" onClick={confirmDelete} disabled={saving}>
                {saving ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Stream Modal */}
      {selectedStream && (
        <div className="modal-backdrop" onClick={() => setSelectedStream(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%' }}>
            <div className="modal-header">
              <h3><Camera size={20} style={{ marginRight: '8px' }} /> Live Feed: {selectedStream.cameraName}</h3>
              <button className="modal-close" onClick={() => setSelectedStream(null)}><XCircle size={22} /></button>
            </div>
            <div style={{ background: '#000', borderRadius: '8px', overflow: 'hidden', position: 'relative', marginTop: '16px' }}>
              {selectedStream.streamUrl ? (
                <img 
                  src={selectedStream.streamUrl} 
                  alt="Live Safety Feed" 
                  style={{ width: '100%', height: 'auto', aspectRatio: '16/9', objectFit: 'cover' }}
                  onError={(e) => {
                    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='450'><rect width='800' height='450' fill='%23111'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='22' fill='%23666'>Stream Offline</text></svg>`;
                    (e.target as HTMLImageElement).src = `data:image/svg+xml,${svg}`;
                  }}
                />
              ) : (
                <img 
                  src={`data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='450'><rect width='800' height='450' fill='%23111'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='22' fill='%23666'>Camera Not Configured</text></svg>`}
                  alt="Offline Feed" 
                  style={{ width: '100%', height: 'auto', aspectRatio: '16/9', objectFit: 'cover' }}
                />
              )}
              <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(239, 68, 68, 0.9)', color: '#fff', padding: '4px 12px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff' }}></span> LIVE
              </div>
            </div>
            <div style={{ padding: '16px 0 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)' }}>
              <div><strong style={{ color: 'var(--text-primary)' }}>Location:</strong> {selectedStream.junction?.junctionName || '—'}</div>
              <div><strong style={{ color: 'var(--text-primary)' }}>IP:</strong> {selectedStream.ipAddress || '—'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────
function SubdivisionModal({ data, saving, onChange, onSave, onClose }: any) {
  const set = (k: string, v: any) => onChange({ ...data, [k]: v });
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{data.id ? '✏️ Edit Subdivision' : '➕ Add Subdivision'}</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="form-grid">
          <div className="form-group span2">
            <label>Subdivision Name *</label>
            <input value={data.subdivisionName} onChange={e => set('subdivisionName', e.target.value)} placeholder="e.g. Nagercoil" />
          </div>
          <div className="form-group">
            <label>Code *</label>
            <input value={data.subdivisionCode} onChange={e => set('subdivisionCode', e.target.value)} placeholder="e.g. NGL" />
          </div>
          <div className="form-group">
            <label>Headquarters *</label>
            <input value={data.headquarters} onChange={e => set('headquarters', e.target.value)} placeholder="e.g. Nagercoil Town" />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" onClick={onSave} disabled={saving || !data.subdivisionName || !data.subdivisionCode || !data.headquarters}>
            {saving ? 'Saving…' : data.id ? 'Update' : 'Add Subdivision'}
          </button>
        </div>
      </div>
    </div>
  );
}

function JunctionModal({ data, subdivisions, saving, onChange, onSave, onClose }: any) {
  const set = (k: string, v: any) => onChange({ ...data, [k]: v });
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{data.id ? '✏️ Edit Location' : '➕ Add Monitoring Location'}</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="form-grid">
          <div className="form-group span2">
            <label>Location Name *</label>
            <input value={data.junctionName} onChange={e => set('junctionName', e.target.value)} placeholder="e.g. Nagercoil Roundana" />
          </div>
          <div className="form-group">
            <label>Code</label>
            <input value={data.junctionCode || ''} onChange={e => set('junctionCode', e.target.value)} placeholder="e.g. NGR-RDA-01" />
          </div>
          <div className="form-group">
            <label>Type</label>
            <select value={data.junctionType} onChange={e => set('junctionType', e.target.value)}>
              {JUNCTION_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Subdivision *</label>
            <select value={data.subdivisionId || ''} onChange={e => set('subdivisionId', e.target.value)}>
              <option value="">— Select —</option>
              {subdivisions.map((s: any) => <option key={s.id} value={s.id}>{s.subdivisionName}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Road Type</label>
            <select value={data.isOneWay ? 'true' : 'false'} onChange={e => set('isOneWay', e.target.value === 'true')}>
              <option value="false">Two Way</option>
              <option value="true">One Way</option>
            </select>
          </div>
          <div className="form-group">
            <label>Latitude</label>
            <input type="number" step="any" value={data.latitude || ''} onChange={e => set('latitude', e.target.value)} placeholder="8.1784" />
          </div>
          <div className="form-group">
            <label>Longitude</label>
            <input type="number" step="any" value={data.longitude || ''} onChange={e => set('longitude', e.target.value)} placeholder="77.4320" />
          </div>
          <div className="form-group span2">
            <label>Address</label>
            <textarea value={data.address || ''} onChange={e => set('address', e.target.value)} placeholder="Full address or landmark" />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={data.isActive ? 'true' : 'false'} onChange={e => set('isActive', e.target.value === 'true')}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" onClick={onSave} disabled={saving || !data.junctionName || !data.subdivisionId}>
            {saving ? 'Saving…' : data.id ? 'Update' : 'Add Location'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CameraModal({ data, junctions, saving, onChange, onSave, onClose }: any) {
  const set = (k: string, v: any) => onChange({ ...data, [k]: v });
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{data.id ? '✏️ Edit Kaaval Kit' : '➕ Add Kaaval Kit'}</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="form-grid">
          <div className="form-group span2">
            <label>Camera Name *</label>
            <input value={data.cameraName} onChange={e => set('cameraName', e.target.value)} placeholder="e.g. Nagercoil Kit 1" />
          </div>
          <div className="form-group">
            <label>Camera Code *</label>
            <input value={data.cameraCode} onChange={e => set('cameraCode', e.target.value)} placeholder="e.g. CAM-NGR-01" />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={data.status} onChange={e => set('status', e.target.value)}>
              {CAM_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group span2">
            <label>Location (Junction) *</label>
            <select value={data.junctionId || ''} onChange={e => set('junctionId', e.target.value)}>
              <option value="">— Select Location —</option>
              {junctions.map((j: any) => <option key={j.id} value={j.id}>{j.junctionName} ({j.subdivision?.subdivisionName})</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>IP Address</label>
            <input value={data.ipAddress || ''} onChange={e => set('ipAddress', e.target.value)} placeholder="192.168.1.x" />
          </div>
          <div className="form-group">
            <label>Stream URL</label>
            <input value={data.streamUrl || ''} onChange={e => set('streamUrl', e.target.value)} placeholder="rtsp://..." />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" onClick={onSave} disabled={saving || !data.cameraName || !data.cameraCode || !data.junctionId}>
            {saving ? 'Saving…' : data.id ? 'Update' : 'Add Kit'}
          </button>
        </div>
      </div>
    </div>
  );
}

function VTypeModal({ data, saving, onChange, onSave, onClose }: any) {
  const set = (k: string, v: any) => onChange({ ...data, [k]: v });
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{data.id ? '✏️ Edit Violation Type' : '➕ Add Violation Type'}</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="form-grid">
          <div className="form-group span2">
            <label>Violation Name *</label>
            <input value={data.violationName} onChange={e => set('violationName', e.target.value)} placeholder="e.g. No Helmet - Rider" />
          </div>
          <div className="form-group">
            <label>Code *</label>
            <input value={data.violationCode} onChange={e => set('violationCode', e.target.value)} placeholder="e.g. NO_HELMET_RIDER" />
          </div>
          <div className="form-group">
            <label>Severity</label>
            <select value={data.severity} onChange={e => set('severity', e.target.value)}>
              {SEVERITIES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Default Fine (₹)</label>
            <input type="number" value={data.defaultFine} onChange={e => set('defaultFine', Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label>Color</label>
            <div className="color-field-row">
              <input type="color" value={data.color} onChange={e => set('color', e.target.value)} />
              <input type="text" value={data.color} onChange={e => set('color', e.target.value)} placeholder="#FF4B4B" />
            </div>
          </div>
          <div className="form-group span2">
            <label>Description</label>
            <textarea value={data.description || ''} onChange={e => set('description', e.target.value)} placeholder="Brief description of this violation" />
          </div>
          {data.id && (
            <div className="form-group">
              <label>Status</label>
              <select value={data.isActive ? 'true' : 'false'} onChange={e => set('isActive', e.target.value === 'true')}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" onClick={onSave} disabled={saving || !data.violationName || !data.violationCode}>
            {saving ? 'Saving…' : data.id ? 'Update' : 'Add Type'}
          </button>
        </div>
      </div>
    </div>
  );
}
