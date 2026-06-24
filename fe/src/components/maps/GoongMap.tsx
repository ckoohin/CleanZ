"use client";

import { useEffect, useState, useRef } from "react";
import Map, { Marker, NavigationControl, ViewStateChangeEvent } from "react-map-gl/mapbox";
import type { StyleSpecification } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapPin } from "lucide-react";
import {
  GOONG_API_KEY,
  GOONG_MAPTILES_KEY,
} from "@/lib/maps/goong-config";

interface GoongMapProps {
  initialLat?: number;
  initialLng?: number;
  onLocationSelect?: (lat: number, lng: number, address: string) => void;
  readOnly?: boolean;
}

export const GoongMap = ({
  initialLat = 21.028511, // Hanoi default
  initialLng = 105.804817,
  onLocationSelect,
  readOnly = false,
}: GoongMapProps) => {
  const [viewState, setViewState] = useState({
    longitude: initialLng,
    latitude: initialLat,
    zoom: 14,
  });

  const [address, setAddress] = useState<string>("Đang tải vị trí...");
  const [isDragging, setIsDragging] = useState(false);
  const [mapStyle, setMapStyle] = useState<StyleSpecification | null>(null);
  
  // Custom hook or simple debounce can be used here
  const fetchAddressTimer = useRef<NodeJS.Timeout | null>(null);

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
          setAddress("Không thể tải bản đồ");
        }
      }
    };

    void loadMapStyle();

    return () => controller.abort();
  }, []);

  const getAddressFromCoords = async (lat: number, lng: number) => {
    if (!GOONG_API_KEY) {
      setAddress(`Tọa độ: ${lat.toFixed(4)}, ${lng.toFixed(4)} (Thiếu API Key)`);
      return;
    }
    
    try {
      const res = await fetch(`https://rsapi.goong.io/Geocode?latlng=${lat},${lng}&api_key=${GOONG_API_KEY}`);
      const data = await res.json();
      if (data && data.results && data.results.length > 0) {
        const formattedAddress = data.results[0].formatted_address;
        setAddress(formattedAddress);
        if (onLocationSelect) {
          onLocationSelect(lat, lng, formattedAddress);
        }
      } else {
        setAddress("Không tìm thấy địa chỉ");
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      setAddress("Lỗi khi lấy địa chỉ");
    }
  };

  useEffect(() => {
    getAddressFromCoords(viewState.latitude, viewState.longitude);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMove = (evt: ViewStateChangeEvent) => {
    setViewState(evt.viewState);
  };

  const handleMoveStart = () => {
    if (readOnly) return;
    setIsDragging(true);
    setAddress("Đang di chuyển...");
  };

  const handleMoveEnd = (evt: ViewStateChangeEvent) => {
    if (readOnly) return;
    setIsDragging(false);
    
    // Clear previous timer to prevent multiple API calls
    if (fetchAddressTimer.current) {
      clearTimeout(fetchAddressTimer.current);
    }
    
    // Debounce the API call
    fetchAddressTimer.current = setTimeout(() => {
      getAddressFromCoords(evt.viewState.latitude, evt.viewState.longitude);
    }, 500);
  };

  return (
    <div className="relative w-full h-[400px] md:h-[500px] rounded-2xl overflow-hidden shadow-inner bg-muted border border-border">
      {mapStyle && (
        <Map
          {...viewState}
          onMove={handleMove}
          onMoveStart={handleMoveStart}
          onMoveEnd={handleMoveEnd}
          mapStyle={mapStyle}
          mapboxAccessToken="placeholder-not-needed-for-goong"
          interactive={!readOnly}
        >
          <NavigationControl position="bottom-right" />
        </Map>
      )}

      {/* Center Fixed Pin (Grab/Be style) */}
      {!readOnly && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-full pointer-events-none z-10 flex flex-col items-center">
          <div className={`transition-transform duration-200 ${isDragging ? '-translate-y-4' : 'translate-y-0'}`}>
            <MapPin className="w-10 h-10 text-primary drop-shadow-md" strokeWidth={2.5} fill="white" />
          </div>
          {/* Shadow indicator */}
          <div className="w-3 h-1 bg-black/20 blur-[2px] rounded-[100%] mt-1"></div>
        </div>
      )}

      {/* Address Overlay Card */}
      {!readOnly && (
        <div className="absolute top-4 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-96 bg-card/95 backdrop-blur-md p-4 rounded-xl shadow-lg border border-border/50 z-10 transition-all">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Vị trí hiện tại</p>
          <p className="text-foreground font-medium line-clamp-2 text-sm leading-snug">
            {address}
          </p>
        </div>
      )}
      
      {/* ReadOnly Marker */}
      {readOnly && (
        <Marker longitude={initialLng} latitude={initialLat}>
          <MapPin className="w-8 h-8 text-primary drop-shadow-md" strokeWidth={2} fill="white" />
        </Marker>
      )}
    </div>
  );
};
