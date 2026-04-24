import { Shield } from 'lucide-react';

const CameraConfig = () => {
  return (
    <div className="camera-config-page" style={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header" style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Shield size={22} color="#1e3a5f" />
        <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#1e3a5f' }}>Camera Configuration Engine</h2>
      </div>
      
      <div className="iframe-container" style={{ flex: 1, background: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <iframe 
          src="https://bay-wooden-availability-visible.trycloudflare.com/" 
          title="Camera Configuration"
          style={{ width: '100%', height: '100%', border: 'none' }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
    </div>
  );
};

export default CameraConfig;
