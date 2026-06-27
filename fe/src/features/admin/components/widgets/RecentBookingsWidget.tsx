"use client";

import { AdminCard, StatusBadge, type BadgeTone } from "@/components/admin";
import { useBookingDetails } from "../../hooks/useDashboard";
import { useDashboardStore } from "../../stores/dashboard.store";
import { WidgetSkeleton } from "./WidgetSkeleton";
import { MoreHorizontal } from "lucide-react";

const STATUS_TONE: Record<string, BadgeTone> = {
  COMPLETED: "success",
  CANCELLED: "danger",
  IN_PROGRESS: "warning",
  POSTED: "neutral",
  CONFIRMED: "info",
  TASKER_ON_THE_WAY: "info",
  CHECKED_IN: "warning",
  EXPIRED: "danger",
};

const STATUS_LABELS: Record<string, string> = {
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  IN_PROGRESS: "In progress",
  POSTED: "Posted",
  CONFIRMED: "Confirmed",
  TASKER_ON_THE_WAY: "On the way",
  CHECKED_IN: "Checked in",
  EXPIRED: "Expired",
};

export function RecentBookingsWidget() {
  const { dateRange } = useDashboardStore();
  const { data, isLoading } = useBookingDetails(dateRange, 5); // display 5 rows like HTML

  if (isLoading) return <WidgetSkeleton rows={4} />;
  if (!data?.recent?.length) return null;

  return (
    <AdminCard className="h-full flex flex-col justify-between">
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="text-[15px] font-bold text-[var(--c-ink)]">Đơn hàng gần đây</h3>
            </div>
            <span className="text-xs text-[var(--c-primary)] font-medium cursor-pointer hover:underline">Xem tất cả</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead>
                <tr>
                  <th className="pb-2.5 pt-1 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-2.5">Code</th>
                  <th className="pb-2.5 pt-1 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-2.5">Khách</th>
                  <th className="pb-2.5 pt-1 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-2.5">Dịch vụ</th>
                  <th className="pb-2.5 pt-1 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-2.5">Giá</th>
                  <th className="pb-2.5 pt-1 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-2.5">Trạng thái</th>
                  <th className="pb-2.5 pt-1 px-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--c-line)]">
                {data.recent.map((b) => (
                  <tr key={b.bookingCode} className="hover:bg-[var(--c-card-2)] transition-colors">
                    <td className="py-2.5 px-2.5 font-semibold text-[var(--c-ink)] tabular-nums">{b.bookingCode}</td>
                    <td className="py-2.5 px-2.5 text-[var(--c-muted)] text-[12.5px] truncate max-w-[120px]">{b.customerName}</td>
                    <td className="py-2.5 px-2.5 text-[var(--c-ink)]">{b.serviceName ?? "Dọn dẹp nhà"}</td>
                    <td className="py-2.5 px-2.5 font-medium text-[var(--c-ink)] tabular-nums">
                      {b.totalPrice >= 1000
                        ? `${(b.totalPrice / 1000).toFixed(0)}k`
                        : `${b.totalPrice}đ`}
                    </td>
                    <td className="py-2.5 px-2.5">
                      <StatusBadge tone={STATUS_TONE[b.status] ?? "neutral"}>
                        {STATUS_LABELS[b.status] ?? b.status}
                      </StatusBadge>
                    </td>
                    <td className="py-2.5 px-2.5 text-[var(--c-muted)] text-right">
                      <MoreHorizontal className="w-4 h-4 cursor-pointer inline-block" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminCard>
  );
}
