import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';
import type { AnalyticsSummary, PeakHoursData, CameraEfficiencyData, HeatmapData } from '../types';
import {
  BarChart3,
  RefreshCw,
  MapPin,
  Clock,
  Activity,
  Zap,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import HeatmapLayer from '../components/HeatmapLayer';
import './Analytics.css';

const KANYAKUMARI_CENTER: [number, number] = [8.0883, 77.5385];
const KANYAKUMARI_BOUNDS = L.latLngBounds(
  L.latLng(7.9, 77.2),
  L.latLng(8.4, 77.7),
);

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

const KanyakumariMapControl = ({ geoJsonUrl }: { geoJsonUrl?: string }) => {
  const map = useMap();

  useEffect(() => {
    let geoLayer: L.GeoJSON | null = null;
    let maskLayer: L.Polygon | null = null;
    let cancelled = false;

    map.setView(KANYAKUMARI_CENTER, 11);
    map.setMinZoom(10);
    map.setMaxZoom(16);
    map.setMaxBounds(KANYAKUMARI_BOUNDS);
    map.options.maxBoundsViscosity = 1.0;

    if (geoJsonUrl) {
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
    };
  }, [map, geoJsonUrl]);

  return null;
};

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  ArcElement, Title, Tooltip, Legend, Filler,
);

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { labels: { color: '#4a5568' } } },
  scales: {
    x: { ticks: { color: '#4a5568' }, grid: { color: 'rgba(0,0,0,0.06)' } },
    y: { ticks: { color: '#4a5568' }, grid: { color: 'rgba(0,0,0,0.06)' } },
  },
};

