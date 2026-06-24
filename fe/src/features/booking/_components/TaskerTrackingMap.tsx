"use client";

import { useEffect, useState, useRef } from "react";
import Map, { Marker, NavigationControl, Source, Layer } from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import type { StyleSpecification } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapPin, Navigation, Home } from "lucide-react";
import { GOONG_MAPTILES_KEY, GOONG_API_KEY } from "@/lib/maps/goong-config";

interface TaskerTrackingMapProps {
  destLat: number;
  destLng: number;
  taskerLat: number;
  taskerLng: number;
  taskerAvatar?: string | null;
  taskerName?: string | null;
  isFullscreen?: boolean;
}

// Giải mã Polyline từ Goong Map API thành mảng tọa độ [lng, lat]
function decodePolyline(str: string, precision = 5): [number, number][] {
  let index = 0,
    lat = 0,
    lng = 0;
  const coordinates: [number, number][] = [];
  const factor = Math.pow(10, precision);

  while (index < str.length) {
    let byte, shift = 0, result = 0;
    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    coordinates.push([lng / factor, lat / factor]);
  }

  return coordinates;
}

const isValidCoords = (lat: number | null | undefined, lng: number | null | undefined): boolean => {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return false;
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
};

export const TaskerTrackingMap = ({
  destLat,
  destLng,
  taskerLat,
  taskerLng,
  taskerAvatar,
  taskerName,
  isFullscreen = false,
}: TaskerTrackingMapProps) => {
  const defaultLat = 21.028511; // Hanoi default
  const defaultLng = 105.804817;

  const isDestValid = isValidCoords(destLat, destLng);

  const mapRef = useRef<MapRef>(null);

  const [viewState, setViewState] = useState({
    longitude: isDestValid ? destLng : defaultLng,
    latitude: isDestValid ? destLat : defaultLat,
    zoom: 14,
  });

  const [mapStyle, setMapStyle] = useState<StyleSpecification | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);

  // Tải map style từ Goong Map
  useEffect(() => {
    const controller = new AbortController();

    const loadMapStyle = async () => {
      try {
        const response = await fetch(
          `https://tiles.goong.io/assets/goong_map_web.json?api_key=${GOONG_MAPTILES_KEY}`,
          { signal: controller.signal },
        );
        const style = (await response.json()) as StyleSpecification;

        setMapStyle({
          ...style,
          layers: style.layers.filter((layer) => layer.id !== "poi-tree"),
        });
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("Không thể tải bản đồ GoongMap");
        }
      }
    };

    void loadMapStyle();

    return () => controller.abort();
  }, []);

  // Lấy dữ liệu lộ trình (Direction) từ Goong Map API khi tọa độ thay đổi
  useEffect(() => {
    if (!isValidCoords(taskerLat, taskerLng) || !isValidCoords(destLat, destLng) || !GOONG_API_KEY) return;

    const fetchRoute = async () => {
      try {
        const url = `https://rsapi.goong.io/Direction?origin=${taskerLat},${taskerLng}&destination=${destLat},${destLng}&vehicle=bike&api_key=${GOONG_API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data?.routes?.[0]?.overview_polyline?.points) {
          const coords = decodePolyline(data.routes[0].overview_polyline.points);
          setRouteCoordinates(coords);
        }
      } catch (err) {
        console.error("Lỗi vẽ lộ trình di chuyển của Tasker:", err);
      }
    };

    void fetchRoute();
  }, [taskerLat, taskerLng, destLat, destLng]);

  // Tự động căn chỉnh bản đồ về trung điểm giữa Tasker và Khách hàng bằng easeTo
  useEffect(() => {
    if (isValidCoords(taskerLat, taskerLng) && isValidCoords(destLat, destLng)) {
      const centerLat = (destLat + taskerLat) / 2;
      const centerLng = (destLng + taskerLng) / 2;
      
      mapRef.current?.easeTo({
        center: [centerLng, centerLat],
        duration: 1000,
      });
    }
  }, [taskerLat, taskerLng, destLat, destLng]);

  return (
    <div className={`relative w-full overflow-hidden bg-muted transition-all duration-300 ${
      isFullscreen 
        ? "h-full w-full rounded-none border-none shadow-none" 
        : "h-[320px] md:h-[400px] rounded-3xl shadow-md border border-border"
    }`}>
      {mapStyle && (
        <Map
          ref={mapRef}
          {...viewState}
          onMove={(evt) => setViewState(evt.viewState)}
          mapStyle={mapStyle}
          mapboxAccessToken="placeholder-not-needed"
        >
          <NavigationControl position="bottom-right" />

          {/* Đường vẽ lộ trình (Polyline) */}
          {routeCoordinates.length > 0 && isValidCoords(destLat, destLng) && isValidCoords(taskerLat, taskerLng) && (
            <Source
              id="route-source"
              type="geojson"
              data={{
                type: "Feature",
                properties: {},
                geometry: {
                  type: "LineString",
                  coordinates: routeCoordinates,
                },
              }}
            >
              <Layer
                id="route-layer"
                type="line"
                layout={{
                  "line-join": "round",
                  "line-cap": "round",
                }}
                paint={{
                  "line-color": "#fd7e14", // Brand primary color
                  "line-width": 5,
                  "line-opacity": 0.85,
                }}
              />
            </Source>
          )}

          {/* Marker Khách hàng (Đích đến) */}
          {isValidCoords(destLat, destLng) && (
            <Marker longitude={destLng} latitude={destLat}>
              <div className="flex flex-col items-center justify-center">
                <div className="bg-primary text-white p-2 rounded-full shadow-lg border-2 border-white flex items-center justify-center animate-bounce">
                  <Home className="w-5 h-5 fill-white text-primary" />
                </div>
                <span className="bg-primary/95 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full mt-1 border border-white/20 shadow-sm leading-none drop-shadow-sm select-none">
                  Điểm đến
                </span>
              </div>
            </Marker>
          )}

          {/* Marker Tasker (Vị trí hiện tại) */}
          {isValidCoords(taskerLat, taskerLng) && (
            <Marker longitude={taskerLng} latitude={taskerLat}>
              <div className="flex flex-col items-center justify-center relative">
                {/* Ping animation background */}
                <div className="absolute top-0 w-11 h-11 bg-emerald-500 rounded-full animate-ping opacity-60" />
                
                {/* Avatar tròn hoặc xe máy */}
                <div className="w-11 h-11 rounded-full border-[3px] border-emerald-500 bg-white shadow-lg overflow-hidden shrink-0 relative z-10 flex items-center justify-center">
                  {taskerAvatar ? (
                    <img src={taskerAvatar} alt={taskerName ?? ""} className="w-full h-full object-cover" />
                  ) : (
                    <Navigation className="w-5 h-5 text-emerald-600 fill-emerald-600 rotate-45 animate-pulse" />
                  )}
                </div>
                <span className="bg-emerald-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full mt-1 border border-white/20 shadow-sm leading-none drop-shadow-sm z-10 select-none">
                  Chuyên gia
                </span>
              </div>
            </Marker>
          )}
        </Map>
      )}

      {/* Thông tin trạng thái góc trên */}
      {!isFullscreen && (
        <div className="absolute top-4 left-4 right-4 bg-card/90 backdrop-blur-md px-4 py-3 rounded-2xl border border-border/50 shadow-md z-10 flex items-center gap-3 select-none">
          <div className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black uppercase text-foreground">Chuyên gia đang di chuyển</p>
            <p className="text-[10px] font-medium text-muted-foreground mt-0.5">Theo dõi vị trí thời gian thực trên bản đồ</p>
          </div>
        </div>
      )}
    </div>
  );
};
