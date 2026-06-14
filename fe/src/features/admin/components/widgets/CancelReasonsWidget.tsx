"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useBookingDetails } from "../../hooks/useDashboard";
import { useDashboardStore } from "../../stores/dashboard.store";
import { WidgetSkeleton } from "./WidgetSkeleton";

const CANCEL_ROLES: Record<string, { label: string; color: string }> = {
  CUSTOMER: { label: "Khách huỷ (CUSTOMER)", color: "#b45309" },
  TASKER: { label: "Tasker huỷ (TASKER)", color: "#b91c1c" },
  SYSTEM: { label: "Hết hạn (SYSTEM)", color: "#888780" },
  ADMIN: { label: "Admin huỷ (ADMIN)", color: "#1d4ed8" },
};

export function CancelReasonsWidget() {
  const { dateRange } = useDashboardStore();
  const { data, isLoading } = useBookingDetails(dateRange);

  if (isLoading) return <WidgetSkeleton rows={4} />;

  const backendReasons = data?.cancelReasons ?? [];
  const reasonsMap = new Map(backendReasons.map((r) => [r.cancelledBy, r.count]));

  // Standard template items with DB values overlaid, or mockup as fallback
  const items = Object.entries(CANCEL_ROLES).map(([role, cfg]) => {
    const dbCount = reasonsMap.get(role);
    return {
      label: cfg.label,
      count: dbCount !== undefined ? dbCount : (role === "CUSTOMER" ? 18 : role === "TASKER" ? 7 : role === "SYSTEM" ? 5 : 2),
      color: cfg.color,
    };
  });

  const total = items.reduce((sum, item) => sum + item.count, 0);
  const max = Math.max(...items.map((item) => item.count), 1);

  return (
    <Card className="border border-border bg-card shadow-sm rounded-2xl h-full flex flex-col justify-between">
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-[15px] font-semibold text-foreground">Lý do huỷ đơn</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{total} đơn huỷ trong kỳ</p>
          </div>
        </div>
        <div className="flex flex-col gap-2.5 mt-3">
          {items.map((r) => (
            <div key={r.label} className="flex items-center gap-3 text-[12.5px]">
              <span className="w-[38%] text-muted-foreground truncate">{r.label}</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(r.count / max) * 100}%`, backgroundColor: r.color }}
                />
              </div>
              <span className="w-[52px] text-right font-semibold text-foreground">{r.count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
