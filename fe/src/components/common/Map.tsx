'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon bị vỡ khi dùng với Next.js
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapProps {
  center?: [number, number];
  zoom?: number;
  className?: string;
}

/**
 * Component Map cơ bản với Leaflet.
 * Dùng dynamic import để tránh SSR error.
 * Ví dụ: import dynamic from 'next/dynamic'
 *   const Map = dynamic(() => import('@/components/common/Map'), { ssr: false })
 */
export default function Map({
  center = [10.7769, 106.7009], // TP.HCM
  zoom = 13,
  className = 'h-[400px] w-full rounded-xl',
}: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    leafletMap.current = L.map(mapRef.current).setView(center, zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(leafletMap.current);

    return () => {
      leafletMap.current?.remove();
      leafletMap.current = null;
    };
  }, [center, zoom]);

  return <div ref={mapRef} className={className} />;
}
