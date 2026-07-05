import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';
import {
  Shield, Camera as CameraIcon, Plus, Edit, Power,
  PowerOff, Save, X, Search, CheckCircle, AlertCircle, MapPin
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../context/AuthContext';
import './CameraConfig.css'; // Will create this

const pickerIcon = L.divIcon({
  className: 'picker-map-icon',
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

const MapPickerComponent = ({ onLocationSelected }: { onLocationSelected: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click(e) {
      onLocationSelected(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

interface CameraItem {
  id: string;
  cameraName: string;
  cameraCode: string;
  cameraDirection: string;
  status: string;
  rtspUrl?: string;
  deviceIp?: string;
  junctionId?: string;
}

const CameraConfig = () => {
  const [cameras, setCameras] = useState<CameraItem[]>([]);
  const [junctions, setJunctions] = useState<any[]>([]);
  const [subdivisions, setSubdivisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingCam, setEditingCam] = useState<CameraItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreatingJunction, setIsCreatingJunction] = useState(false);
  const [isFetchingLoc, setIsFetchingLoc] = useState(false);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [tempLocation, setTempLocation] = useState<[number, number] | null>(null);
  const [newJunction, setNewJunction] = useState({ junctionName: '', subdivisionId: '', latitude: '', longitude: '' });
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const { hasRole } = useAuth();

  const canEdit = hasRole('super_admin', 'sp', 'developer');

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchCameras = async () => {
    setLoading(true);
    try {
      const [camRes, juncRes, subRes] = await Promise.all([
        axios.get(`${API_BASE}/cameras`),
        axios.get(`${API_BASE}/cameras/junctions`),
        axios.get(`${API_BASE}/cameras/subdivisions`)
      ]);
      setCameras(camRes.data);
      setJunctions(juncRes.data);
      setSubdivisions(subRes.data);
    } catch (err) {
      showToast('error', 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCameras();
  }, []);

  const handleSave = async () => {
    if (!editingCam) return;
    if (!editingCam.cameraName || !editingCam.cameraCode || !editingCam.junctionId) {
      showToast('error', 'Camera Name, Code, and Junction are required');
      return;
    }
    try {
      if (isCreating) {
        await axios.post(`${API_BASE}/cameras`, editingCam);
        showToast('success', 'Camera created successfully');
      } else {
        await axios.patch(`${API_BASE}/cameras/${editingCam.id}`, editingCam);
        showToast('success', 'Camera updated successfully');
      }
      setEditingCam(null);
      setIsCreating(false);
      fetchCameras();
    } catch (err) {
      showToast('error', 'Failed to save camera configuration');
    }
  };

  const handleCreateJunction = async () => {
    if (!newJunction.junctionName || !newJunction.subdivisionId) {
      showToast('error', 'Name and Subdivision are required');
      return;
    }
    try {
      const payload = {
        ...newJunction,
        latitude: newJunction.latitude ? parseFloat(newJunction.latitude) : undefined,
        longitude: newJunction.longitude ? parseFloat(newJunction.longitude) : undefined,
      };
      const res = await axios.post(`${API_BASE}/cameras/junctions`, payload);
      setJunctions([...junctions, res.data]);
      setEditingCam({ ...editingCam!, junctionId: res.data.id });
      setIsCreatingJunction(false);
      setNewJunction({ junctionName: '', subdivisionId: '', latitude: '', longitude: '' });
      showToast('success', 'Junction created successfully');
    } catch (err) {
      showToast('error', 'Failed to create junction');
    }
  };

  const handleFetchLocation = async () => {
    if (!newJunction.junctionName) {
      showToast('error', 'Please enter a junction name first');
      return;
    }
    
    setIsFetchingLoc(true);
    try {
      const selectedSubdivision = subdivisions.find(s => s.id === newJunction.subdivisionId)?.subdivisionName || 'Kanyakumari';
      const query = encodeURIComponent(`${newJunction.junctionName}, ${selectedSubdivision}, Tamil Nadu`);
      const res = await axios.get(`${API_BASE}/cameras/geocode?q=${query}`);
      
      if (res.data && res.data.length > 0) {
        setNewJunction({
          ...newJunction,
          latitude: res.data[0].lat,
          longitude: res.data[0].lon
        });
        showToast('success', 'Location found');
      } else {
        showToast('error', 'Could not auto-locate this name');
      }
    } catch (err) {
      showToast('error', 'Failed to fetch location');
    } finally {
      setIsFetchingLoc(false);
    }
  };

  const toggleStatus = async (cam: CameraItem) => {
    if (!canEdit) return;
    try {
      const newStatus = cam.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
      await axios.patch(`${API_BASE}/cameras/${cam.id}`, { status: newStatus });
      showToast('success', `Camera marked as ${newStatus}`);
      fetchCameras();
    } catch (err) {
      showToast('error', 'Failed to change status');
    }
  };

  const handleDelete = async (cam: CameraItem) => {
    if (!canEdit) return;
    if (window.confirm(`Are you SURE you want to delete ${cam.cameraName}? This action cannot be undone.`)) {
      try {
        await axios.delete(`${API_BASE}/cameras/${cam.id}`);
        showToast('success', 'Camera deleted successfully');
        fetchCameras();
      } catch (err: any) {
        const msg = err.response?.data?.message || 'Failed to delete camera';
        showToast('error', typeof msg === 'string' ? msg : JSON.stringify(msg));
      }
    }
  };

  const filtered = cameras.filter(c => 
    c.cameraName?.toLowerCase().includes(search.toLowerCase()) || 
    c.cameraCode?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="camera-config-page">
      {toast && (
        <div className={`settings-toast ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      <div className="page-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Shield size={22} color="var(--primary)" />
          <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Camera Configuration</h2>
        </div>
        <div style={{ display: 'flex', gap: '15px' }}>
          <div className="search-bar" style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
            <Search size={16} color="var(--text-secondary)" style={{ marginRight: '8px' }} />
            <input 
              type="text" 
              placeholder="Search cameras..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)' }}
            />
          </div>
          {canEdit && (
            <button 
              className="btn-primary" 
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 16px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              onClick={() => { setEditingCam({} as CameraItem); setIsCreating(true); }}
            >
              <Plus size={16} /> Add Camera
            </button>
          )}
        </div>
      </div>

      <div className="camera-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {loading ? <p>Loading cameras...</p> : filtered.map(cam => (
          <div key={cam.id} className="camera-card" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: '0 0 5px 0', fontSize: '1.1rem', color: 'var(--text-primary)' }}>{cam.cameraName || 'Unnamed Camera'}</h3>
                <code style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px' }}>{cam.cameraCode}</code>
              </div>
              <span style={{ 
                padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold',
                background: cam.status === 'ONLINE' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: cam.status === 'ONLINE' ? '#22c55e' : '#ef4444'
              }}>
                {cam.status}
              </span>
            </div>
            
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <div><strong>IP:</strong> {cam.deviceIp || 'N/A'}</div>
              <div><strong>Direction:</strong> {cam.cameraDirection || 'N/A'}</div>
            </div>

            {canEdit && (
              <div style={{ display: 'flex', gap: '10px', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                <button 
                  onClick={() => { setEditingCam({ ...cam }); setIsCreating(false); }}
                  style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px', padding: '6px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-primary)' }}
                >
                  <Edit size={14} /> Edit
                </button>
                <button 
                  onClick={() => handleDelete(cam)}
                  style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px', padding: '6px', background: 'transparent', border: '1px solid #ef4444', borderRadius: '4px', cursor: 'pointer', color: '#ef4444' }}
                >
                  <X size={14} /> Delete
                </button>
                <button 
                  onClick={() => toggleStatus(cam)}
                  style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px', padding: '6px', background: 'transparent', border: `1px solid ${cam.status === 'ONLINE' ? '#ef4444' : '#22c55e'}`, borderRadius: '4px', cursor: 'pointer', color: cam.status === 'ONLINE' ? '#ef4444' : '#22c55e' }}
                >
                  {cam.status === 'ONLINE' ? <><PowerOff size={14} /> Disable</> : <><Power size={14} /> Enable</>}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {editingCam && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ background: 'var(--bg-primary)', padding: '25px', borderRadius: '12px', width: '400px', maxWidth: '90%', border: '1px solid var(--border)' }}>
            <h3 style={{ margin: '0 0 20px 0', color: 'var(--text-primary)' }}>{isCreating ? 'Add New Camera' : 'Edit Camera'}</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Camera Name</label>
                <input 
                  value={editingCam.cameraName || ''} 
                  onChange={e => setEditingCam({...editingCam, cameraName: e.target.value})}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Camera Code (KAI-CAM-XXX)</label>
                <input 
                  value={editingCam.cameraCode || ''} 
                  onChange={e => setEditingCam({...editingCam, cameraCode: e.target.value})}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Device IP</label>
                <input 
                  value={editingCam.deviceIp || ''} 
                  onChange={e => setEditingCam({...editingCam, deviceIp: e.target.value})}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Direction</label>
                <select 
                  value={editingCam.cameraDirection || ''}
                  onChange={e => setEditingCam({...editingCam, cameraDirection: e.target.value})}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                >
                  <option value="">Select Direction</option>
                  <option value="NORTH">North</option>
                  <option value="SOUTH">South</option>
                  <option value="EAST">East</option>
                  <option value="WEST">West</option>
                  <option value="ENTRY">Entry</option>
                  <option value="EXIT">Exit</option>
                  <option value="CENTER">Center</option>
                </select>
              </div>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Junction</label>
                  {!isCreatingJunction && (
                    <button 
                      onClick={() => setIsCreatingJunction(true)}
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
                    >
                      <Plus size={12} /> Add New
                    </button>
                  )}
                </div>
                
                {isCreatingJunction ? (
                  <div style={{ background: 'var(--bg-secondary)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                    <input 
                      placeholder="Junction Name"
                      value={newJunction.junctionName}
                      onChange={e => setNewJunction({...newJunction, junctionName: e.target.value})}
                      style={{ width: '100%', padding: '6px', marginBottom: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                    />
                    <select 
                      value={newJunction.subdivisionId}
                      onChange={e => setNewJunction({...newJunction, subdivisionId: e.target.value})}
                      style={{ width: '100%', padding: '6px', marginBottom: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                    >
                      <option value="">Select Subdivision</option>
                      {subdivisions.map(s => <option key={s.id} value={s.id}>{s.subdivisionName}</option>)}
                    </select>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <input 
                        placeholder="Lat (e.g. 8.18)"
                        value={newJunction.latitude}
                        onChange={e => setNewJunction({...newJunction, latitude: e.target.value})}
                        style={{ flex: 1, padding: '6px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                      />
                      <input 
                        placeholder="Lng (e.g. 77.41)"
                        value={newJunction.longitude}
                        onChange={e => setNewJunction({...newJunction, longitude: e.target.value})}
                        style={{ flex: 1, padding: '6px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                      />
                      <button 
                        type="button"
                        onClick={handleFetchLocation}
                        disabled={isFetchingLoc}
                        title="Auto-fetch coordinates"
                        style={{ padding: '6px 10px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Search size={12} /> {isFetchingLoc ? '...' : 'Auto'}
                      </button>
                      {hasRole('super_admin') && (
                        <button 
                          type="button"
                          onClick={() => {
                            setTempLocation(newJunction.latitude && newJunction.longitude ? [parseFloat(newJunction.latitude), parseFloat(newJunction.longitude)] : [8.19, 77.41]);
                            setIsMapPickerOpen(true);
                          }}
                          title="Pick on Map"
                          style={{ padding: '6px 10px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <MapPin size={12} /> Map
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button onClick={handleCreateJunction} style={{ flex: 1, padding: '4px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Save Junction</button>
                      <button onClick={() => setIsCreatingJunction(false)} style={{ flex: 1, padding: '4px', background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <select 
                    value={editingCam.junctionId || ''}
                    onChange={e => setEditingCam({...editingCam, junctionId: e.target.value})}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                  >
                    <option value="">Select Junction</option>
                    {junctions.map(j => (
                      <option key={j.id} value={j.id}>{j.junctionName} ({j.subdivision?.subdivisionName})</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '25px' }}>
              <button 
                onClick={() => setEditingCam(null)}
                style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-primary)' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 16px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >
                <Save size={16} /> Save
              </button>
            </div>
          </div>
        </div>
      )}

      {isMapPickerOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <div className="modal-content" style={{ background: 'var(--bg-primary)', padding: '20px', borderRadius: '12px', width: '800px', maxWidth: '95%', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Pick Location on Map</h3>
              <button onClick={() => setIsMapPickerOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Click anywhere on the map to place the pin.</p>
            <div style={{ height: '400px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
              <MapContainer 
                center={tempLocation || [8.19, 77.41]} 
                zoom={13} 
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapPickerComponent onLocationSelected={(lat, lng) => setTempLocation([lat, lng])} />
                {tempLocation && <Marker position={tempLocation} icon={pickerIcon} />}
              </MapContainer>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                {tempLocation ? `Selected: ${tempLocation[0].toFixed(6)}, ${tempLocation[1].toFixed(6)}` : 'No location selected'}
              </span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setIsMapPickerOpen(false)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-primary)' }}>Cancel</button>
                <button 
                  onClick={() => {
                    if (tempLocation) {
                      setNewJunction({ ...newJunction, latitude: tempLocation[0].toString(), longitude: tempLocation[1].toString() });
                      setIsMapPickerOpen(false);
                    }
                  }}
                  disabled={!tempLocation}
                  style={{ padding: '8px 16px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: tempLocation ? 'pointer' : 'not-allowed', opacity: tempLocation ? 1 : 0.5 }}
                >
                  Confirm Location
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraConfig;
