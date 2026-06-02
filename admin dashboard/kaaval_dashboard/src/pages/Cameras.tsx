import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';
import type { CameraItem } from '../types';
import {
  Camera,
  MapPin,
  Wifi,
  WifiOff,
  RefreshCw,
  LayoutGrid,
  List,
  PlayCircle,
  XCircle
} from 'lucide-react';
import './Cameras.css';

const Cameras = () => {
  const [cameras, setCameras] = useState<CameraItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [selectedStream, setSelectedStream] = useState<CameraItem | null>(null);

  const fetchCameras = async () => {
    setLoading(true);
    try {
      const res = await axios.get<CameraItem[]>(`${API_BASE}/cameras`);
      setCameras(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCameras(); }, []);

  const activeCount = cameras.filter((c) => c.status === 'active' || c.status === 'online').length;
  const offlineCount = cameras.filter((c) => c.status === 'offline' || c.status === 'inactive').length;

  return (
    <div className="cameras-page">
      {/* Live Stream Modal */}
      {selectedStream && (
        <div className="modal-backdrop" onClick={() => setSelectedStream(null)}>
          <div className="modal-content video-modal" onClick={e => e.stopPropagation()}>
             <div className="modal-header">
              <h3><Camera size={20} /> Live Feed: {selectedStream.location}</h3>
              <button className="btn-close" onClick={() => setSelectedStream(null)}><XCircle size={24} /></button>
            </div>
            <div className="video-player-container">
                {/* Dynamic Stream URL or Fallback */}
                {selectedStream.streamUrl ? (
                  <img 
                      src={selectedStream.streamUrl} 
                      alt="Live Safety Feed" 
                      className="live-video-feed"
                      onError={(e) => {
                          const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='450'><rect width='800' height='450' fill='%23111'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='22' fill='%23666'>Stream Offline</text></svg>`;
                          (e.target as HTMLImageElement).src = `data:image/svg+xml,${svg}`;
                      }}
                  />
                ) : (
                  <img 
                      src={`data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='450'><rect width='800' height='450' fill='%23111'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='22' fill='%23666'>Camera Not Configured</text></svg>`}
                      alt="Offline Feed" 
                      className="live-video-feed"
                  />
                )}
                <div className="live-indicator">
                    <span className="dot"></span> LIVE
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="cameras-header">
        <div className="cameras-header-left">
          <h2><Camera size={22} /> Camera Monitoring</h2>
          <div className="camera-counts">
            <span className="cam-count online">
              <Wifi size={14} /> {activeCount} Online
            </span>
            <span className="cam-count offline">
              <WifiOff size={14} /> {offlineCount} Offline
            </span>
          </div>
        </div>
        <div className="cameras-header-right">
          <div className="view-toggle">
            <button
              className={view === 'grid' ? 'active' : ''}
              onClick={() => setView('grid')}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              className={view === 'list' ? 'active' : ''}
              onClick={() => setView('list')}
            >
              <List size={16} />
            </button>
          </div>
          <button className="btn-secondary" onClick={fetchCameras}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="cameras-loading">Loading cameras...</div>
      ) : cameras.length === 0 ? (
        <div className="cameras-loading">No cameras configured</div>
      ) : view === 'grid' ? (
        <div className="cameras-grid">
          {cameras.map((cam) => (
            <CameraCard key={cam.id} camera={cam} onPlay={() => setSelectedStream(cam)} />
          ))}
        </div>
      ) : (
        <div className="cameras-list">
          <table>
            <thead>
              <tr>
                <th>Camera ID</th>
                <th>Location</th>
                <th>Status</th>
                <th>Violations Today</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {cameras.map((cam) => {
                const isOnline = cam.status === 'active' || cam.status === 'online';
                return (
                  <tr key={cam.id}>
                    <td className="cam-id-cell">{cam.cameraId ?? cam.id}</td>
                    <td>
                      <span className="cam-location"><MapPin size={13} /> {cam.location}</span>
                    </td>
                    <td>
                      <span className={`cam-status-badge ${isOnline ? 'online' : 'offline'}`}>
                        {isOnline ? 'Online' : 'Offline'}
                      </span>
                    </td>
                    <td>{cam.violationCount ?? 0}</td>
                    <td>
                        <button className="btn-text" onClick={() => setSelectedStream(cam)}>
                            <PlayCircle size={16} /> View
                        </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const CameraCard = ({ camera, onPlay }: { camera: CameraItem, onPlay: () => void }) => {
  const isOnline = camera.status === 'active' || camera.status === 'online';

  return (
    <div className={`camera-card ${isOnline ? 'online' : 'offline'}`}>
      <div className="cam-preview" onClick={onPlay}>
            <div className="play-overlay">
                <PlayCircle size={48} />
            </div>
           <div className="cam-thumb-placeholder"></div>
      </div>
      
      <div className="cam-card-body">
        <div className="cam-card-header-row">
            <span className="cam-card-id">{camera.cameraId ?? camera.id}</span>
            <span className={`cam-dot ${isOnline ? 'on' : 'off'}`} />
        </div>
        <div className="cam-card-location">
          <MapPin size={14} />
          {camera.location}
        </div>
        <div className="cam-card-stats">
          <div className="cam-stat">
            <span className="cam-stat-val">{camera.violationCount ?? 0}</span>
            <span className="cam-stat-lbl">Violations</span>
          </div>
          <div className="cam-stat">
            <span className={`cam-stat-val ${isOnline ? 'green' : 'red'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
            <span className="cam-stat-lbl">Status</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cameras;
