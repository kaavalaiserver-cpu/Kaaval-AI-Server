import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';
import type { ViolationStats, ViolationItem, CameraStatus } from '../types';
import {
  Camera,
  AlertTriangle,
  Clock,
  CheckCircle,
  Shield,
  Eye,
  TrendingUp,
  MapPin,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import HeatmapLayer from '../components/HeatmapLayer';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../context/AuthContext';
import './Dashboard.css';

const KANYAKUMARI_CENTER: [number, number] = [8.0883, 77.5385];
const DISTRICT_BOUNDS = L.latLngBounds(
  L.latLng(7.9, 77.2),
  L.latLng(8.4, 77.7),
);

const FULL_ACCESS_ROLES: Role[] = ['super_admin', 'traffic_admin', 'dev_admin'];

type LngLat = [number, number];

interface MapScope {
  name: string;
  center: [number, number];
  bounds: L.LatLngBounds;
  keywords: string[];
  polygon?: LngLat[];
}

const makeBoundsFromPolygon = (polygon: LngLat[]) =>
  L.latLngBounds(polygon.map(([lng, lat]) => L.latLng(lat, lng)));

const pointInPolygon = (point: LngLat, polygon: LngLat[]) => {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersects =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON) + xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
};

const DISTRICT_SCOPE: MapScope = {
  name: 'Kanyakumari District',
  center: KANYAKUMARI_CENTER,
  bounds: DISTRICT_BOUNDS,
  keywords: ['kanyakumari'],
};

const SUBDIVISION_SCOPES: Record<
  Exclude<Role, 'super_admin' | 'traffic_admin' | 'dev_admin'>,
  MapScope
> = {
  colachel_admin: {
    name: 'Colachel',
    center: [8.17, 77.24],
    polygon: [
      [77.172, 8.082],
      [77.21, 8.12],
      [77.265, 8.132],
      [77.302, 8.112],
      [77.332, 8.14],
      [77.335, 8.19],
      [77.308, 8.226],
      [77.252, 8.236],
      [77.206, 8.224],
      [77.168, 8.192],
    ],
    bounds: L.latLngBounds(L.latLng(8.08, 77.16), L.latLng(8.24, 77.34)),
    keywords: ['colachel'],
  },
  marthandam_admin: {
    name: 'Marthandam',
    center: [8.31, 77.22],
    polygon: [
      [77.145, 8.228],
      [77.2, 8.218],
      [77.252, 8.236],
      [77.282, 8.272],
      [77.312, 8.306],
      [77.304, 8.36],
      [77.246, 8.392],
      [77.184, 8.382],
      [77.136, 8.334],
      [77.128, 8.278],
    ],
    bounds: L.latLngBounds(L.latLng(8.22, 77.12), L.latLng(8.4, 77.32)),
    keywords: ['marthandam'],
  },
  nagercoil_admin: {
    name: 'Nagercoil',
    center: [8.19, 77.41],
    polygon: [
      [77.328, 8.132],
      [77.366, 8.116],
      [77.41, 8.122],
      [77.454, 8.148],
      [77.478, 8.188],
      [77.472, 8.238],
      [77.428, 8.274],
      [77.372, 8.282],
      [77.326, 8.246],
      [77.31, 8.19],
    ],
    bounds: L.latLngBounds(L.latLng(8.11, 77.31), L.latLng(8.29, 77.48)),
    keywords: ['nagercoil', 'ramanputhoor'],
  },
  kanyakumari_admin: {
    name: 'Kanyakumari',
    center: [8.1, 77.55],
    polygon: [
      [77.39, 7.982],
      [77.444, 8.002],
      [77.506, 8.028],
      [77.566, 8.066],
      [77.624, 8.112],
      [77.65, 8.162],
      [77.63, 8.212],
      [77.566, 8.226],
      [77.504, 8.206],
      [77.448, 8.168],
      [77.404, 8.116],
      [77.386, 8.056],
    ],
    bounds: L.latLngBounds(L.latLng(7.98, 77.38), L.latLng(8.23, 77.66)),
    keywords: ['kanyakumari', 'cape'],
  },
  thuckalay_admin: {
    name: 'Thuckalay',
    center: [8.25, 77.3],
    polygon: [
      [77.234, 8.162],
      [77.276, 8.152],
      [77.322, 8.17],
      [77.358, 8.21],
      [77.372, 8.258],
      [77.352, 8.304],
      [77.304, 8.328],
      [77.252, 8.318],
      [77.216, 8.284],
      [77.206, 8.228],
    ],
    bounds: L.latLngBounds(L.latLng(8.15, 77.2), L.latLng(8.33, 77.38)),
    keywords: ['thuckalay'],
  },
};

