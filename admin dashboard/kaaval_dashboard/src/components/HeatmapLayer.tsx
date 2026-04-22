import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

interface HeatmapLayerProps {
  points: [number, number, number][]; // [lat, lng, intensity]
  options?: Record<string, unknown>;
}

const HeatmapLayer = ({ points, options = {} }: HeatmapLayerProps) => {
  const map = useMap();

  useEffect(() => {
    const heat = (L as any).heatLayer(points, {
      radius: 30,
      blur: 20,
      maxZoom: 17,
      gradient: { 0.2: '#2196F3', 0.4: '#4CAF50', 0.6: '#FFEB3B', 0.8: '#FF9800', 1.0: '#F44336' },
      ...options,
    });
    heat.addTo(map);
    return () => { map.removeLayer(heat); };
  }, [map, points, options]);

  return null;
};

export default HeatmapLayer;