const Analytics = () => {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [peakHours, setPeakHours] = useState<PeakHoursData[]>([]);
  const [efficiency, setEfficiency] = useState<CameraEfficiencyData[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
        const [sumRes, peakRes, effRes, heatRes] = await Promise.all([
            axios.get<AnalyticsSummary>(`${API_BASE}/analytics/summary`),
            axios.get<PeakHoursData[]>(`${API_BASE}/analytics/peak-hours`),
            axios.get<CameraEfficiencyData[]>(`${API_BASE}/analytics/camera-efficiency`),
            axios.get<HeatmapData[]>(`${API_BASE}/analytics/heatmap`),
        ]);
        setData(sumRes.data);
        setPeakHours(peakRes.data);
        setEfficiency(effRes.data);
        setHeatmap(heatRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading || !data) {
    return (
      <div className="analytics-page">
        <div className="analytics-loading">Loading analytics...</div>
      </div>
    );
  }

  /* Violations by Day */
  const dailyChart = {
    labels: data.violationsByDay.map((d: { date: string }) => d.date),
    datasets: [
      {
        label: 'Violations',
        data: data.violationsByDay.map((d: { count: number }) => d.count),
        backgroundColor: 'rgba(11, 58, 110, 0.7)',
        borderColor: '#1e6fd9',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  /* Violations by Camera */
  const cameraChart = {
    labels: data.violationsByCamera.map((c: { camera_id: string }) => c.camera_id),
    datasets: [
      {
        label: 'Count',
        data: data.violationsByCamera.map((c: { count: number }) => c.count),
        backgroundColor: [
          '#1e6fd9', '#e31b23', '#f59e0b', '#22c55e', '#a78bfa',
          '#06b6d4', '#f97316', '#ec4899',
        ],
      },
    ],
  };

  /* Peak Hours */
  const hourLabels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
  const hourData = new Array(24).fill(0);
  (peakHours.length ? peakHours : data.peakHours).forEach((h: { hour: string | number; count: number }) => {
    // Handle both string hour (from summary) and number hour
    hourData[Number(h.hour)] = h.count;
  });

  const peakChart = {
    labels: hourLabels,
    datasets: [
      {
        label: 'Violations',
        data: hourData,
        fill: true,
        borderColor: '#e31b23',
        backgroundColor: 'rgba(227, 27, 35, 0.12)',
        pointRadius: 2,
        tension: 0.4,
      },
    ],
  };

  /* Camera Efficiency */
  const efficiencyChart = {
    labels: efficiency.map((e) => e.camera_id),
    datasets: [
      {
        label: 'Valid Challans',
        data: efficiency.map((e) => e.challans_issued),
        backgroundColor: '#22c55e',
      },
      {
        label: 'Rejected',
        data: efficiency.map((e) => e.rejected_count),
        backgroundColor: '#e31b23',
      },
      {
        label: 'Total',
        data: efficiency.map((e) => e.total_violations),
        backgroundColor: '#1e6fd9',
        hidden: true,
      },
    ],
  };

  /* Helmet Compliance */
  const helmetChart = {
    labels: ['Helmet Worn', 'No Helmet'],
    datasets: [
      {
        data: [
            parseFloat(data.helmetComplianceRate + '' || '0'),
            100 - parseFloat(data.helmetComplianceRate + '' || '0'),
        ],
        backgroundColor: ['#22c55e', '#e31b23'],
        borderWidth: 0,
      },
    ],
  };

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <h2><BarChart3 size={22} /> Police Analytics Dashboard</h2>
        <button className="btn-secondary" onClick={fetchData}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* KPI Row */}
      <div className="kpi-row">
        <KPI label="Total Violations" value={data.totalViolations} />
        <KPI label="Cameras Active" value={data.camerasActive} />
        <KPI label="Helmet Compliance" value={`${data.helmetComplianceRate}%`} />
        <KPI
          label="Peak Hour"
          value={
            data.peakHours.length > 0
              ? `${data.peakHours.reduce(
                  (max: { hour: number; count: number }, h: { hour: number; count: number }) => (h.count > max.count ? h : max),
                  data.peakHours[0],
                ).hour}:00`
              : '—'
          }
        />
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        <div className="chart-card full">
          <h3>Violations by Day</h3>
          <div className="chart-wrap tall">
            <Bar data={dailyChart} options={chartDefaults as never} />
          </div>
        </div>

        {/* Heatmap Section */}
        {heatmap && heatmap.length > 0 && (
          <div className="chart-card full" style={{ minHeight: 400 }}>
            <h3><MapPin size={18} style={{marginRight: 8}}/> Violation Heatmap</h3>
            <div className="chart-wrap tall" style={{ borderRadius: 8, overflow: 'hidden', height: 400 }}>
                <MapContainer
                  center={KANYAKUMARI_CENTER}
                  zoom={11}
                  minZoom={10}
                  maxZoom={16}
                  maxBounds={KANYAKUMARI_BOUNDS}
                  style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <KanyakumariMapControl geoJsonUrl="/kanyakumari.geojson" />
                    <HeatmapLayer points={heatmap.map(p => [p.lat, p.lng, p.weight ?? 1]) as [number,number,number][]} />
                </MapContainer>
            </div>
          </div>
        )}

        <div className="chart-card">
          <h3 title="Violations by hour of day"><Clock size={16} style={{marginRight: 8}}/> Peak Hours</h3>
          <div className="chart-wrap">
            <Line data={peakChart} options={chartDefaults as never} />
          </div>
        </div>

        <div className="chart-card">
           <h3 title="Valid Tickets vs Rejected"><Zap size={16} style={{marginRight: 8}}/> Camera Efficiency</h3>
           <div className="chart-wrap">
             <Bar data={efficiencyChart} options={{
                 responsive: true,
                 maintainAspectRatio: false,
                 scales: {
                     x: { stacked: true },
                     y: { stacked: true },
                 }
             } as never} />
           </div>
        </div>
        
        <div className="chart-card">
          <h3>Violations by Camera</h3>
          <div className="chart-wrap">
            <Bar data={cameraChart} options={chartDefaults as never} />
          </div>
        </div>

        <div className="chart-card narrow">
          <h3>Helmet Compliance</h3>
          <div className="chart-wrap doughnut">
            <Doughnut
              data={helmetChart}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: { legend: { position: 'bottom', labels: { color: '#4a5568' } } },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const KPI = ({ label, value }: { label: string; value: string | number }) => (
  <div className="kpi-card">
    <span className="kpi-value">{value}</span>
    <span className="kpi-label">{label}</span>
  </div>
);

export default Analytics;
