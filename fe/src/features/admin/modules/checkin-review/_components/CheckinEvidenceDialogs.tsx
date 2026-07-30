"use client";

import dynamic from "next/dynamic";
import { Camera, Clock3, Home, MapPin, Navigation } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ErrorBoundary from "@/components/error/ErrorBoundary";

const CheckinComparisonMap = dynamic(
  () =>
    import("./CheckinComparisonMap").then(
      (module) => module.CheckinComparisonMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-80 animate-pulse rounded-xl bg-[var(--c-card-2)] sm:h-96" />
    ),
  },
);

interface CheckinProofDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingCode?: string | null;
  photoUrl?: string | null;
}

export function CheckinProofDialog({
  open,
  onOpenChange,
  bookingCode,
  photoUrl,
}: CheckinProofDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="cz-admin max-h-[92dvh] max-w-4xl overflow-y-auto bg-[var(--c-card)] text-[var(--c-ink)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="size-5 text-amber-500" />
            Ảnh minh chứng check-in
            {bookingCode && (
              <span className="font-mono text-sm text-[var(--c-muted)]">
                · {bookingCode}
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Ảnh được Tasker gửi tại thời điểm thực hiện check-in.
          </DialogDescription>
        </DialogHeader>

        {photoUrl ? (
          <div className="grid min-h-72 place-items-center overflow-hidden rounded-xl border border-[var(--c-line)] bg-black/5 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl}
              alt={`Bằng chứng check-in ${bookingCode ?? ""}`.trim()}
              className="max-h-[72dvh] w-auto max-w-full rounded-lg object-contain"
            />
          </div>
        ) : (
          <div className="grid min-h-72 place-items-center rounded-xl border border-dashed border-[var(--c-line-strong)] bg-[var(--c-card-2)] text-center">
            <div>
              <Camera className="mx-auto size-8 text-[var(--c-muted)]" />
              <p className="mt-2 text-sm font-semibold">
                Không có ảnh bằng chứng
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface CheckinLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingCode?: string | null;
  address?: string | null;
  checkedInAt?: string | null;
  checkinLatitude?: number | null;
  checkinLongitude?: number | null;
  targetLatitude?: number | null;
  targetLongitude?: number | null;
  distanceMeters?: number | null;
  accuracyMeters?: number | null;
}

function formatCoordinates(
  latitude?: number | null,
  longitude?: number | null,
) {
  if (latitude == null || longitude == null) return "Không có dữ liệu";
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

function formatMeters(value?: number | null) {
  if (value == null) return "Không có dữ liệu";
  return `${Math.round(value)} m`;
}

function formatCheckinTimestamp(value?: string | null) {
  if (!value) return "Không có dữ liệu";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Không có dữ liệu";

  const parts = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((result, part) => {
      result[part.type] = part.value;
      return result;
    }, {});

  return `${parts.hour}:${parts.minute}:${parts.second} · ${parts.day}/${parts.month}/${parts.year}`;
}

export function CheckinLocationDialog({
  open,
  onOpenChange,
  bookingCode,
  address,
  checkedInAt,
  checkinLatitude,
  checkinLongitude,
  targetLatitude,
  targetLongitude,
  distanceMeters,
  accuracyMeters,
}: CheckinLocationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="cz-admin max-h-[92dvh] max-w-5xl overflow-y-auto bg-[var(--c-card)] text-[var(--c-ink)]">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <MapPin className="size-5 text-amber-500" />
            So sánh định vị check-in
            {bookingCode && (
              <span className="font-mono text-sm text-[var(--c-muted)]">
                · {bookingCode}
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Đối chiếu vị trí Tasker, vị trí khách hàng và thời điểm backend ghi
            nhận check-in.
          </DialogDescription>
        </DialogHeader>

        <ErrorBoundary
          fallback={
            <div className="grid h-72 place-items-center rounded-xl border border-dashed border-amber-300 bg-amber-50 px-6 text-center text-sm font-semibold text-amber-800">
              Bản đồ gặp lỗi hiển thị. Admin vẫn có thể đối chiếu tọa độ gốc bên
              dưới.
            </div>
          }
        >
          <CheckinComparisonMap
            checkinLatitude={checkinLatitude}
            checkinLongitude={checkinLongitude}
            targetLatitude={targetLatitude}
            targetLongitude={targetLongitude}
          />
        </ErrorBoundary>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-amber-900">
              <Navigation className="size-4 rotate-45" />
              Vị trí check-in
            </div>
            <p className="mt-2 break-all font-mono text-xs text-amber-800">
              {formatCoordinates(checkinLatitude, checkinLongitude)}
            </p>
            <div className="mt-3 rounded-lg border border-amber-200 bg-white/70 p-2.5 text-xs">
              <span className="flex items-center gap-1.5 text-amber-700">
                <Clock3 className="size-3.5" />
                Thời điểm ghi nhận
              </span>
              <strong className="mt-1 block text-amber-950">
                {formatCheckinTimestamp(checkedInAt)}
              </strong>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="block text-amber-700">Khoảng cách</span>
                <strong>{formatMeters(distanceMeters)}</strong>
              </div>
              <div>
                <span className="block text-amber-700">Sai số GPS</span>
                <strong>{formatMeters(accuracyMeters)}</strong>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-blue-900">
              <Home className="size-4" />
              Địa chỉ khách hàng
            </div>
            <p className="mt-2 break-all font-mono text-xs text-blue-800">
              {formatCoordinates(targetLatitude, targetLongitude)}
            </p>
            <p className="mt-3 text-xs leading-relaxed text-blue-700">
              {address || "Booking không có địa chỉ hiển thị."}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
