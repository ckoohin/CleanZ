"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Package } from "lucide-react";
import { AdminCard } from "@/components/admin";
import { WidgetSkeleton } from "@/features/admin/components/widgets/WidgetSkeleton";
import { useReportRevenueByPackage } from "../../hooks/useServicePackageReports";
import { servicePackageReportsApi, type ServicePackageReportFilter } from "../../services/service-package-reports.service";
import { ExportExcelButton } from "./ExportExcelButton";

const COLORS = ["#2563EB", "#0E9F6E", "#F59E0B", "#7C3AED", "#E11D48", "#0891B2", "#DB2777", "#65A30D"];

function fmtGmv(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(".0", "")}tr`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return String(v);
}

export function RevenueByPackageChart({ filter }: { filter: ServicePackageReportFilter }) {
  const { data, isLoading } = useReportRevenueByPackage(filter);

  if (isLoading) return <WidgetSkeleton rows={5} />;

  const sorted = [...(data ?? [])].sort((a, b) => b.revenue - a.revenue);
  const totalRevenue = sorted.reduce((sum, p) => sum + p.revenue, 0);
  const totalBookings = sorted.reduce((sum, p) => sum + p.bookings, 0);

  return (
    <AdminCard className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-(--c-primary-strong)" />
            <h3 className="text-[15px] font-bold text-(--c-ink)">Doanh thu theo gói dịch vụ</h3>
          </div>
          <p className="text-[12.5px] text-(--c-muted) mt-0.5 pl-6">
            {sorted.length} gói dịch vụ · {totalBookings.toLocaleString("vi-VN")} booking · {totalRevenue.toLocaleString("vi-VN")} đ tổng doanh thu (kể cả gói chưa có booking).
          </p>
        </div>
        {sorted.length > 0 && (
          <ExportExcelButton
            filenamePrefix="doanh-thu-theo-goi"
            onExport={() => servicePackageReportsApi.exportRevenueByPackage(filter)}
            className="shrink-0"
          />
        )}
      </div>
      <div className="h-4" />

      {!sorted.length ? (
        <div className="h-[280px] flex items-center justify-center text-sm text-(--c-muted)">Không có dữ liệu</div>
      ) : (
        <div style={{ height: Math.max(220, sorted.length * 42) }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={sorted} margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.12} />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#8A95A8" }} tickFormatter={fmtGmv} />
              <YAxis
                type="category"
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#8A95A8" }}
                width={140}
              />
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
              <Bar dataKey="revenue" radius={[0, 6, 6, 0]} maxBarSize={22}>
                {sorted.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </AdminCard>
  );
}
