"use client";

import * as React from "react";
import Map, {
  Layer,
  Marker,
  NavigationControl,
  Source,
  type MapRef,
} from "react-map-gl/mapbox";
import type { StyleSpecification } from "mapbox-gl";
import { Home, MapPin, Navigation } from "lucide-react";
import { GOONG_MAPTILES_KEY } from "@/lib/maps/goong-config";
import "mapbox-gl/dist/mapbox-gl.css";

interface CheckinComparisonMapProps {
  checkinLatitude?: number | null;
  checkinLongitude?: number | null;
  targetLatitude?: number | null;
  targetLongitude?: number | null;
}

function isValidCoordinatePair(
  latitude?: number | null,
  longitude?: number | null,
) {
  return (
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    typeof longitude === "number" &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function CheckinComparisonMap({
  checkinLatitude,
  checkinLongitude,
  targetLatitude,
  targetLongitude,
}: CheckinComparisonMapProps) {
  const mapRef = React.useRef<MapRef>(null);
  const [mapStyle, setMapStyle] = React.useState<StyleSpecification | null>(
    null,
  );
  const [loadError, setLoadError] = React.useState(false);

  const hasCheckin = isValidCoordinatePair(checkinLatitude, checkinLongitude);
  const hasTarget = isValidCoordinatePair(targetLatitude, targetLongitude);

  React.useEffect(() => {
    if (!GOONG_MAPTILES_KEY) {
      setLoadError(true);
      return;
    }

    const controller = new AbortController();
    const loadStyle = async () => {
      try {
        const response = await fetch(
          `https://tiles.goong.io/assets/goong_map_web.json?api_key=${GOONG_MAPTILES_KEY}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const style = (await response.json()) as StyleSpecification;
        setMapStyle({
          ...style,
          layers: style.layers.filter((layer) => layer.id !== "poi-tree"),
        });
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setLoadError(true);
        }
      }
    };

    void loadStyle();
    return () => controller.abort();
  }, []);

  const fitPoints = React.useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    if (
      hasCheckin &&
      hasTarget &&
      checkinLatitude != null &&
      checkinLongitude != null &&
      targetLatitude != null &&
      targetLongitude != null
    ) {
      const samePoint =
        Math.abs(checkinLatitude - targetLatitude) < 0.00001 &&
        Math.abs(checkinLongitude - targetLongitude) < 0.00001;
      if (samePoint) {
        map.easeTo({
          center: [checkinLongitude, checkinLatitude],
          zoom: 17,
          duration: 0,
        });
        return;
      }

      map.fitBounds(
        [
          [
            Math.min(checkinLongitude, targetLongitude),
            Math.min(checkinLatitude, targetLatitude),
          ],
          [
            Math.max(checkinLongitude, targetLongitude),
            Math.max(checkinLatitude, targetLatitude),
          ],
        ],
        { padding: 72, maxZoom: 17, duration: 0 },
      );
      return;
    }

    if (hasCheckin && checkinLatitude != null && checkinLongitude != null) {
      map.easeTo({
        center: [checkinLongitude, checkinLatitude],
        zoom: 16,
        duration: 0,
      });
      return;
    }

    if (hasTarget && targetLatitude != null && targetLongitude != null) {
      map.easeTo({
        center: [targetLongitude, targetLatitude],
        zoom: 16,
        duration: 0,
      });
    }
  }, [
    checkinLatitude,
    checkinLongitude,
    hasCheckin,
    hasTarget,
    targetLatitude,
    targetLongitude,
  ]);

  if (!hasCheckin && !hasTarget) {
    return (
      <div className="grid h-72 place-items-center rounded-xl border border-dashed border-[var(--c-line-strong)] bg-[var(--c-card-2)] px-6 text-center">
        <div>
          <MapPin className="mx-auto size-8 text-[var(--c-muted)]" />
          <p className="mt-2 text-sm font-semibold text-[var(--c-ink)]">
            Không có tọa độ để hiển thị
          </p>
          <p className="mt-1 text-xs text-[var(--c-muted)]">
            Admin vẫn có thể đối soát bằng ảnh và thông tin booking.
          </p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="grid h-72 place-items-center rounded-xl border border-dashed border-amber-300 bg-amber-50 px-6 text-center">
        <div>
          <MapPin className="mx-auto size-8 text-amber-600" />
          <p className="mt-2 text-sm font-semibold text-amber-900">
            Không thể tải nền bản đồ
          </p>
          <p className="mt-1 text-xs text-amber-700">
            Tọa độ gốc vẫn được hiển thị bên dưới để Admin đối chiếu.
          </p>
        </div>
      </div>
    );
  }

  const initialLatitude =
    (hasCheckin ? checkinLatitude : targetLatitude) ?? 10.7769;
  const initialLongitude =
    (hasCheckin ? checkinLongitude : targetLongitude) ?? 106.7009;
  const lineData =
    hasCheckin &&
    hasTarget &&
    checkinLatitude != null &&
    checkinLongitude != null &&
    targetLatitude != null &&
    targetLongitude != null
      ? {
          type: "Feature" as const,
          properties: {},
          geometry: {
            type: "LineString" as const,
            coordinates: [
              [checkinLongitude, checkinLatitude],
              [targetLongitude, targetLatitude],
            ],
          },
        }
      : null;

  return (
    <div className="relative h-80 overflow-hidden rounded-xl border border-[var(--c-line)] bg-[var(--c-card-2)] sm:h-96">
      {!mapStyle && (
        <div className="absolute inset-0 animate-pulse bg-[var(--c-card-2)]" />
      )}
      {mapStyle && (
        <Map
          ref={mapRef}
          initialViewState={{
            latitude: initialLatitude,
            longitude: initialLongitude,
            zoom: 15,
          }}
          mapStyle={mapStyle}
          mapboxAccessToken="placeholder-not-needed-for-goong"
          onLoad={fitPoints}
        >
          <NavigationControl position="bottom-right" showCompass={false} />

          {lineData && (
            <Source id="checkin-comparison-line" type="geojson" data={lineData}>
              <Layer
                id="checkin-comparison-line-layer"
                type="line"
                paint={{
                  "line-color": "#F59E0B",
                  "line-width": 3,
                  "line-opacity": 0.9,
                  "line-dasharray": [2, 1.5],
                }}
              />
            </Source>
          )}

          {hasTarget && targetLatitude != null && targetLongitude != null && (
            <Marker latitude={targetLatitude} longitude={targetLongitude}>
              <div className="flex flex-col items-center">
                <span className="grid size-10 place-items-center rounded-full border-2 border-white bg-blue-600 text-white shadow-lg">
                  <Home className="size-5" />
                </span>
                <span className="mt-1 rounded-full bg-blue-700 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                  Điểm đến
                </span>
              </div>
            </Marker>
          )}

          {hasCheckin &&
            checkinLatitude != null &&
            checkinLongitude != null && (
              <Marker latitude={checkinLatitude} longitude={checkinLongitude}>
                <div className="flex flex-col items-center">
                  <span className="grid size-10 place-items-center rounded-full border-2 border-white bg-amber-500 text-white shadow-lg">
                    <Navigation className="size-5 rotate-45 fill-current" />
                  </span>
                  <span className="mt-1 rounded-full bg-amber-600 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                    Tasker check-in
                  </span>
                </div>
              </Marker>
            )}
        </Map>
      )}

      <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-2 rounded-lg bg-white/95 p-2 text-[11px] font-semibold text-slate-700 shadow backdrop-blur">
        <span className="inline-flex items-center gap-1">
          <span className="size-2.5 rounded-full bg-amber-500" />
          Vị trí check-in
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-2.5 rounded-full bg-blue-600" />
          Khách hàng
        </span>
      </div>
    </div>
  );
}