for (const scope of Object.values(SUBDIVISION_SCOPES)) {
  if (scope.polygon) {
    scope.bounds = makeBoundsFromPolygon(scope.polygon);
  }
}

const WORLD_RING: [number, number][] = [
  [90, -180],
  [90, 180],
  [-90, 180],
  [-90, -180],
];

const toLatLngRing = (ring: number[][]): L.LatLngExpression[] =>
  ring.map(([lng, lat]) => [lat, lng]);

const getMaskHolesFromGeoJson = (geoJson: any): L.LatLngExpression[][] => {
  const holes: L.LatLngExpression[][] = [];

  const collectFromGeometry = (geometry: any) => {
    if (!geometry?.type || !geometry?.coordinates) return;

    if (geometry.type === 'Polygon') {
      for (const ring of geometry.coordinates as number[][][]) {
        holes.push(toLatLngRing(ring));
      }
      return;
    }

    if (geometry.type === 'MultiPolygon') {
      for (const polygon of geometry.coordinates as number[][][][]) {
        for (const ring of polygon) {
          holes.push(toLatLngRing(ring));
        }
      }
    }
  };

  if (geoJson?.type === 'FeatureCollection' && Array.isArray(geoJson.features)) {
    for (const feature of geoJson.features) {
      collectFromGeometry(feature?.geometry);
    }
  } else if (geoJson?.type === 'Feature') {
    collectFromGeometry(geoJson.geometry);
  } else {
    collectFromGeometry(geoJson);
  }

  return holes;
};

