"use client";

import { AdminCard } from "@/components/admin";
import { useVoucherPerformance } from "../../hooks/useDashboard";
import { WidgetSkeleton } from "./WidgetSkeleton";

const COLORS = ["#0E9F6E", "#D97706", "#2563EB", "#7C3AED", "#E11D48", "#FFA000"];

export function VoucherPerfWidget() {
  const { data, isLoading } = useVoucherPerformance();

  if (isLoading) return <WidgetSkeleton rows={3} />;

  const vouchers = data ?? [];

  return (
    <AdminCard className="p-5 h-full flex flex-col justify-between">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-[15px] font-bold text-[var(--c-ink)]">Hiệu quả voucher</h3>
          <p className="text-[12.5px] text-[var(--c-muted)] mt-0.5">Lượt dùng / giới hạn</p>
        </div>
      </div>
      {vouchers.length === 0 ? (
        <p className="text-xs text-[var(--c-muted)] py-6 text-center">
          Chưa có voucher đang hoạt động
        </p>
      ) : (
        <div className="flex flex-col gap-3 mt-3">
          {vouchers.map((v, i) => {
            const pct = v.limit ? Math.min((v.used / v.limit) * 100, 100) : 0;
            return (
              <div key={v.code} className="flex items-center gap-3 text-[12.5px]">
                <span className="w-[38%] font-semibold text-[var(--c-ink)] truncate">
                  {v.code}
                </span>
                <div className="flex-1 h-2 bg-[var(--c-card-2)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                  />
                </div>
                <span className="w-[60px] text-right font-medium text-[var(--c-muted)] shrink-0 text-xs tabular-nums">
                  {v.used}/{v.limit ?? "∞"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </AdminCard>
  );
}
