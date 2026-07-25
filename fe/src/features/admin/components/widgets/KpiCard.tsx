"use client";

import { Wallet, Coins, Receipt, Undo2, Package, TrendingDown, Users, UserPlus, Repeat, Star, TrendingUp, Minus } from "lucide-react";
import { AdminCard } from "@/components/admin";
import { cn } from "@/lib/utils";
import { useKpis, useDashboardRange } from "../../hooks/useDashboard";
import { WidgetSkeleton } from "./WidgetSkeleton";
import type { KpisResponse, WidgetId } from "../../types/dashboard.types";

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
  getValue: (data: KpisResponse) => string | number;
  getMeta: (data: KpisResponse) => React.ReactNode;
  status: "healthy" | "warning" | "critical";
  isMoney?: boolean;
  isPercent?: boolean;
  feature?: boolean;
};

const KPI_CONFIGS: Record<string, KpiConfig> = {
  kpiRevenue: {
    label: "Doanh thu hoa hồng (kỳ)",
    icon: Wallet,
    getValue: (d) => d.commission.value,
    getMeta: (d) => (
      <>
        {d.commission.change !== null && (
          <span className={cn("font-semibold mr-1.5", d.commission.change >= 0 ? "text-[#0E9F6E]" : "text-[#E11D48]")}>
            {d.commission.change >= 0 ? "▲" : "▼"} {Math.abs(d.commission.change)}%
          </span>
        )}
        · GMV {fmt(d.gmv.value, true, false)}
      </>
    ),
    status: "healthy",
    isMoney: true,
    feature: true,
  },
  kpiGMV: {
    label: "GMV (kỳ)",
    icon: Coins,
    getValue: (d) => d.gmv.value,
    getMeta: (d) => (
      <>
        {d.gmv.change !== null && (
          <span className={cn("font-semibold mr-1.5", d.gmv.change >= 0 ? "text-[#0E9F6E]" : "text-[#E11D48]")}>
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
    getMeta: () => "GMV / số đơn hoàn tất",
    status: "healthy",
    isMoney: true,
  },
  kpiRefund: {
    label: "Tiền hoàn (kỳ)",
    icon: Undo2,
    getValue: (d) => d.totalRefund.value,
    getMeta: () => "Tổng hoàn tiền trong kỳ",
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
          <span className={cn("font-semibold mr-1.5", d.totalOrders.change >= 0 ? "text-[#0E9F6E]" : "text-[#E11D48]")}>
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
        {d.cancelRate.change !== null && (
          <span className={cn("font-semibold mr-1.5", d.cancelRate.change <= 0 ? "text-[#0E9F6E]" : "text-[#E11D48]")}>
            {d.cancelRate.change <= 0 ? "▼" : "▲"} {Math.abs(d.cancelRate.change)}%
          </span>
        )}
        so với kỳ trước
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
    label: "Khách mới (kỳ)",
    icon: UserPlus,
    getValue: (d) => d.newCustomers.value,
    getMeta: (d) => (
      <>
        {d.newCustomers.change !== null && (
          <span className={cn("font-semibold mr-1.5", d.newCustomers.change >= 0 ? "text-[#0E9F6E]" : "text-[#E11D48]")}>
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
    getValue: (d) => (d.nps.value >= 0 ? `+${d.nps.value}` : `${d.nps.value}`),
    getMeta: (d) => `${d.nps.promoterPct}% quảng bá · ${d.nps.detractorPct}% phản đối`,
    status: "healthy",
  },
};

export function KpiCard({ id }: { id: WidgetId }) {
  const dateRange = useDashboardRange();
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
    healthy: "text-[#0E9F6E] bg-[rgba(14,159,110,0.12)]",
    warning: "text-[#D97706] bg-[rgba(217,119,6,0.14)]",
    critical: "text-[#E11D48] bg-[rgba(225,29,72,0.12)]",
  };

  const statusLabels = {
    healthy: "Healthy",
    warning: "Warning",
    critical: "Critical",
  };

  const Icon = config.icon;

  const isDarkBorder = id === "kpiRevenue"
    ? "border-[var(--c-primary)]/40 bg-gradient-to-b from-[var(--c-primary-soft)] to-[var(--c-card)]"
    : "border-[var(--c-line)] bg-[var(--c-card)]";

  return (
    <AdminCard className={cn("h-full relative overflow-hidden", isDarkBorder)}>
      {!config.feature && (
        <span className={cn("absolute top-4 right-4 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1.5", statusColors[config.status])}>
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          {statusLabels[config.status]}
        </span>
      )}
      <div className="p-5 flex flex-col justify-between h-full">
        <div className="space-y-1 mt-1">
          <div className="text-[var(--c-muted)] flex items-center gap-1.5 text-xs">
            <Icon className="w-4 h-4 text-[var(--c-muted)]" />
            <span>{config.label}</span>
          </div>
          <div className={cn("font-bold text-[var(--c-ink)] tracking-tight py-1 tabular-nums", config.feature ? "text-[34px]" : "text-[28px]")}>
            {formattedValue}
          </div>
          <div className="text-[12px] text-[var(--c-muted)] mt-1.5 font-medium leading-none">
            {config.getMeta(data)}
          </div>
        </div>
      </div>
    </AdminCard>
  );
}
