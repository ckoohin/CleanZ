"use client";

import Link from "next/link";
import { AdminCard } from "@/components/admin";
import { useBookingStatusSnapshot } from "../../hooks/useDashboard";
import { WidgetSkeleton } from "./WidgetSkeleton";

/**
 * Đủ CẢ 9 trạng thái của BookingStatus. Bản cũ chỉ vẽ 7 ô: nó gộp
 * CANCELLED + EXPIRED và BỎ SÓT hẳn PENDING_CUSTOMER_CONFIRMATION — đơn đang chờ
 * khách xác nhận thì biến mất khỏi dashboard và không được đếm vào "đơn đang
 * hoạt động". Gộp ô cũng khiến không bấm sang lọc chính xác được (bộ lọc bên
 * trang booking chỉ chọn một trạng thái).
 */
const STATUSES: { key: string; label: string; color: string }[] = [
  { key: "POSTED", label: "Đang tìm tasker", color: "#8A95A8" },
  { key: "PENDING_CUSTOMER_CONFIRMATION", label: "Chờ khách xác nhận", color: "#7C3AED" },
  { key: "CONFIRMED", label: "Đã nhận đơn", color: "#2563EB" },
  { key: "TASKER_ON_THE_WAY", label: "Đang đến", color: "#2563EB" },
  { key: "CHECKED_IN", label: "Đã đến nơi", color: "#D97706" },
  { key: "IN_PROGRESS", label: "Đang làm", color: "#D97706" },
  { key: "COMPLETED", label: "Hoàn thành", color: "#0E9F6E" },
  { key: "CANCELLED", label: "Đã huỷ", color: "#E11D48" },
  { key: "EXPIRED", label: "Hết hạn", color: "#E11D48" },
];

/** Trạng thái còn "đang chạy" — chưa hoàn thành, chưa huỷ, chưa hết hạn. */
const ACTIVE_KEYS = new Set([
  "POSTED",
  "PENDING_CUSTOMER_CONFIRMATION",
  "CONFIRMED",
  "TASKER_ON_THE_WAY",
  "CHECKED_IN",
  "IN_PROGRESS",
]);

export function BookingStatusWidget() {
  const { data, isLoading } = useBookingStatusSnapshot();

  if (isLoading) return <WidgetSkeleton rows={2} />;

  const items = STATUSES.map((s) => ({ ...s, count: data?.[s.key] ?? 0 }));
  const totalActive = items
    .filter((s) => ACTIVE_KEYS.has(s.key))
    .reduce((sum, s) => sum + s.count, 0);

  const now = new Date().toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <AdminCard>
      <div className="p-5">
        <div className="mb-4">
          <h3 className="text-[15px] font-bold text-[var(--c-ink)]">
            Đơn theo trạng thái · hiện tại
          </h3>
          <p className="mt-0.5 text-[12.5px] text-[var(--c-muted)]">
            {now} · {totalActive} đơn đang hoạt động · bấm để xem danh sách
          </p>
        </div>

        {/* 9 ô xuống 2 hàng thay vì nhồi 9 cột: ở 9 cột thì nhãn bị cắt cụt
            ("Đang tìm tas…"), mà nhãn cụt thì ô mất luôn ý nghĩa. */}
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((s) => (
            <Link
              key={s.key}
              href={`/admin/bookings?status=${s.key}`}
              title={`Xem các đơn ở trạng thái "${s.label}"`}
              className="rounded-xl border-l-[3px] bg-[var(--c-card-2)] p-3.5 transition-colors hover:bg-[var(--c-line)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-primary)]/40"
              style={{ borderLeftColor: s.color }}
            >
              <div
                className="text-2xl font-bold leading-none tabular-nums"
                style={{ color: s.color }}
              >
                {s.count}
              </div>
              <div className="mt-1.5 text-xs leading-tight text-[var(--c-muted)]">
                {s.label}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AdminCard>
  );
}
