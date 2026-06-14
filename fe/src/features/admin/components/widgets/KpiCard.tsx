"use client";

import { Wallet, Coins, Receipt, Undo2, Package, TrendingDown, Users, UserPlus, Repeat, Star, TrendingUp, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useKpis } from "../../hooks/useDashboard";
import { useDashboardStore } from "../../stores/dashboard.store";
import { WidgetSkeleton } from "./WidgetSkeleton";
import type { WidgetId } from "../../types/dashboard.types";

function fmt(value: number, isMoney: boolean, isPercent: boolean) {
  if (isPercent) return `${value.toFixed(1).replace(".0", "")}%`;
  if (isMoney) {
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1).replace(".0", "")} tỷ`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(".0", "")}M đ`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K đ`;
    return `${value.toLocaleString("vi-VN")} đ`;
  }
  return value.toLocaleString("vi-VN");
}

type KpiConfig = {
  label: string;
  icon: React.ElementType;
  getValue: (data: any) => string | number;
  getMeta: (data: any) => React.ReactNode;
  status: "healthy" | "warning" | "critical";
  isMoney?: boolean;
  isPercent?: boolean;
  feature?: boolean;
};

const KPI_CONFIGS: Record<string, KpiConfig> = {
  kpiRevenue: {
    label: "Doanh thu hoa hồng (tháng)",
    icon: Wallet,
    getValue: (d) => d.gmv.value * 0.2, // margin 20%
    getMeta: (d) => (
      <>
        <span className="text-emerald-500 font-semibold">▲ 18.4%</span> · GMV {fmt(d.gmv.value, true, false)} · margin 20%
      </>
    ),
    status: "healthy",
    isMoney: true,
    feature: true,
  },
  kpiGMV: {
    label: "GMV (tháng)",
    icon: Coins,
    getValue: (d) => d.gmv.value,
    getMeta: (d) => (
      <>
        {d.gmv.change !== null && (
          <span className={cn("font-semibold mr-1.5", d.gmv.change >= 0 ? "text-emerald-500" : "text-red-500")}>
            {d.gmv.change >= 0 ? "▲" : "▼"} {Math.abs(d.gmv.change)}%
          </span>
        )}
        so với kỳ trước
      </>
    ),
    status: "healthy",
    isMoney: true,
  },
  kpiAOV: {
    label: "Giá trị đơn TB",
    icon: Receipt,
    getValue: (d) => d.aov.value,
    getMeta: (d) => (
      <>
        <span className="text-emerald-500 font-semibold">▲ 4%</span> so với kỳ trước
      </>
    ),
    status: "healthy",
    isMoney: true,
  },
  kpiRefund: {
    label: "Tiền hoàn (tháng)",
    icon: Undo2,
    getValue: (d) => d.totalRefund.value,
    getMeta: (d) => "14 giao dịch · 1.2% GMV",
    status: "healthy",
    isMoney: true,
  },
  kpiOrders: {
    label: "Đơn hàng",
    icon: Package,
    getValue: (d) => d.totalOrders.value,
    getMeta: (d) => (
      <>
        {d.totalOrders.change !== null && (
          <span className={cn("font-semibold mr-1.5", d.totalOrders.change >= 0 ? "text-emerald-500" : "text-red-500")}>
            {d.totalOrders.change >= 0 ? "▲" : "▼"} {Math.abs(d.totalOrders.change)}%
          </span>
        )}
        so với kỳ trước
      </>
    ),
    status: "healthy",
  },
  kpiCancel: {
    label: "Tỉ lệ huỷ",
    icon: TrendingDown,
    getValue: (d) => d.cancelRate.value,
    getMeta: (d) => (
      <>
        <span className="text-emerald-500 font-semibold">▼ 0.5%</span> đang cải thiện
      </>
    ),
    status: "healthy",
    isPercent: true,
  },
  kpiTaskers: {
    label: "Tasker online",
    icon: Users,
    getValue: (d) => `${d.activeTaskers.online}/${d.activeTaskers.total}`,
    getMeta: (d) => `${d.activeTaskers.online} đang rảnh nhận đơn`,
    status: "healthy",
  },
  kpiNewCust: {
    label: "Khách mới (tháng)",
    icon: UserPlus,
    getValue: (d) => d.newCustomers.value,
    getMeta: (d) => (
      <>
        {d.newCustomers.change !== null && (
          <span className={cn("font-semibold mr-1.5", d.newCustomers.change >= 0 ? "text-emerald-500" : "text-red-500")}>
            {d.newCustomers.change >= 0 ? "▲" : "▼"} {Math.abs(d.newCustomers.change)}%
          </span>
        )}
        so với kỳ trước
      </>
    ),
    status: "healthy",
  },
  kpiRetention: {
    label: "Tỉ lệ quay lại",
    icon: Repeat,
    getValue: (d) => d.returningRate.value,
    getMeta: (d) => "khách đặt ≥ 2 lần",
    status: "healthy",
    isPercent: true,
  },
  kpiNPS: {
    label: "NPS",
    icon: Star,
    getValue: () => "+62",
    getMeta: () => "72% quảng bá · 10% phản đối",
    status: "healthy",
  },
};

export function KpiCard({ id }: { id: WidgetId }) {
  const { dateRange } = useDashboardStore();
  const { data, isLoading } = useKpis(dateRange);

  const config = KPI_CONFIGS[id];
  if (!config) return null;

  if (isLoading) return <WidgetSkeleton rows={2} />;
  if (!data) return null;

  const rawValue = config.getValue(data);
  const formattedValue =
    typeof rawValue === "number"
      ? fmt(rawValue, !!config.isMoney, !!config.isPercent)
      : rawValue;

  const statusColors = {
    healthy: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    critical: "bg-red-500/10 text-red-600 dark:text-red-400",
  };

  const statusLabels = {
    healthy: "Healthy",
    warning: "Warning",
    critical: "Critical",
  };

  const Icon = config.icon;

  const isDarkBorder = id === "kpiRevenue"
    ? "border-indigo-600/50 dark:border-indigo-500/50 bg-gradient-to-b from-indigo-500/5 to-card"
    : "border-border bg-card";

  return (
    <Card className={cn("shadow-sm rounded-2xl h-full relative overflow-hidden", isDarkBorder)}>
      {!config.feature && (
        <span className={cn("absolute top-4 right-4 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1.5", statusColors[config.status])}>
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          {statusLabels[config.status]}
        </span>
      )}
      <CardContent className="p-5 flex flex-col justify-between h-full">
        <div className="space-y-1 mt-1">
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <Icon className="w-4 h-4 text-muted-foreground/80" />
            <span>{config.label}</span>
          </div>
          <div className={cn("font-bold text-foreground tracking-tight py-1", config.feature ? "text-[34px]" : "text-[28px]")}>
            {formattedValue}
          </div>
          <div className="text-[12px] text-muted-foreground mt-1.5 font-medium leading-none">
            {config.getMeta(data)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
