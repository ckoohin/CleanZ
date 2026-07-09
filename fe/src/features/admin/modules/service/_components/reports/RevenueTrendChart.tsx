"use client";

import { useState } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { AdminCard } from "@/components/admin";
import { WidgetSkeleton } from "@/features/admin/components/widgets/WidgetSkeleton";
import { useReportRevenueTrend } from "../../hooks/useServicePackageReports";
import { servicePackageReportsApi, type ServicePackageReportFilter } from "../../services/service-package-reports.service";
import { ReportDateRangeControl } from "./ReportDateRangeControl";
import { ExportExcelButton } from "./ExportExcelButton";

function fmtGmv(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(".0", "")}tr`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return String(v);
}

const GROUP_BY_OPTIONS = [
  { key: "day" as const, label: "Ngày" },
  { key: "week" as const, label: "Tuần" },
  { key: "month" as const, label: "Tháng" },
];

export function RevenueTrendChart({ filter }: { filter: ServicePackageReportFilter }) {
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("month");
  const [localFrom, setLocalFrom] = useState<string | undefined>(undefined);
  const [localTo, setLocalTo] = useState<string | undefined>(undefined);

  const hasLocalRange = !!localFrom || !!localTo;
  const effectiveFilter = hasLocalRange
    ? { ...filter, from: localFrom, to: localTo }
    : filter;

  const { data, isLoading } = useReportRevenueTrend({ ...effectiveFilter, groupBy });

  if (isLoading) return <WidgetSkeleton rows={5} />;

  return (
    <AdminCard className="p-5">
      <div className="flex flex-col gap-3 mb-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-(--c-primary-strong)" />
            <h3 className="text-[15px] font-bold text-(--c-ink)">Xu hướng doanh thu</h3>
          </div>
          <p className="text-[12.5px] text-(--c-muted) mt-0.5 pl-6">
            Tổng doanh thu và số booking theo mốc thời gian đã chọn.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ReportDateRangeControl
            from={localFrom}
            to={localTo}
            onChange={(from, to) => { setLocalFrom(from); setLocalTo(to); }}
            className="h-8 text-xs"
          />
          <div className="flex items-center gap-1 p-1 bg-(--c-card-2) rounded-xl">
            {GROUP_BY_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setGroupBy(opt.key)}
                className={[
                  "px-3 py-1 rounded-lg text-xs font-bold transition-all",
                  groupBy === opt.key ? "bg-(--c-card) text-(--c-primary-strong) shadow-sm" : "text-(--c-muted) hover:text-(--c-ink)",
                ].join(" ")}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 mb-3 pl-6">
        <div className="flex items-center gap-4 text-xs text-(--c-muted) font-medium">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#FFA000]" />
            Doanh thu
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
            Số booking
          </span>
        </div>
        <ExportExcelButton
          filenamePrefix="xu-huong-doanh-thu"
          onExport={() => servicePackageReportsApi.exportRevenueTrend({ ...effectiveFilter, groupBy })}
        />
      </div>

      {hasLocalRange && (
        <p className="text-[11px] text-(--c-muted) -mt-2 mb-3 pl-6">
          Đang xem theo khoảng ngày riêng cho biểu đồ này, khác với bộ lọc chung phía trên.
        </p>
      )}

      {!data?.length ? (
        <div className="h-[260px] flex items-center justify-center text-sm text-(--c-muted)">Không có dữ liệu</div>
      ) : (
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#8A95A8" }} dy={8} />
              <YAxis
                yAxisId="revenue"
                orientation="left"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#8A95A8" }}
                tickFormatter={fmtGmv}
              />
              <YAxis yAxisId="bookings" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#8A95A8" }} />
              <Tooltip
                formatter={(value, name) => [
                  name === "revenue" ? `${Number(value).toLocaleString("vi-VN")} đ` : `${value} đơn`,
                  name === "revenue" ? "Doanh thu" : "Booking",
                ]}
                contentStyle={{
                  borderRadius: "0.75rem",
                  border: "1px solid var(--c-line)",
                  backgroundColor: "var(--c-card)",
                  fontSize: 12,
                  color: "var(--c-ink)",
                }}
              />
              <Bar yAxisId="revenue" dataKey="revenue" fill="#FFA000" radius={[3, 3, 0, 0]} maxBarSize={30} />
              <Line
                yAxisId="bookings"
                dataKey="bookings"
                type="monotone"
                stroke="#2563EB"
                strokeWidth={2}
                dot={{ r: 3, fill: "#2563EB", strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </AdminCard>
  );
}
