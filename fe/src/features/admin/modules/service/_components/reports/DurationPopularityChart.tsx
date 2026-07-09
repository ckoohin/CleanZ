"use client";

import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Timer, ListFilter } from "lucide-react";
import { AdminCard, AdminDialog } from "@/components/admin";
import { WidgetSkeleton } from "@/features/admin/components/widgets/WidgetSkeleton";
import { useReportDurationPopularity } from "../../hooks/useServicePackageReports";
import { servicePackageReportsApi, type ServicePackageReportFilter } from "../../services/service-package-reports.service";
import { ReportDateRangeControl } from "./ReportDateRangeControl";
import { MetricToggle } from "./MetricToggle";
import { ExportExcelButton } from "./ExportExcelButton";

const vnd = (v: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(v);

function fmtGmv(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(".0", "")}tr`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return String(v);
}

type Metric = "bookings" | "revenue";

function DurationDetailDialogBody({ baseFilter }: { baseFilter: ServicePackageReportFilter }) {
  const [from, setFrom] = useState<string | undefined>(undefined);
  const [to, setTo] = useState<string | undefined>(undefined);
  const [metric, setMetric] = useState<Metric>("bookings");
  const hasLocalRange = !!from || !!to;
  const effectiveFilter = hasLocalRange ? { ...baseFilter, from, to } : baseFilter;

  const { data, isLoading } = useReportDurationPopularity(effectiveFilter);
  const rows = (data ?? [])
    .map((d) => ({ ...d, label: `${d.packageName} · ${d.title}` }))
    .sort((a, b) => b[metric] - a[metric]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <ReportDateRangeControl from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} className="h-8 text-xs" />
        <MetricToggle
          value={metric}
          onChange={setMetric}
          options={[
            { key: "bookings", label: "Số booking" },
            { key: "revenue", label: "Doanh thu" },
          ]}
        />
      </div>

      {isLoading ? (
        <div className="h-[300px] flex items-center justify-center text-sm text-(--c-muted)">Đang tải...</div>
      ) : !rows.length ? (
        <div className="h-[200px] flex items-center justify-center text-sm text-(--c-muted)">Không có dữ liệu</div>
      ) : (
        <>
          <div style={{ height: Math.max(240, rows.length * 40) }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={rows} margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.12} />
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#8A95A8" }}
                  allowDecimals={false}
                  tickFormatter={metric === "revenue" ? fmtGmv : undefined}
                />
                <YAxis type="category" dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#8A95A8" }} width={170} />
                <Tooltip
                  formatter={(value) => [metric === "revenue" ? vnd(Number(value)) : `${value} đơn`, metric === "revenue" ? "Doanh thu" : "Số booking"]}
                  contentStyle={{
                    borderRadius: "0.75rem",
                    border: "1px solid var(--c-line)",
                    backgroundColor: "var(--c-card)",
                    fontSize: 12,
                    color: "var(--c-ink)",
                  }}
                />
                <Bar dataKey={metric} radius={[0, 6, 6, 0]} maxBarSize={22}>
                  {rows.map((d, i) => (
                    <Cell key={i} fill={d.isPopular ? "#F59E0B" : "#94A3B8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-(--c-muted) uppercase tracking-wide border-b border-(--c-line)/40">
                <th className="py-2 pr-3 font-semibold">Gói dịch vụ</th>
                <th className="py-2 pr-3 font-semibold">Mốc thời lượng</th>
                <th className="py-2 pr-3 font-semibold text-right">Booking</th>
                <th className="py-2 pl-3 font-semibold text-right">Doanh thu</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d, i) => (
                <tr key={i} className="border-b border-(--c-line)/20 last:border-0">
                  <td className="py-2.5 pr-3 text-(--c-ink)">{d.packageName}</td>
                  <td className="py-2.5 pr-3 text-(--c-ink)">
                    {d.title}
                    {d.isPopular && (
                      <span className="ml-1.5 text-[10px] font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-full">Phổ biến</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-right font-semibold text-(--c-ink)">{d.bookings.toLocaleString("vi-VN")}</td>
                  <td className="py-2.5 pl-3 text-right font-semibold text-(--c-ink)">{vnd(d.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

export function DurationPopularityChart({ filter }: { filter: ServicePackageReportFilter }) {
  const { data, isLoading } = useReportDurationPopularity(filter);
  const [detailOpen, setDetailOpen] = useState(false);

  if (isLoading) return <WidgetSkeleton rows={5} />;

  const chartData = (data ?? []).map((d) => ({
    ...d,
    label: `${d.packageName} · ${d.title}`,
  }));

  return (
    <AdminCard className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-(--c-primary-strong)" />
            <h3 className="text-[15px] font-bold text-(--c-ink)">Mốc thời lượng phổ biến</h3>
          </div>
          <p className="text-[12.5px] text-(--c-muted) mt-0.5 pl-6">
            Số booking theo từng mốc thời lượng của mỗi gói — <span className="font-semibold text-amber-600">cam</span> là mốc được đánh dấu phổ biến.
          </p>
        </div>
        {chartData.length > 0 && (
          <div className="flex items-center gap-3 shrink-0">
            <ExportExcelButton
              filenamePrefix="moc-thoi-luong-pho-bien"
              onExport={() => servicePackageReportsApi.exportDurationPopularity(filter)}
            />
            <button
              onClick={() => setDetailOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-(--c-primary-strong) hover:opacity-80 transition-opacity"
            >
              <ListFilter className="w-3.5 h-3.5" />
              Xem chi tiết
            </button>
          </div>
        )}
      </div>

      <div className="h-4" />

      {!chartData.length ? (
        <div className="h-[240px] flex items-center justify-center text-sm text-(--c-muted)">Không có dữ liệu</div>
      ) : (
        <div style={{ height: Math.max(220, chartData.length * 42) }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={chartData} margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.12} />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#8A95A8" }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#8A95A8" }}
                width={160}
              />
              <Tooltip
                formatter={(value) => [`${value} đơn`, "Số booking"]}
                contentStyle={{
                  borderRadius: "0.75rem",
                  border: "1px solid var(--c-line)",
                  backgroundColor: "var(--c-card)",
                  fontSize: 12,
                  color: "var(--c-ink)",
                }}
              />
              <Bar dataKey="bookings" radius={[0, 6, 6, 0]} maxBarSize={22}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.isPopular ? "#F59E0B" : "#94A3B8"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <AdminDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        title="Chi tiết mốc thời lượng phổ biến"
        description="Biểu đồ và bảng đầy đủ, có bộ lọc ngày và chỉ số riêng cho mục này."
        size="xl"
      >
        {detailOpen && <DurationDetailDialogBody baseFilter={filter} />}
      </AdminDialog>
    </AdminCard>
  );
}
