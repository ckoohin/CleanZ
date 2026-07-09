"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Clock } from "lucide-react";
import { AdminCard } from "@/components/admin";
import { WidgetSkeleton } from "@/features/admin/components/widgets/WidgetSkeleton";
import { useReportHourlyDistribution } from "../../hooks/useServicePackageReports";
import { servicePackageReportsApi, type ServicePackageReportFilter } from "../../services/service-package-reports.service";
import { ExportExcelButton } from "./ExportExcelButton";

export function HourlyDistributionChart({ filter }: { filter: ServicePackageReportFilter }) {
  const { data, isLoading } = useReportHourlyDistribution(filter);

  if (isLoading) return <WidgetSkeleton rows={5} />;

  const chartData = (data ?? []).map((d) => ({ ...d, label: `${d.hour}h` }));
  const hasData = chartData.some((d) => d.bookings > 0);

  return (
    <AdminCard className="p-5">
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-(--c-primary-strong)" />
          <h3 className="text-[15px] font-bold text-(--c-ink)">Phân bố booking theo giờ trong ngày</h3>
        </div>
        {hasData && (
          <ExportExcelButton
            filenamePrefix="phan-bo-theo-gio"
            onExport={() => servicePackageReportsApi.exportHourlyDistribution(filter)}
            className="shrink-0"
          />
        )}
      </div>
      <p className="text-[12.5px] text-(--c-muted) mb-4">Theo giờ làm việc thực tế (scheduled_start)</p>

      {!hasData ? (
        <div className="h-[240px] flex items-center justify-center text-sm text-(--c-muted)">Không có dữ liệu</div>
      ) : (
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#8A95A8" }}
                interval={1}
              />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#8A95A8" }} allowDecimals={false} />
              <Tooltip
                formatter={(value) => [`${value} booking`, "Số lượng"]}
                labelFormatter={(label) => `Khung giờ ${label}`}
                contentStyle={{
                  borderRadius: "0.75rem",
                  border: "1px solid var(--c-line)",
                  backgroundColor: "var(--c-card)",
                  fontSize: 12,
                  color: "var(--c-ink)",
                }}
              />
              <Bar dataKey="bookings" fill="#7C3AED" radius={[3, 3, 0, 0]} maxBarSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </AdminCard>
  );
}