const KanyakumariMapControl = ({
  center,
  bounds,
  geoJsonUrl,
  subdivisionPolygon,
}: {
  center: [number, number];
  bounds: L.LatLngBounds;
  geoJsonUrl?: string;
  subdivisionPolygon?: LngLat[];
}) => {
  const map = useMap();

  useEffect(() => {
    let geoLayer: L.GeoJSON | null = null;
    let maskLayer: L.Polygon | null = null;
    let polygonOutline: L.Polygon | null = null;
    let cancelled = false;

    map.setView(center, 11);
    map.setMinZoom(10);
    map.setMaxZoom(16);
    map.setMaxBounds(bounds);
    map.options.maxBoundsViscosity = 1.0;

    if (subdivisionPolygon && subdivisionPolygon.length >= 3) {
      const hole = subdivisionPolygon.map(([lng, lat]) => [lat, lng]) as L.LatLngExpression[];

      maskLayer = L.polygon([WORLD_RING, hole], {
        color: '#2f4858',
        weight: 0,
        fillColor: '#2f4858',
        fillOpacity: 0.28,
        interactive: false,
      }).addTo(map);

      polygonOutline = L.polygon(hole, {
        color: '#0f4c81',
        weight: 2,
        fillOpacity: 0.04,
      }).addTo(map);
      map.fitBounds(polygonOutline.getBounds());
      map.setMaxBounds(polygonOutline.getBounds());
    } else if (geoJsonUrl) {
      fetch(geoJsonUrl)
        .then((res) => {
          if (!res.ok) throw new Error('GeoJSON not found');
          return res.json();
        })
        .then((data) => {
          if (cancelled) return;

          const maskHoles = getMaskHolesFromGeoJson(data);
          if (maskHoles.length > 0) {
            maskLayer = L.polygon([WORLD_RING, ...maskHoles], {
              color: '#2f4858',
              weight: 0,
              fillColor: '#2f4858',
              fillOpacity: 0.28,
              interactive: false,
            }).addTo(map);
          }

          geoLayer = L.geoJSON(data, {
            style: { color: '#0f4c81', weight: 2, fillOpacity: 0.04 },
          }).addTo(map);
          map.fitBounds(geoLayer.getBounds());
          map.setMaxBounds(geoLayer.getBounds());
        })
        .catch(() => {
          // Optional district boundary file; ignore if missing.
        });
    }

    return () => {
      cancelled = true;
      if (geoLayer) {
        map.removeLayer(geoLayer);
      }
      if (maskLayer) {
        map.removeLayer(maskLayer);
      }
      if (polygonOutline) {
        map.removeLayer(polygonOutline);
      }
    };
  }, [map, center, bounds, geoJsonUrl, subdivisionPolygon]);

  return null;
};

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<ViolationStats | null>(null);
  const [recentViolations, setRecentViolations] = useState<ViolationItem[]>([]);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus | null>(null);
  const navigate = useNavigate();

  const mapScope = useMemo<MapScope>(() => {
    if (!user || FULL_ACCESS_ROLES.includes(user.role)) {
      return DISTRICT_SCOPE;
    }
    return SUBDIVISION_SCOPES[user.role as Exclude<Role, 'super_admin' | 'traffic_admin' | 'dev_admin'>] ?? DISTRICT_SCOPE;
  }, [user]);

  const canUseDistrictFeatures = !!user && FULL_ACCESS_ROLES.includes(user.role);

  const isInScope = (lat?: number | null, lng?: number | null, location?: string | null) => {
    if (canUseDistrictFeatures) return true;

    if (typeof lat === 'number' && typeof lng === 'number' && mapScope.polygon) {
      return pointInPolygon([lng, lat], mapScope.polygon);
    }

    const loc = (location ?? '').toLowerCase();
    return mapScope.keywords.some((k) => loc.includes(k));
  };

  useEffect(() => {
    const fetchAll = async (background = false) => {
      // Skip if page is hidden to save resources
      if (background && document.visibilityState !== 'visible') return;

      const [statsRes, violationsRes, camerasRes, systemRes] = await Promise.allSettled([
        axios.get<ViolationStats>(`${API_BASE}/violations/stats`),
        axios.get<{ data: ViolationItem[] }>(`${API_BASE}/violations?limit=5`),
        axios.get<CameraStatus>(`${API_BASE}/cameras/status`),
        axios.get<{ camerasOnline?: number; camerasOffline?: number }>(`${API_BASE}/system/status`),
      ]);

      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data);
      }

      if (violationsRes.status === 'fulfilled') {
        const data = violationsRes.value.data.data ?? (violationsRes.value.data as unknown as ViolationItem[]);
        setRecentViolations(Array.isArray(data) ? data : []);
      }

      if (camerasRes.status === 'fulfilled') {
        setCameraStatus(camerasRes.value.data);
      } else if (systemRes.status === 'fulfilled') {
        const online = systemRes.value.data.camerasOnline ?? 0;
        const offline = systemRes.value.data.camerasOffline ?? 0;
        setCameraStatus((prev) => ({
          total: online + offline,
          online,
          offline,
          cameras: prev?.cameras ?? [],
        }));
      }
    };
    fetchAll();
    const interval = setInterval(() => fetchAll(true), 3000);
    return () => clearInterval(interval);
  }, []);

  const todayCount = stats?.total ?? 0;
  const pendingCount = stats?.pending ?? 0;
  const finesCount = stats?.verified ?? 0;
  const helmetRate = stats?.by_type
    ? Math.round((1 - (stats.by_type['No Helmet'] ?? 0) / Math.max(todayCount, 1)) * 100)
    : 95;

  const cameraIcon = useMemo(
    () =>
      L.divIcon({
        className: 'camera-map-icon',
        html: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14],
      }),
    [],
  );

  const visibleCameras = useMemo(() => {
    if (!cameraStatus?.cameras) return [];
    return cameraStatus.cameras.filter((c) => isInScope(c.gps_lat ?? null, c.gps_lng ?? null, c.location));
  }, [cameraStatus, mapScope, canUseDistrictFeatures]);

  const heatPoints = useMemo<[number, number, number][]>(() => {
    return visibleCameras
      .filter((c) => c.gps_lat && c.gps_lng)
      .map((c) => [c.gps_lat!, c.gps_lng!, (c.violation_count ?? 0) + 0.3]);
  }, [visibleCameras]);

  const visibleRecentViolations = useMemo(() => {
    const filtered = recentViolations.filter((v) => isInScope(v.gps_lat, v.gps_lng, v.location));
    return filtered.slice(0, 5);
  }, [recentViolations, mapScope, canUseDistrictFeatures]);

  const visibleOnline = visibleCameras.filter((c) => c.status === 'online').length;
  const visibleOffline = Math.max(0, visibleCameras.length - visibleOnline);

  return (
    <div className="dashboard-page">
      {/* Overview Widgets */}
      <div className="widget-grid">
        <WidgetCard
          icon={<Camera size={22} />}
          label="Cameras Active"
          value={String(canUseDistrictFeatures ? (cameraStatus?.online ?? 0) : visibleOnline)}
          sub={`of ${canUseDistrictFeatures ? (cameraStatus?.total ?? 0) : visibleCameras.length} total`}
          color="blue"
        />
        <WidgetCard
          icon={<AlertTriangle size={22} />}
          label="Violations Detected"
          value={String(todayCount)}
          sub="Total"
          color="red"
        />
        <WidgetCard
          icon={<Clock size={22} />}
          label="Pending Review"
          value={String(pendingCount)}
          sub="Awaiting action"
          color="orange"
        />
        <WidgetCard
          icon={<CheckCircle size={22} />}
          label="Fines Issued"
          value={String(finesCount)}
          sub="Challans issued"
          color="green"
        />
        <WidgetCard
          icon={<Shield size={22} />}
          label="Helmet Compliance"
          value={`${helmetRate}%`}
          sub="Detection rate"
          color="purple"
        />
      </div>

      {/* Camera Map with Heatmap */}
      <div className="dash-card map-card">
        <div className="card-header">
          <h3><MapPin size={18} /> {canUseDistrictFeatures ? 'Camera Network & Violation Heatmap' : `${mapScope.name} Subdivision Map`}</h3>
          {canUseDistrictFeatures && (
            <button className="link-btn" onClick={() => navigate('/cameras')}>
              All Cameras
            </button>
          )}
        </div>
        <div className="map-container">
          <MapContainer
            center={KANYAKUMARI_CENTER}
            zoom={11}
            minZoom={10}
            maxZoom={16}
            maxBounds={mapScope.bounds}
            scrollWheelZoom
            style={{ height: '400px', width: '100%', borderRadius: '8px' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <KanyakumariMapControl
              center={mapScope.center}
              bounds={mapScope.bounds}
              geoJsonUrl={canUseDistrictFeatures ? '/kanyakumari.geojson' : undefined}
              subdivisionPolygon={!canUseDistrictFeatures ? mapScope.polygon : undefined}
            />
            {visibleCameras
              .filter((c) => c.gps_lat && c.gps_lng)
              .map((cam) => (
                <Marker key={cam.id} position={[cam.gps_lat!, cam.gps_lng!]} icon={cameraIcon}>
                  <Popup>
                    <div className="cam-popup">
                      <strong>{cam.location}</strong>
                      <span>{cam.camera_id ?? cam.cameraId}</span>
                      <span className={`cam-popup-status ${cam.status}`}>
                        {cam.status === 'online' ? '● Online' : '● Offline'}
                      </span>
                      <span>Violations: {cam.violation_count ?? cam.violationCount ?? 0}</span>
                    </div>
                  </Popup>
                </Marker>
              ))}
            {heatPoints.length > 0 && <HeatmapLayer points={heatPoints} />}
          </MapContainer>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Real-Time Alerts */}
        <div className="dash-card alerts-card">
          <div className="card-header">
            <h3><AlertTriangle size={18} /> Real-Time Alerts</h3>
            {canUseDistrictFeatures && (
              <button className="link-btn" onClick={() => navigate('/violations')}>
                View All
              </button>
            )}
          </div>
          <div className="alerts-list">
            {visibleRecentViolations.length === 0 ? (
              <div className="empty-state">No recent violations</div>
            ) : (
              visibleRecentViolations.map((v) => (
                <div key={v.id} className="alert-item">
                  <div className="alert-thumb">
                    {v.image_url ? (
                      <img src={v.image_url} alt="Evidence" />
                    ) : (
                      <div className="no-img"><Camera size={20} /></div>
                    )}
                  </div>
                  <div className="alert-info">
                    <span className="alert-type">{v.type}</span>
                    <span className="alert-plate">{v.vehicle_number}</span>
                    <span className="alert-meta">
                      {v.location} &bull; {new Date(v.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  {canUseDistrictFeatures && (
                    <button
                      className="btn-review"
                      onClick={() => navigate('/review')}
                    >
                      <Eye size={14} /> Review
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Analytics */}
        <div className="dash-card stats-card">
          <div className="card-header">
            <h3><TrendingUp size={18} /> Violation Breakdown</h3>
          </div>
          <div className="type-breakdown">
            {stats?.by_type &&
              Object.entries(stats.by_type)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => (
                  <div key={type} className="type-row">
                    <span className="type-label">{type}</span>
                    <div className="type-bar-container">
                      <div
                        className="type-bar"
                        style={{
                          width: `${Math.min((count / Math.max(todayCount, 1)) * 100, 100)}%`,
                        }}
                      />
                    </div>
                    <span className="type-count">{count}</span>
                  </div>
                ))}
          </div>
        </div>

        {/* Camera Status */}
        <div className="dash-card camera-card">
          <div className="card-header">
            <h3><Camera size={18} /> Camera Status</h3>
            {canUseDistrictFeatures && (
              <button className="link-btn" onClick={() => navigate('/cameras')}>
                Details
              </button>
            )}
          </div>
          <div className="camera-summary">
            <div className="cam-stat online">
              <span className="cam-num">{canUseDistrictFeatures ? (cameraStatus?.online ?? 0) : visibleOnline}</span>
              <span>Online</span>
            </div>
            <div className="cam-stat offline">
              <span className="cam-num">{canUseDistrictFeatures ? (cameraStatus?.offline ?? 0) : visibleOffline}</span>
              <span>Offline</span>
            </div>
          </div>
          <div className="camera-list-mini">
            {visibleCameras.slice(0, 5).map((cam) => (
              <div key={cam.id} className="cam-row">
                <span className={`cam-dot ${cam.status}`}></span>
                <span className="cam-name">{cam.location}</span>
                <span className="cam-id">{cam.camera_id}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

interface WidgetProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: string;
}

const WidgetCard = ({ icon, label, value, sub, color }: WidgetProps) => (
  <div className={`widget-card ${color}`}>
    <div className="widget-icon">{icon}</div>
    <div className="widget-info">
      <span className="widget-value">{value}</span>
      <span className="widget-label">{label}</span>
      <span className="widget-sub">{sub}</span>
    </div>
  </div>
);

export default Dashboard;
