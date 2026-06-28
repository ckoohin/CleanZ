"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Map, {
  Layer,
  Marker,
  NavigationControl,
  Source,
  type MapRef,
} from "react-map-gl/mapbox";
import type { Feature, LineString } from "geojson";
import type { StyleSpecification } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Home, Loader2, MapPin, Navigation } from "lucide-react";
import { GOONG_MAPTILES_KEY } from "@/lib/maps/goong-config";
import type { BookingTrackingPayload } from "../types/tracking.types";

interface BookingTrackingMapProps {
  tracking: BookingTrackingPayload | null;
  fallbackDestination?: {
    latitude?: number | null;
    longitude?: number | null;
    address?: string | null;
  };
  isConnected: boolean;
  error?: string | null;
  viewer?: "customer" | "tasker";
  mobileFull?: boolean;
  grabFull?: boolean;
  onOpenFullscreen?: () => void;
}

function decodePolyline(encoded: string): [number, number][] {
  const coordinates: [number, number][] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    latitude += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    longitude += result & 1 ? ~(result >> 1) : result >> 1;

    coordinates.push([longitude / 1e5, latitude / 1e5]);
  }

  return coordinates;
}

function distanceBetween(
  first: [number, number],
  second: [number, number],
): number {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusMeters = 6_371_000;
  const latitudeDelta = toRadians(second[1] - first[1]);
  const longitudeDelta = toRadians(second[0] - first[0]);
  const firstLatitude = toRadians(first[1]);
  const secondLatitude = toRadians(second[1]);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return (
    2 *
    earthRadiusMeters *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

export function BookingTrackingMap({
  tracking,
  fallbackDestination,
  isConnected,
  error,
  viewer = "customer",
  mobileFull = false,
  grabFull = false,
  onOpenFullscreen,
}: BookingTrackingMapProps) {
  const mapRef = useRef<MapRef | null>(null);
  const [mapStyle, setMapStyle] = useState<StyleSpecification | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  const destination = tracking?.destination ?? {
    latitude: Number(fallbackDestination?.latitude),
    longitude: Number(fallbackDestination?.longitude),
    address: fallbackDestination?.address ?? "",
  };
  const hasDestination =
    Number.isFinite(destination.latitude) &&
    Number.isFinite(destination.longitude);
  const taskerLocation = tracking?.currentLocation;

  const routeCoordinates = useMemo<[number, number][] | null>(() => {
    if (!tracking || !hasDestination) return null;

    const origin: [number, number] = [
      tracking.currentLocation.longitude,
      tracking.currentLocation.latitude,
    ];
    const target: [number, number] = [
      destination.longitude,
      destination.latitude,
    ];
    const encoded = tracking.route.encodedPolyline;
    if (!encoded) return [origin, target];

    const decoded = decodePolyline(encoded).filter(
      ([longitude, latitude]) =>
        Number.isFinite(longitude) && Number.isFinite(latitude),
    );
    if (decoded.length < 2) return [origin, target];

    const normalDistance =
      distanceBetween(origin, decoded[0]) +
      distanceBetween(target, decoded[decoded.length - 1]);
    const reversedDistance =
      distanceBetween(origin, decoded[decoded.length - 1]) +
      distanceBetween(target, decoded[0]);
    const oriented =
      reversedDistance < normalDistance ? [...decoded].reverse() : [...decoded];

    // Goong đôi khi snap điểm đầu/cuối vào đoạn đường gần nhất. Luôn neo
    // polyline về đúng GPS Tasker và tọa độ booking để marker không bị lệch.
    oriented[0] = origin;
    oriented[oriented.length - 1] = target;

    return oriented;
  }, [destination.latitude, destination.longitude, hasDestination, tracking]);

  const routeFeature = useMemo<Feature<LineString> | null>(() => {
    if (!routeCoordinates) return null;

    return {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: routeCoordinates,
      },
    };
  }, [routeCoordinates]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadStyle() {
      if (!GOONG_MAPTILES_KEY) {
        setMapError("Thiếu cấu hình Goong Maptiles key");
        return;
      }

      try {
        const response = await fetch(
          `https://tiles.goong.io/assets/goong_map_web.json?api_key=${GOONG_MAPTILES_KEY}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("Không thể tải bản đồ");
        const style = (await response.json()) as StyleSpecification;
        setMapStyle({
          ...style,
          layers: style.layers.filter((layer) => layer.id !== "poi-tree"),
        });
      } catch (loadError) {
        if (!(loadError instanceof DOMException && loadError.name === "AbortError")) {
          setMapError("Không thể tải bản đồ hành trình");
        }
      }
    }

    void loadStyle();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!mapRef.current || !isMapLoaded || !hasDestination) return;

    if (taskerLocation) {
      const points = routeCoordinates?.length
        ? routeCoordinates
        : [
            [taskerLocation.longitude, taskerLocation.latitude] as [
              number,
              number,
            ],
            [destination.longitude, destination.latitude] as [number, number],
          ];
      const longitudes = points.map(([longitude]) => longitude);
      const latitudes = points.map(([, latitude]) => latitude);

      mapRef.current.fitBounds(
        [
          [Math.min(...longitudes), Math.min(...latitudes)],
          [Math.max(...longitudes), Math.max(...latitudes)],
        ],
        {
          padding: { top: 70, right: 70, bottom: 90, left: 70 },
          duration: 800,
          maxZoom: 15,
        },
      );
      return;
    }

    mapRef.current.flyTo({
      center: [destination.longitude, destination.latitude],
      zoom: 14,
      duration: 600,
    });
  }, [
    destination.latitude,
    destination.longitude,
    hasDestination,
    isMapLoaded,
    routeCoordinates,
    taskerLocation,
  ]);

  if (!hasDestination) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-700 shadow-sm">
        Booking chưa có tọa độ địa chỉ để hiển thị hành trình.
      </div>
    );
  }

  const isTaskerView = viewer === "tasker";
  const routeColor = "#fd7e14";

  return (
    <section
      className={
        mobileFull
          ? "-mx-4 -mt-4 overflow-hidden border-b border-border/50 bg-card shadow-md md:mx-0 md:mt-0 md:rounded-3xl md:border"
          : "overflow-hidden rounded-3xl border border-border/50 bg-card shadow-md"
      }
    >
      <div
        className={
          grabFull
            ? "relative h-[calc(100svh-112px)] min-h-[540px] w-full overflow-hidden bg-muted md:h-[430px] md:min-h-0"
            : mobileFull
            ? "relative h-[calc(100svh-168px)] min-h-[520px] w-full overflow-hidden bg-muted md:h-[430px] md:min-h-0"
            : "relative h-[360px] w-full overflow-hidden bg-muted md:h-[430px]"
        }
      >
        {mapStyle ? (
          <Map
            ref={mapRef}
            initialViewState={{
              longitude: destination.longitude,
              latitude: destination.latitude,
              zoom: 14,
            }}
            mapStyle={mapStyle}
            mapboxAccessToken="placeholder-not-needed-for-goong"
            reuseMaps
            onLoad={() => setIsMapLoaded(true)}
          >
            <NavigationControl position="bottom-right" />
            {routeFeature && (
              <Source id="tracking-route" type="geojson" data={routeFeature}>
                <Layer
                  id="tracking-route-shadow"
                  type="line"
                  paint={{
                    "line-color": "#ffffff",
                    "line-width": 8,
                    "line-opacity": 0.8,
                  }}
                  layout={{ "line-cap": "round", "line-join": "round" }}
                />
                <Layer
                  id="tracking-route-line"
                  type="line"
                  paint={{
                    "line-color": routeColor,
                    "line-width": isTaskerView ? 5 : 5,
                    "line-opacity": 0.88,
                  }}
                  layout={{ "line-cap": "round", "line-join": "round" }}
                />
              </Source>
            )}

            <Marker
              longitude={destination.longitude}
              latitude={destination.latitude}
              anchor="bottom"
            >
              <div className="flex flex-col items-center justify-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-white bg-primary text-white shadow-lg">
                  <Home className="h-5 w-5" />
                </div>
                <span className="mt-1 rounded-full border border-white/20 bg-primary/95 px-2 py-0.5 text-[9px] font-black uppercase leading-none text-white shadow-sm">
                  Điểm đến
                </span>
              </div>
            </Marker>

            {taskerLocation && (
              <Marker
                longitude={taskerLocation.longitude}
                latitude={taskerLocation.latitude}
                anchor="center"
              >
                <div className="relative flex flex-col items-center justify-center">
                  <span className="absolute top-0 h-11 w-11 animate-ping rounded-full bg-emerald-500/50" />
                  <div className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-emerald-500 bg-white text-emerald-600 shadow-xl">
                    <Navigation className="h-5 w-5 rotate-45 fill-current" />
                  </div>
                  <span className="z-10 mt-1 rounded-full border border-white/20 bg-emerald-600 px-2 py-0.5 text-[9px] font-black uppercase leading-none text-white shadow-sm">
                    {isTaskerView ? "Bạn" : "Tasker"}
                  </span>
                </div>
              </Marker>
            )}
          </Map>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {mapError ? (
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4" /> {mapError}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Đang tải bản đồ...
              </span>
            )}
          </div>
        )}

        <div className="absolute left-4 right-4 top-4 z-10 flex items-center gap-3 rounded-2xl border border-border/50 bg-card/90 px-4 py-3 shadow-md backdrop-blur-md">
          <div className="relative flex h-2.5 w-2.5 shrink-0">
            <span
              className={`absolute inline-flex h-full w-full rounded-full ${
                isConnected ? "animate-ping bg-emerald-400 opacity-75" : "bg-slate-300"
              }`}
            />
            <span
              className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                isConnected ? "bg-emerald-500" : "bg-slate-400"
              }`}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase text-foreground">
              {isTaskerView ? "Điều hướng tới khách hàng" : "Theo dõi Tasker"}
            </p>
            <p className="mt-0.5 truncate text-[10px] font-medium text-muted-foreground">
              {tracking
                ? `Cập nhật lúc ${new Date(tracking.updatedAt).toLocaleTimeString("vi-VN")}`
                : isTaskerView
                  ? "Đang xác định vị trí và tuyến đường"
                  : "Đang chờ vị trí đầu tiên từ Tasker"}
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
              isConnected
                ? "bg-emerald-50 text-emerald-600"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {isConnected ? "Trực tuyến" : "Đang nối"}
          </span>
        </div>

        {onOpenFullscreen && (
          <button
            type="button"
            onClick={onOpenFullscreen}
            className="absolute bottom-32 right-4 z-10 rounded-2xl border border-border/50 bg-card/95 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-primary shadow-md backdrop-blur-md transition active:scale-95 md:bottom-4"
          >
            Mở rộng
          </button>
        )}

        {mobileFull && !grabFull && (
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 rounded-t-[28px] border-t border-border/50 bg-card/95 p-4 pb-5 shadow-[0_-10px_30px_rgba(15,23,42,0.12)] backdrop-blur-md md:hidden">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted-foreground/20" />
            <div className="grid gap-3">
              <div className="rounded-2xl bg-primary/5 p-4">
                <p className="text-[11px] font-black uppercase text-primary">
                  {viewer === "tasker" ? "Địa chỉ khách hàng" : "Điểm đến"}
                </p>
                <p className="mt-1 line-clamp-2 text-sm font-bold text-foreground">
                  {destination.address || fallbackDestination?.address}
                </p>
              </div>
              <div className="rounded-2xl bg-blue-50 p-4">
                <p className="text-[11px] font-black uppercase text-blue-500">
                  Dự kiến còn lại
                </p>
                <p className="mt-1 text-sm font-black text-blue-700">
                  {tracking
                    ? `${tracking.route.distance.kilometers.toFixed(1)} km · ${tracking.route.duration.minutes} phút`
                    : "Đang tính toán..."}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={`${mobileFull || grabFull ? "hidden md:grid" : "grid"} gap-3 p-4 sm:grid-cols-2`}>
        <div className="rounded-2xl bg-primary/5 p-4">
          <p className="text-[11px] font-black uppercase text-primary">
            {viewer === "tasker" ? "Địa chỉ khách hàng" : "Điểm đến"}
          </p>
          <p className="mt-1 line-clamp-2 text-sm font-bold text-foreground">
            {destination.address || fallbackDestination?.address}
          </p>
        </div>
        <div className="rounded-2xl bg-blue-50 p-4">
          <p className="text-[11px] font-black uppercase text-blue-500">
            Dự kiến còn lại
          </p>
          <p className="mt-1 text-sm font-black text-blue-700">
            {tracking
              ? `${tracking.route.distance.kilometers.toFixed(1)} km · ${tracking.route.duration.minutes} phút`
              : "Đang tính toán..."}
          </p>
        </div>
      </div>

      {error && (
        <p className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-600">
          {error}
        </p>
      )}
    </section>
  );
}
