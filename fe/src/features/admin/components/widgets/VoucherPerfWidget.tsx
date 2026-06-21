"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useVoucherPerformance } from "../../hooks/useDashboard";
import { WidgetSkeleton } from "./WidgetSkeleton";

const COLORS = ["#1d9e75", "#b45309", "#1d4ed8", "#534ab7", "#d85a30", "#0e7490"];

export function VoucherPerfWidget() {
  const { data, isLoading } = useVoucherPerformance();

  if (isLoading) return <WidgetSkeleton rows={3} />;

  const vouchers = data ?? [];

  return (
    <Card className="border border-border bg-card shadow-sm rounded-2xl h-full flex flex-col justify-between">
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-[15px] font-semibold text-foreground">Hiệu quả voucher</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Lượt dùng / giới hạn</p>
          </div>
        </div>
        {vouchers.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">
            Chưa có voucher đang hoạt động
          </p>
        ) : (
          <div className="flex flex-col gap-3 mt-3">
            {vouchers.map((v, i) => {
              const pct = v.limit ? Math.min((v.used / v.limit) * 100, 100) : 0;
              return (
                <div key={v.code} className="flex items-center gap-3 text-[12.5px]">
                  <span className="w-[38%] font-semibold text-foreground truncate">
                    {v.code}
                  </span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                    />
                  </div>
                  <span className="w-[60px] text-right font-medium text-muted-foreground shrink-0 text-xs">
                    {v.used}/{v.limit ?? "∞"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
