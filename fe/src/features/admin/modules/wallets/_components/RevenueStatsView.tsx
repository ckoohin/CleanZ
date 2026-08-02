"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Banknote,
  BarChart3,
  CalendarDays,
  Download,
  HandCoins,
  Wallet,
  Eye,
} from "lucide-react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { AdminCard, PageHeader, StatCard } from "@/components/admin";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminRevenueSummary } from "../hooks/useAdminWallets";
import type { RevenueSummaryResponse } from "../types/wallet.types";
import { RevenuePeriodDetailDrawer } from "./RevenuePeriodDetailDrawer";

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    val
  );

export function RevenueStatsView() {
  const [granularity, setGranularity] = useState<"day" | "week" | "month">("month");
  const [selectedPeriod, setSelectedPeriod] = useState<(RevenueSummaryResponse & { label: string }) | null>(null);
  const [dateRange, setDateRange] = useState<{
    startDate: Date | null;
    endDate: Date | null;
  }>({
    startDate: null,
    endDate: null,
  });

  const { data, isLoading } = useAdminRevenueSummary({
    granularity,
    fromDate: dateRange.startDate?.toISOString() ?? undefined,
    toDate: dateRange.endDate?.toISOString() ?? undefined,
  });

  const { chartData, totals } = useMemo(() => {
    if (!data) return { chartData: [], totals: { rev: 0, comm: 0, tasker: 0, txns: 0 } };

    const t = { rev: 0, comm: 0, tasker: 0, txns: 0 };
    const chart = data.map((d: RevenueSummaryResponse) => {
      t.rev += Number(d.totalRevenue);
      t.comm += Number(d.totalPlatformCommission);
      t.tasker += Number(d.totalTaskerEarnings);
      t.txns += Number(d.totalTransactions);

      let label = d.period;
      if (granularity === "day") {
        label = format(new Date(d.period), "dd/MM/yyyy");
      } else if (granularity === "month") {
        label = format(new Date(d.period), "MM/yyyy");
      }

      return {
        ...d,
        label,
        totalRevenue: Number(d.totalRevenue),
        totalPlatformCommission: Number(d.totalPlatformCommission),
        totalTaskerEarnings: Number(d.totalTaskerEarnings),
        totalTransactions: Number(d.totalTransactions),
      };
    });

    return { chartData: chart, totals: t };
  }, [data, granularity]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={<span className="flex items-center gap-2"><Banknote className="w-6 h-6 text-[var(--c-primary-strong)]" /> Doanh thu & Hoa hồng</span>}
        description="Thống kê tổng doanh thu nền tảng, hoa hồng và thu nhập của Tasker"
      />

      <AdminCard className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[var(--c-ink)]">
              Mức độ:
            </span>
            <Select
              value={granularity}
              onValueChange={(v: "day" | "week" | "month") => setGranularity(v)}
            >
              <SelectTrigger className="w-[140px] h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Theo ngày</SelectItem>
                <SelectItem value="week">Theo tuần</SelectItem>
                <SelectItem value="month">Theo tháng</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[var(--c-ink)]">
              Thời gian:
            </span>
            <div className="w-[280px]">
              <DateRangePicker
                startDate={dateRange.startDate?.toISOString() ?? ""}
                endDate={dateRange.endDate?.toISOString() ?? ""}
                onRangeChange={(startStr, endStr) =>
                  setDateRange({
                    startDate: startStr ? new Date(startStr) : null,
                    endDate: endStr ? new Date(endStr) : null,
                  })
                }
                placeholder="Lọc theo khoảng thời gian"
              />
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {}}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--c-primary)] px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-[var(--c-primary-strong)] transition-colors"
        >
          <Download className="w-4 h-4" />
          Xuất báo cáo
        </button>
      </AdminCard>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-2xl bg-[var(--c-card)] animate-pulse border border-[var(--c-line)]"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Đơn hoàn thiện"
            value={totals.txns.toLocaleString("vi-VN")}
            icon={BarChart3}
            tint="#9333EA"
          />
          <StatCard
            label="Làm được (Tổng giá trị)"
            value={formatCurrency(totals.rev)}
            icon={Banknote}
            tint="#2563EB"
          />
          <StatCard
            label="Thu được (Thu nhập Tasker)"
            value={formatCurrency(totals.tasker)}
            icon={Wallet}
            tint="#F59E0B"
          />
          <StatCard
            label="Phí nền tảng (Hoa hồng)"
            value={formatCurrency(totals.comm)}
            icon={HandCoins}
            tint="#0E9F6E"
          />
        </div>
      )}

      {!isLoading && chartData.length > 0 && (
        <AdminCard className="p-5">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[var(--c-ink)] flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[var(--c-primary-strong)]" />
                Biểu đồ thống kê
              </h3>
              <p className="text-xs text-[var(--c-muted)] mt-1">
                Diễn biến dòng tiền theo {granularity === "day" ? "ngày" : granularity === "week" ? "tuần" : "tháng"}
              </p>
            </div>
          </div>
          <div className="h-[360px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--c-line)" />
                <XAxis 
                  dataKey="label" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: "var(--c-muted)" }} 
                  dy={10}
                />
                <YAxis
                  yAxisId="left"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "var(--c-muted)" }}
                  tickFormatter={(val) => `${(val / 1000000).toFixed(0)}Tr`}
                  dx={-10}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "var(--c-muted)" }}
                  dx={10}
                />
                <RechartsTooltip
                  cursor={{ fill: "var(--c-card-2)" }}
                  contentStyle={{
                    backgroundColor: "var(--c-card)",
                    borderRadius: "12px",
                    border: "1px solid var(--c-line-strong)",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    fontSize: "13px",
                  }}
                  formatter={(
                    val: number | string | readonly (string | number)[] | undefined,
                    name: string | number | undefined
                  ) => [
                    name === "totalTransactions" ? Number(val).toLocaleString("vi-VN") : formatCurrency(Number(val)),
                    name === "totalRevenue" ? "Doanh thu" : name === "totalPlatformCommission" ? "Hoa hồng" : name === "totalTaskerEarnings" ? "Thu nhập Tasker" : "Giao dịch"
                  ]}
                  labelStyle={{ fontWeight: 700, color: "var(--c-ink)", marginBottom: "8px" }}
                />
                <Legend wrapperStyle={{ paddingTop: "20px", fontSize: "13px" }} />
                <Bar yAxisId="left" dataKey="totalTaskerEarnings" stackId="a" fill="#F59E0B" name="Thu nhập Tasker" radius={[0, 0, 4, 4]} maxBarSize={40} />
                <Bar yAxisId="left" dataKey="totalPlatformCommission" stackId="a" fill="#0E9F6E" name="Hoa hồng nền tảng" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Line yAxisId="left" type="monotone" dataKey="totalRevenue" stroke="#2563EB" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} name="Doanh thu" />
                <Line yAxisId="right" type="monotone" dataKey="totalTransactions" stroke="#9333EA" strokeDasharray="5 5" strokeWidth={2} dot={{ r: 3 }} name="Số giao dịch" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </AdminCard>
      )}

      <AdminCard className="overflow-hidden">
        <div className="flex items-center gap-2 px-5 pt-4 pb-3 border-b border-[var(--c-line)]">
          <CalendarDays className="w-4 h-4 text-[var(--c-primary-strong)]" aria-hidden="true" />
          <h3 className="text-sm font-bold text-[var(--c-ink)]">
            Bảng chi tiết theo {granularity === "day" ? "ngày" : granularity === "week" ? "tuần" : "tháng"}
          </h3>
        </div>
        
        {isLoading ? (
          <div className="p-5 space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-[var(--c-card-2)] rounded-lg animate-pulse" />
            ))}
          </div>
        ) : chartData.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <HandCoins className="w-10 h-10 text-[var(--c-muted)]/30 mb-3" />
            <p className="text-sm font-semibold text-[var(--c-ink)]">Chưa có dữ liệu</p>
            <p className="text-xs text-[var(--c-muted)] mt-1">Không có giao dịch nào trong khoảng thời gian này.</p>
          </div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left text-[13.5px]">
              <thead className="sticky top-0 bg-[var(--c-card)] shadow-sm z-10">
                <tr>
                  <th className="py-3 px-5 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px]">Kỳ</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] text-right text-purple-600">Hoàn thiện (Đơn)</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] text-right text-blue-600">Làm được (Tổng giá trị)</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] text-right text-amber-600">Thu được (Tasker)</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] text-right text-emerald-600">Phí nền tảng</th>
                  <th className="py-3 px-5 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--c-line)]">
                {chartData.map((row: RevenueSummaryResponse & { label: string }, idx: number) => (
                  <tr key={idx} className="hover:bg-[var(--c-card-2)]/50 transition-colors">
                    <td className="py-3 px-5 font-bold text-[var(--c-ink)]">{row.label}</td>
                    <td className="py-3 px-4 text-right font-bold text-purple-600 tabular-nums">
                      {row.totalTransactions.toLocaleString("vi-VN")}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-blue-600 tabular-nums bg-blue-50/30">
                      {formatCurrency(row.totalRevenue)}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-amber-600 tabular-nums bg-amber-50/30">
                      {formatCurrency(row.totalTaskerEarnings)}
                    </td>
                    <td className="py-3 px-5 text-right font-bold text-emerald-600 tabular-nums bg-emerald-50/50">
                      {formatCurrency(row.totalPlatformCommission)}
                    </td>
                    <td className="py-3 px-5 text-right">
                      <button
                        type="button"
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--c-card)] hover:bg-[var(--c-card-2)] border border-[var(--c-line)] text-[var(--c-muted)] hover:text-[var(--c-primary)] transition-colors"
                        title="Xem chi tiết"
                        onClick={() => setSelectedPeriod(row)}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="sticky bottom-0 bg-[var(--c-card)] border-t-2 border-[var(--c-line-strong)]">
                <tr>
                  <td className="py-3 px-5 font-black text-[var(--c-ink)] uppercase">Tổng cộng</td>
                  <td className="py-3 px-4 text-right font-black text-purple-600 tabular-nums">
                    {totals.txns.toLocaleString("vi-VN")}
                  </td>
                  <td className="py-3 px-4 text-right font-black text-blue-600 tabular-nums">
                    {formatCurrency(totals.rev)}
                  </td>
                  <td className="py-3 px-4 text-right font-black text-amber-600 tabular-nums">
                    {formatCurrency(totals.tasker)}
                  </td>
                  <td className="py-3 px-5 text-right font-black text-emerald-600 tabular-nums">
                    {formatCurrency(totals.comm)}
                  </td>
                  <td className="py-3 px-5"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </AdminCard>
      <RevenuePeriodDetailDrawer
        data={selectedPeriod}
        granularity={granularity}
        open={!!selectedPeriod}
        onClose={() => setSelectedPeriod(null)}
      />
    </div>
  );
}
