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
  Calculator,
  TrendingUp,
  Percent,
  UserCheck,
  Package,
  Search,
  Maximize2,
  Minimize2,
  Receipt,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RotateCcw,
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
import { Input } from "@/components/ui/input";
import { useAdminRevenueSummary, useAdminRevenuePayroll } from "../hooks/useAdminWallets";
import { useAdminTasker } from "@/features/admin/modules/tasker/hooks/admin-tasker.hooks";
import { useAdminPackages } from "@/features/admin/modules/service/hooks/useAdminServices";
import { useAdminBookingDetail } from "@/features/admin/modules/booking/hooks/useAdminBooking";
import type { AdminTasker } from "@/features/admin/modules/tasker/types/admin-tasker.types";
import type { RevenueSummaryResponse } from "../types/wallet.types";
import { RevenuePeriodDetailDrawer } from "./RevenuePeriodDetailDrawer";
import { AdminBookingDetailModal } from "@/features/admin/modules/booking/_components/AdminBookingDetailModal";
import { cn } from "@/lib/utils";

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    val
  );

function fmtDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPageNumbers(currentPage: number, totalPages: number): (number | string)[] {
  const pages: (number | string)[] = [];
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("...");
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }
  return pages;
}

export function RevenueStatsView() {
  const [granularity, setGranularity] = useState<"day" | "week" | "month">("month");
  const [selectedPeriod, setSelectedPeriod] = useState<(RevenueSummaryResponse & { label: string }) | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [selectedTaskerId, setSelectedTaskerId] = useState<string>("ALL");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("ALL");
  const [dateRange, setDateRange] = useState<{
    startDate: Date | null;
    endDate: Date | null;
  }>({
    startDate: null,
    endDate: null,
  });

  // ── State bảng Payroll ───────────────────────────────────────────────────
  const [payrollPage, setPayrollPage] = useState(1);
  const [payrollLimit, setPayrollLimit] = useState(10);
  const [payrollSearch, setPayrollSearch] = useState("");
  const [isPayrollExpanded, setIsPayrollExpanded] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);

  // ── State bảng Summary theo kỳ ──────────────────────────────────────────
  const [summaryPage, setSummaryPage] = useState(1);
  const [summaryLimit, setSummaryLimit] = useState(10);

  // ── Queries lọc Tasker & Dịch vụ (Packages) ──────────────────────────────
  const { data: taskerData } = useAdminTasker({ page: 1, limit: 50 });
  const { data: serviceData } = useAdminPackages();

  // ── Fetch chi tiết Booking khi bấm Chi tiết ───────────────────────────────
  const { booking: selectedBookingDetail } =
    useAdminBookingDetail(selectedBookingId);

  const queryParams = useMemo(
    () => ({
      granularity,
      fromDate: dateRange.startDate?.toISOString() ?? undefined,
      toDate: dateRange.endDate?.toISOString() ?? undefined,
      taskerId: selectedTaskerId !== "ALL" ? selectedTaskerId : undefined,
      serviceId: selectedServiceId !== "ALL" ? selectedServiceId : undefined,
    }),
    [granularity, dateRange, selectedTaskerId, selectedServiceId]
  );

  const { data, isLoading } = useAdminRevenueSummary(queryParams);

  const payrollQueryParams = useMemo(
    () => ({
      page: payrollPage,
      limit: payrollLimit,
      fromDate: dateRange.startDate?.toISOString() ?? undefined,
      toDate: dateRange.endDate?.toISOString() ?? undefined,
      taskerId: selectedTaskerId !== "ALL" ? selectedTaskerId : undefined,
      serviceId: selectedServiceId !== "ALL" ? selectedServiceId : undefined,
      search: payrollSearch.trim() || undefined,
    }),
    [payrollPage, payrollLimit, dateRange, selectedTaskerId, selectedServiceId, payrollSearch]
  );

  const { data: payrollData, isLoading: isPayrollLoading } = useAdminRevenuePayroll(payrollQueryParams);

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

  const extendedKpis = useMemo(() => {
    const aov = totals.txns > 0 ? Math.round(totals.rev / totals.txns) : 0;
    const feeRate = totals.rev > 0 ? ((totals.comm / totals.rev) * 100).toFixed(1) : "0";
    return { aov, feeRate };
  }, [totals]);

  const summaryTotalPages = useMemo(() => {
    return Math.max(1, Math.ceil(chartData.length / summaryLimit));
  }, [chartData.length, summaryLimit]);

  const pagedChartData = useMemo(() => {
    const start = (summaryPage - 1) * summaryLimit;
    return chartData.slice(start, start + summaryLimit);
  }, [chartData, summaryPage, summaryLimit]);

  const handleResetFilters = () => {
    setGranularity("month");
    setSelectedTaskerId("ALL");
    setSelectedServiceId("ALL");
    setDateRange({ startDate: null, endDate: null });
    setPayrollSearch("");
    setPayrollPage(1);
    setSummaryPage(1);
  };

  const isFiltered =
    selectedTaskerId !== "ALL" ||
    selectedServiceId !== "ALL" ||
    dateRange.startDate !== null ||
    dateRange.endDate !== null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={<span className="flex items-center gap-2"><Banknote className="w-6 h-6 text-[var(--c-primary-strong)]" /> Doanh thu & Hoa hồng hệ thống</span>}
        description="Thống kê tổng doanh thu nền tảng, hoa hồng sàn, thu nhập Tasker & bảng kê đơn hàng toàn dự án."
      />

      {/* Thanh bộ lọc đa chiều (Multi-dimensional Filter Bar) */}
      <AdminCard className="p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Lọc Mức độ */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[var(--c-ink)] shrink-0">
                Mức độ:
              </span>
              <Select
                value={granularity}
                onValueChange={(v: "day" | "week" | "month") => setGranularity(v)}
              >
                <SelectTrigger className="w-[130px] h-9 text-xs font-semibold rounded-xl border-[var(--c-line)] bg-[var(--c-card-2)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Theo ngày</SelectItem>
                  <SelectItem value="week">Theo tuần</SelectItem>
                  <SelectItem value="month">Theo tháng</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Lọc Ngày */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[var(--c-ink)] shrink-0">
                Thời gian:
              </span>
              <div className="w-[260px]">
                <DateRangePicker
                  startDate={dateRange.startDate?.toISOString() ?? ""}
                  endDate={dateRange.endDate?.toISOString() ?? ""}
                  onRangeChange={(startStr, endStr) =>
                    setDateRange({
                      startDate: startStr ? new Date(startStr) : null,
                      endDate: endStr ? new Date(endStr) : null,
                    })
                  }
                  placeholder="Chọn khoảng thời gian"
                />
              </div>
            </div>

            {/* Lọc Tasker */}
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[var(--c-primary-strong)] shrink-0" />
              <Select
                value={selectedTaskerId}
                onValueChange={setSelectedTaskerId}
              >
                <SelectTrigger className="w-[180px] h-9 text-xs font-semibold rounded-xl border-[var(--c-line)] bg-[var(--c-card-2)]">
                  <SelectValue placeholder="Tất cả Tasker" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="ALL">Tất cả Tasker</SelectItem>
                  {taskerData?.data?.map((t: AdminTasker) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.fullName ?? "Tasker chưa đặt tên"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Lọc Dịch vụ */}
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-[var(--c-primary-strong)] shrink-0" />
              <Select
                value={selectedServiceId}
                onValueChange={setSelectedServiceId}
              >
                <SelectTrigger className="w-[180px] h-9 text-xs font-semibold rounded-xl border-[var(--c-line)] bg-[var(--c-card-2)]">
                  <SelectValue placeholder="Tất cả Dịch vụ" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="ALL">Tất cả Dịch vụ</SelectItem>
                  {Array.isArray(serviceData) &&
                    serviceData.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {isFiltered && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 text-xs font-bold transition-colors"
                title="Xóa bộ lọc"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Đặt lại</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => {}}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--c-primary)] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[var(--c-primary-strong)] transition-colors"
          >
            <Download className="w-4 h-4" />
            Xuất báo cáo
          </button>
        </div>
      </AdminCard>

      {/* 4 Thẻ StatCard cốt lõi */}
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
            label="Đơn hoàn thành"
            value={totals.txns.toLocaleString("vi-VN")}
            icon={BarChart3}
            tint="#9333EA"
          />
          <StatCard
            label="Tổng doanh thu"
            value={formatCurrency(totals.rev)}
            icon={Banknote}
            tint="#2563EB"
          />
          <StatCard
            label="Thu nhập Tasker"
            value={formatCurrency(totals.tasker)}
            icon={Wallet}
            tint="#F59E0B"
          />
          <StatCard
            label="Hoa hồng nền tảng"
            value={formatCurrency(totals.comm)}
            icon={HandCoins}
            tint="#0E9F6E"
          />
        </div>
      )}

      {/* Khối Phân Tích Chỉ Số Tài Chính Nâng Cao (Extended Financial Analytics) */}
      {!isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-[var(--c-card)] border border-[var(--c-line)] shadow-sm">
            <div className="p-2.5 rounded-xl bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)]">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--c-muted)]">Giá trị đơn TB (AOV)</p>
              <p className="text-base font-black text-[var(--c-ink)] tabular-nums mt-0.5">{formatCurrency(extendedKpis.aov)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-[var(--c-card)] border border-[var(--c-line)] shadow-sm">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--c-muted)]">Tỷ lệ Hoa hồng thực tế</p>
              <p className="text-base font-black text-emerald-600 tabular-nums mt-0.5">{extendedKpis.feeRate}% Gross</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-[var(--c-card)] border border-[var(--c-line)] shadow-sm">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--c-muted)]">Tỷ lệ Chia Tasker</p>
              <p className="text-base font-black text-amber-600 tabular-nums mt-0.5">
                {totals.rev > 0 ? ((totals.tasker / totals.rev) * 100).toFixed(1) : "0"}% Gross
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-[var(--c-card)] border border-[var(--c-line)] shadow-sm">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--c-muted)]">Kỳ đang hiển thị</p>
              <p className="text-base font-black text-indigo-600 tabular-nums mt-0.5">{chartData.length} kỳ</p>
            </div>
          </div>
        </div>
      )}

      {/* Biểu đồ Thống kê */}
      {!isLoading && chartData.length > 0 && (
        <AdminCard className="p-5">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[var(--c-ink)] flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[var(--c-primary-strong)]" />
                Biểu đồ thống kê dòng tiền
              </h3>
              <p className="text-xs text-[var(--c-muted)] mt-1">
                Diễn biến dòng tiền theo {granularity === "day" ? "ngày" : granularity === "week" ? "tuần" : "tháng"} (Gross = Tasker Net + Hoa hồng Fee)
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
                  tickFormatter={(val) => val >= 1000000 ? `${(val / 1000000).toFixed(0)}M` : `${(val / 1000).toFixed(0)}k`}
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
                    val: any,
                    name: any,
                    item: any
                  ) => {
                    const key = String(item?.dataKey ?? name);
                    const isTxns = key === "totalTransactions" || name === "Số đơn hoàn thành";
                    const formattedVal = isTxns
                      ? `${Number(val).toLocaleString("vi-VN")} đơn`
                      : formatCurrency(Number(val));
                    const labelName =
                      key === "totalRevenue"
                        ? "Tổng doanh thu"
                        : key === "totalPlatformCommission"
                        ? "Hoa hồng nền tảng"
                        : key === "totalTaskerEarnings"
                        ? "Thu nhập Tasker"
                        : String(name);
                    return [formattedVal, labelName];
                  }}
                  labelStyle={{ fontWeight: 700, color: "var(--c-ink)", marginBottom: "8px" }}
                />
                <Legend wrapperStyle={{ paddingTop: "20px", fontSize: "13px" }} />
                <Bar yAxisId="left" dataKey="totalTaskerEarnings" stackId="revenue" fill="#F59E0B" name="Thu nhập Tasker" radius={[0, 0, 4, 4]} maxBarSize={40} />
                <Bar yAxisId="left" dataKey="totalPlatformCommission" stackId="revenue" fill="#0E9F6E" name="Hoa hồng nền tảng" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Line yAxisId="left" type="monotone" dataKey="totalRevenue" stroke="#2563EB" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} name="Tổng doanh thu" />
                <Line yAxisId="right" type="monotone" dataKey="totalTransactions" stroke="#9333EA" strokeDasharray="5 5" strokeWidth={2} dot={{ r: 3 }} name="Số đơn hoàn thành" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </AdminCard>
      )}

      {/* Bảng chi tiết theo Kỳ */}
      <AdminCard className="overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[var(--c-line)]">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-[var(--c-primary-strong)]" aria-hidden="true" />
            <h3 className="text-sm font-bold text-[var(--c-ink)]">
              Bảng tổng hợp theo {granularity === "day" ? "ngày" : granularity === "week" ? "tuần" : "tháng"}
            </h3>
            {chartData.length > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)]">
                {chartData.length} kỳ
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsSummaryExpanded(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[var(--c-ink)] bg-[var(--c-card-2)] hover:bg-[var(--c-line)] rounded-xl transition-colors border border-[var(--c-line)] shrink-0"
            title="Phóng to bảng tổng hợp"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Phóng to</span>
          </button>
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
            <p className="text-xs text-[var(--c-muted)] mt-1">Không có đơn hàng nào trong khoảng thời gian và bộ lọc này.</p>
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left text-[13.5px]">
              <thead className="sticky top-0 bg-[var(--c-card)] shadow-sm z-10">
                <tr>
                  <th className="py-3.5 px-5 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px]">Kỳ</th>
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] text-right">Đơn hoàn thành</th>
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] text-right">Tổng doanh thu</th>
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] text-right">Thu nhập Tasker</th>
                  <th className="py-3.5 px-5 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] text-right">Hoa hồng nền tảng</th>
                  <th className="py-3.5 px-5 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--c-line)]">
                {pagedChartData.map((row: RevenueSummaryResponse & { label: string }, idx: number) => (
                  <tr key={idx} className="hover:bg-[var(--c-card-2)]/60 transition-colors">
                    <td className="py-3.5 px-5 font-bold text-[var(--c-ink)]">{row.label}</td>
                    <td className="py-3.5 px-4 text-right font-semibold text-[var(--c-ink)] tabular-nums">
                      {row.totalTransactions.toLocaleString("vi-VN")} đơn
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-[var(--c-ink)] tabular-nums">
                      {formatCurrency(row.totalRevenue)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-amber-700 tabular-nums">
                      {formatCurrency(row.totalTaskerEarnings)}
                    </td>
                    <td className="py-3.5 px-5 text-right font-bold text-emerald-700 tabular-nums">
                      {formatCurrency(row.totalPlatformCommission)}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <button
                        type="button"
                        className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-[var(--c-card)] hover:bg-[var(--c-card-2)] border border-[var(--c-line)] text-[var(--c-muted)] hover:text-[var(--c-primary-strong)] transition-colors"
                        title="Xem chi tiết kỳ"
                        onClick={() => setSelectedPeriod(row)}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="sticky bottom-0 bg-[var(--c-card)] border-t-2 border-[var(--c-line)]">
                <tr>
                  <td className="py-3.5 px-5 font-black text-[var(--c-ink)] uppercase">Tổng cộng</td>
                  <td className="py-3.5 px-4 text-right font-black text-[var(--c-ink)] tabular-nums">
                    {totals.txns.toLocaleString("vi-VN")} đơn
                  </td>
                  <td className="py-3.5 px-4 text-right font-black text-[var(--c-ink)] tabular-nums">
                    {formatCurrency(totals.rev)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-black text-amber-700 tabular-nums">
                    {formatCurrency(totals.tasker)}
                  </td>
                  <td className="py-3.5 px-5 text-right font-black text-emerald-700 tabular-nums">
                    {formatCurrency(totals.comm)}
                  </td>
                  <td className="py-3.5 px-5"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Phân trang Bảng tổng hợp theo kỳ */}
        {!isLoading && chartData.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-3 border-t border-[var(--c-line)] bg-[var(--c-card)]">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <span className="text-xs font-medium text-[var(--c-muted)]">
                Hiển thị {Math.min((summaryPage - 1) * summaryLimit + 1, chartData.length)} đến {Math.min(summaryPage * summaryLimit, chartData.length)} trong tổng số {chartData.length} kỳ
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[var(--c-muted)]">Số dòng:</span>
                <Select
                  value={String(summaryLimit)}
                  onValueChange={(val) => {
                    setSummaryLimit(Number(val));
                    setSummaryPage(1);
                  }}
                >
                  <SelectTrigger className="h-7 w-16 text-xs bg-[var(--c-card-2)] border-[var(--c-line)] text-[var(--c-ink)] font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={summaryPage === 1}
                onClick={() => setSummaryPage(1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--c-line)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-[var(--c-card)]"
                title="Trang đầu"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={summaryPage === 1}
                onClick={() => setSummaryPage((p) => Math.max(1, p - 1))}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--c-line)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-[var(--c-card)]"
                title="Trang trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1 px-1">
                {getPageNumbers(summaryPage, summaryTotalPages).map((p, i) =>
                  typeof p === "number" ? (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setSummaryPage(p)}
                      className={cn(
                        "min-w-8 h-8 px-2 flex items-center justify-center rounded-lg text-xs font-bold transition-all duration-200",
                        summaryPage === p
                          ? "bg-[var(--c-primary)] text-white shadow-sm shadow-[var(--c-primary)]/30 font-black"
                          : "border border-[var(--c-line)] bg-[var(--c-card)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)]"
                      )}
                    >
                      {p}
                    </button>
                  ) : (
                    <span
                      key={`dots-${i}`}
                      className="px-1 text-xs text-[var(--c-muted)] font-bold select-none"
                    >
                      ...
                    </span>
                  )
                )}
              </div>

              <button
                type="button"
                disabled={summaryPage >= summaryTotalPages}
                onClick={() => setSummaryPage((p) => Math.min(summaryTotalPages, p + 1))}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--c-line)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-[var(--c-card)]"
                title="Trang tiếp"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={summaryPage >= summaryTotalPages}
                onClick={() => setSummaryPage(summaryTotalPages)}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--c-line)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-[var(--c-card)]"
                title="Trang cuối"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </AdminCard>

      {/* Bảng kê chi tiết từng đơn hàng (Payroll Breakdown Table) */}
      <AdminCard className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-[var(--c-line)]">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[var(--c-primary-strong)]" aria-hidden="true" />
            <h3 className="text-sm font-bold text-[var(--c-ink)]">Bảng kê từng đơn hàng (Payroll)</h3>
            {payrollData && payrollData.total > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)]">
                {payrollData.total} đơn
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--c-muted)]" />
              <Input
                value={payrollSearch}
                onChange={(e) => {
                  setPayrollSearch(e.target.value);
                  setPayrollPage(1);
                }}
                placeholder="Tìm mã đơn, khách, tasker..."
                className="h-8 w-full rounded-full border-[var(--c-line)] bg-[var(--c-card-2)] pl-8 text-xs shadow-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setIsPayrollExpanded(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[var(--c-ink)] bg-[var(--c-card-2)] hover:bg-[var(--c-line)] rounded-xl transition-colors border border-[var(--c-line)] shrink-0"
              title="Phóng to xem chi tiết"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Phóng to</span>
            </button>
          </div>
        </div>

        {isPayrollLoading ? (
          <div className="px-5 py-5 space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-[var(--c-card-2)] animate-pulse" />
            ))}
          </div>
        ) : !payrollData || payrollData.items.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <Receipt className="w-10 h-10 text-[var(--c-muted)]/30 mb-3" />
            <p className="text-sm font-semibold text-[var(--c-ink)]">Chưa có đơn hàng nào</p>
            <p className="text-xs text-[var(--c-muted)] mt-1">Không có đơn hoàn thành nào phù hợp với bộ lọc hiện tại.</p>
          </div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left text-[13.5px]">
              <thead className="sticky top-0 bg-[var(--c-card)] shadow-sm z-10">
                <tr>
                  <th className="py-3 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-5">Mã đơn</th>
                  <th className="py-3 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-3">Hoàn thành</th>
                  <th className="py-3 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-3">Khách hàng</th>
                  <th className="py-3 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-3">Tasker</th>
                  <th className="py-3 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-3">Dịch vụ</th>
                  <th className="py-3 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-3 text-right">Tổng giá (Gross)</th>
                  <th className="py-3 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-3 text-right">Tasker (Net)</th>
                  <th className="py-3 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-5 text-right">Hoa hồng (Fee)</th>
                  <th className="py-3 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--c-line)]">
                {payrollData.items.map((row) => (
                  <tr 
                    key={row.bookingId} 
                    className="hover:bg-[var(--c-card-2)]/60 transition-colors group cursor-pointer"
                    onClick={() => setSelectedBookingId(row.bookingId)}
                  >
                    <td className="py-3 px-5 font-bold text-[var(--c-ink)] tabular-nums group-hover:text-[var(--c-primary-strong)] transition-colors">
                      {row.bookingCode}
                    </td>
                    <td className="py-3 px-3 text-[var(--c-muted)] tabular-nums text-xs">{fmtDateTime(row.completedAt)}</td>
                    <td className="py-3 px-3 text-xs font-semibold text-[var(--c-ink)]">{row.customerName}</td>
                    <td className="py-3 px-3 text-xs font-semibold text-[var(--c-ink)]">{row.taskerName}</td>
                    <td className="py-3 px-3 text-xs text-[var(--c-muted)] font-medium">{row.serviceName}</td>
                    <td className="py-3 px-3 text-right font-bold text-[var(--c-ink)] tabular-nums">
                      {formatCurrency(row.totalPrice)}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-amber-700 tabular-nums">
                      {formatCurrency(row.taskerEarning)}
                    </td>
                    <td className="py-3 px-5 text-right font-bold text-emerald-700 tabular-nums">
                      {formatCurrency(row.platformCommission)}
                    </td>
                    <td className="py-3 px-5 text-right">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[var(--c-primary-strong)] bg-[var(--c-primary-soft)] hover:bg-[var(--c-primary)] hover:text-white transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBookingId(row.bookingId);
                        }}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Phân trang Payroll */}
        {!isPayrollLoading && payrollData && payrollData.total > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-3 border-t border-[var(--c-line)] bg-[var(--c-card)]">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <span className="text-xs font-medium text-[var(--c-muted)]">
                Hiển thị {Math.min((payrollPage - 1) * payrollLimit + 1, payrollData.total)} đến {Math.min(payrollPage * payrollLimit, payrollData.total)} trong tổng số {payrollData.total} đơn
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[var(--c-muted)]">Số dòng:</span>
                <Select
                  value={String(payrollLimit)}
                  onValueChange={(val) => {
                    setPayrollLimit(Number(val));
                    setPayrollPage(1);
                  }}
                >
                  <SelectTrigger className="h-7 w-16 text-xs bg-[var(--c-card-2)] border-[var(--c-line)] text-[var(--c-ink)] font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={payrollPage === 1}
                onClick={() => setPayrollPage(1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--c-line)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-[var(--c-card)]"
                title="Trang đầu"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={payrollPage === 1}
                onClick={() => setPayrollPage((p) => Math.max(1, p - 1))}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--c-line)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-[var(--c-card)]"
                title="Trang trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1 px-1">
                {getPageNumbers(payrollPage, payrollData.totalPages).map((p, i) =>
                  typeof p === "number" ? (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPayrollPage(p)}
                      className={cn(
                        "min-w-8 h-8 px-2 flex items-center justify-center rounded-lg text-xs font-bold transition-all duration-200",
                        payrollPage === p
                          ? "bg-[var(--c-primary)] text-white shadow-sm shadow-[var(--c-primary)]/30 font-black"
                          : "border border-[var(--c-line)] bg-[var(--c-card)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)]"
                      )}
                    >
                      {p}
                    </button>
                  ) : (
                    <span
                      key={`dots-${i}`}
                      className="px-1 text-xs text-[var(--c-muted)] font-bold select-none"
                    >
                      ...
                    </span>
                  )
                )}
              </div>

              <button
                type="button"
                disabled={payrollPage >= payrollData.totalPages}
                onClick={() => setPayrollPage((p) => Math.min(payrollData.totalPages, p + 1))}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--c-line)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-[var(--c-card)]"
                title="Trang tiếp"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={payrollPage >= payrollData.totalPages}
                onClick={() => setPayrollPage(payrollData.totalPages)}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--c-line)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-[var(--c-card)]"
                title="Trang cuối"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </AdminCard>

      {/* Modal Phóng To Bảng Kê (Fullscreen Payroll View) */}
      {isPayrollExpanded && (
        <div className="fixed inset-0 w-screen h-screen bg-[var(--c-card)] z-[1000] flex flex-col overflow-hidden animate-in fade-in duration-200">
          {/* Header & Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 px-8 py-4 border-b border-[var(--c-line)] bg-[var(--c-card-2)]/80 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)]">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[var(--c-ink)]">
                  Bảng kê từng đơn hàng (Payroll) — Toàn màn hình
                </h3>
                <p className="text-xs text-[var(--c-muted)]">
                  Hiển thị danh sách chi tiết các đơn hàng hoàn thành & phân bổ tài chính
                </p>
              </div>
            </div>

            {/* Filter Bar inside Header */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--c-muted)]" />
                <Input
                  value={payrollSearch}
                  onChange={(e) => {
                    setPayrollSearch(e.target.value);
                    setPayrollPage(1);
                  }}
                  placeholder="Tìm mã đơn, khách, tasker..."
                  className="h-9 w-full rounded-xl border-[var(--c-line)] bg-[var(--c-card)] pl-8 text-xs shadow-none font-medium"
                />
              </div>

              <div className="w-[220px]">
                <DateRangePicker
                  startDate={dateRange.startDate?.toISOString() ?? ""}
                  endDate={dateRange.endDate?.toISOString() ?? ""}
                  onRangeChange={(startStr, endStr) => {
                    setDateRange({
                      startDate: startStr ? new Date(startStr) : null,
                      endDate: endStr ? new Date(endStr) : null,
                    });
                    setPayrollPage(1);
                    setSummaryPage(1);
                  }}
                  placeholder="Chọn khoảng thời gian"
                />
              </div>

              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[var(--c-primary-strong)] shrink-0" />
                <Select
                  value={selectedTaskerId}
                  onValueChange={(val) => {
                    setSelectedTaskerId(val);
                    setPayrollPage(1);
                    setSummaryPage(1);
                  }}
                >
                  <SelectTrigger className="w-[160px] h-9 text-xs font-semibold rounded-xl border-[var(--c-line)] bg-[var(--c-card)]">
                    <SelectValue placeholder="Tất cả Tasker" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="ALL">Tất cả Tasker</SelectItem>
                    {taskerData?.data?.map((t: AdminTasker) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.fullName ?? "Tasker chưa đặt tên"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-[var(--c-primary-strong)] shrink-0" />
                <Select
                  value={selectedServiceId}
                  onValueChange={(val) => {
                    setSelectedServiceId(val);
                    setPayrollPage(1);
                    setSummaryPage(1);
                  }}
                >
                  <SelectTrigger className="w-[160px] h-9 text-xs font-semibold rounded-xl border-[var(--c-line)] bg-[var(--c-card)]">
                    <SelectValue placeholder="Tất cả Dịch vụ" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="ALL">Tất cả Dịch vụ</SelectItem>
                    {Array.isArray(serviceData) &&
                      serviceData.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {isFiltered && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 text-xs font-bold transition-colors"
                  title="Xóa bộ lọc"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Xóa lọc</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsPayrollExpanded(false)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[var(--c-primary)] hover:bg-[var(--c-primary-strong)] rounded-xl transition-all shadow-sm shadow-[var(--c-primary)]/30 ml-2"
                title="Thu nhỏ lại"
              >
                <Minimize2 className="w-4 h-4" />
                <span>Thu nhỏ</span>
              </button>
            </div>
          </div>

          {/* Quick Summary Cards Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-8 py-3 bg-[var(--c-card-2)]/40 border-b border-[var(--c-line)]">
            <div className="px-4 py-2.5 rounded-xl bg-blue-50/60 border border-blue-100/60">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 block">
                Tổng Doanh thu (Gross)
              </span>
              <span className="text-base font-black text-blue-700 tabular-nums">
                {formatCurrency(
                  payrollData?.items?.reduce((acc, i) => acc + Number(i.totalPrice), 0) ?? 0
                )}
              </span>
            </div>
            <div className="px-4 py-2.5 rounded-xl bg-amber-50/60 border border-amber-100/60">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 block">
                Tasker (Net)
              </span>
              <span className="text-base font-black text-amber-700 tabular-nums">
                {formatCurrency(
                  payrollData?.items?.reduce((acc, i) => acc + Number(i.taskerEarning), 0) ?? 0
                )}
              </span>
            </div>
            <div className="px-4 py-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100/60">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 block">
                Phí nền tảng (Fee)
              </span>
              <span className="text-base font-black text-emerald-700 tabular-nums">
                {formatCurrency(
                  payrollData?.items?.reduce((acc, i) => acc + Number(i.platformCommission), 0) ?? 0
                )}
              </span>
            </div>
            <div className="px-4 py-2.5 rounded-xl bg-purple-50/60 border border-purple-100/60">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 block">
                Số đơn hiển thị
              </span>
              <span className="text-base font-black text-purple-700 tabular-nums">
                {payrollData?.items?.length ?? 0} / {payrollData?.total ?? 0} đơn
              </span>
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-4">
            <table className="w-full text-left text-[13.5px]">
              <thead className="sticky top-0 bg-[var(--c-card)] shadow-sm z-10">
                <tr>
                  <th className="py-3.5 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-5">
                    Mã đơn
                  </th>
                  <th className="py-3.5 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-3">
                    Hoàn thành
                  </th>
                  <th className="py-3.5 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-3">
                    Khách hàng
                  </th>
                  <th className="py-3.5 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-3">
                    Tasker
                  </th>
                  <th className="py-3.5 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-3">
                    Dịch vụ
                  </th>
                  <th className="py-3.5 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-3 text-right">
                    Tổng giá (Gross)
                  </th>
                  <th className="py-3.5 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-3 text-right">
                    Tasker (Net)
                  </th>
                  <th className="py-3.5 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-5 text-right">
                    Hoa hồng (Fee)
                  </th>
                  <th className="py-3.5 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-5 text-right">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--c-line)]">
                {payrollData?.items.map((row) => (
                  <tr
                    key={row.bookingId}
                    className="hover:bg-[var(--c-card-2)]/60 transition-colors group cursor-pointer"
                    onClick={() => setSelectedBookingId(row.bookingId)}
                  >
                    <td className="py-3.5 px-5 font-bold text-[var(--c-ink)] tabular-nums group-hover:text-[var(--c-primary-strong)] transition-colors">
                      {row.bookingCode}
                    </td>
                    <td className="py-3.5 px-3 text-[var(--c-muted)] tabular-nums text-xs">
                      {fmtDateTime(row.completedAt)}
                    </td>
                    <td className="py-3.5 px-3 text-xs font-semibold text-[var(--c-ink)]">
                      {row.customerName}
                    </td>
                    <td className="py-3.5 px-3 text-xs font-semibold text-[var(--c-ink)]">
                      {row.taskerName}
                    </td>
                    <td className="py-3.5 px-3 text-xs text-[var(--c-muted)] font-medium">
                      {row.serviceName}
                    </td>
                    <td className="py-3.5 px-3 text-right font-bold text-[var(--c-ink)] tabular-nums">
                      {formatCurrency(row.totalPrice)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-semibold text-amber-700 tabular-nums">
                      {formatCurrency(row.taskerEarning)}
                    </td>
                    <td className="py-3.5 px-5 text-right font-bold text-emerald-700 tabular-nums">
                      {formatCurrency(row.platformCommission)}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[var(--c-primary-strong)] bg-[var(--c-primary-soft)] hover:bg-[var(--c-primary)] hover:text-white transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBookingId(row.bookingId);
                        }}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Full Pagination Footer */}
          {!isPayrollLoading && payrollData && payrollData.total > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-8 py-3.5 border-t border-[var(--c-line)] bg-[var(--c-card-2)]/80">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <span className="text-xs font-medium text-[var(--c-muted)]">
                  Hiển thị {Math.min((payrollPage - 1) * payrollLimit + 1, payrollData.total)} đến {Math.min(payrollPage * payrollLimit, payrollData.total)} trong tổng số {payrollData.total} đơn
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[var(--c-muted)]">Số dòng:</span>
                  <Select
                    value={String(payrollLimit)}
                    onValueChange={(val) => {
                      setPayrollLimit(Number(val));
                      setPayrollPage(1);
                    }}
                  >
                    <SelectTrigger className="h-7 w-16 text-xs bg-[var(--c-card)] border-[var(--c-line)] text-[var(--c-ink)] font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={payrollPage === 1}
                  onClick={() => setPayrollPage(1)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--c-line)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-[var(--c-card)]"
                  title="Trang đầu"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={payrollPage === 1}
                  onClick={() => setPayrollPage((p) => Math.max(1, p - 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--c-line)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-[var(--c-card)]"
                  title="Trang trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1 px-1">
                  {getPageNumbers(payrollPage, payrollData.totalPages).map((p, i) =>
                    typeof p === "number" ? (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPayrollPage(p)}
                        className={cn(
                          "min-w-8 h-8 px-2 flex items-center justify-center rounded-lg text-xs font-bold transition-all duration-200",
                          payrollPage === p
                            ? "bg-[var(--c-primary)] text-white shadow-sm shadow-[var(--c-primary)]/30 font-black"
                            : "border border-[var(--c-line)] bg-[var(--c-card)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)]"
                        )}
                      >
                        {p}
                      </button>
                    ) : (
                      <span
                        key={`dots-${i}`}
                        className="px-1 text-xs text-[var(--c-muted)] font-bold select-none"
                      >
                        ...
                      </span>
                    )
                  )}
                </div>

                <button
                  type="button"
                  disabled={payrollPage >= payrollData.totalPages}
                  onClick={() => setPayrollPage((p) => Math.min(payrollData.totalPages, p + 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--c-line)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-[var(--c-card)]"
                  title="Trang tiếp"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={payrollPage >= payrollData.totalPages}
                  onClick={() => setPayrollPage(payrollData.totalPages)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--c-line)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-[var(--c-card)]"
                  title="Trang cuối"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Phóng To Bảng Tổng Hợp theo Kỳ (Fullscreen Summary View) */}
      {isSummaryExpanded && (
        <div className="fixed inset-0 w-screen h-screen bg-[var(--c-card)] z-[1000] flex flex-col overflow-hidden animate-in fade-in duration-200">
          {/* Header & Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 px-8 py-4 border-b border-[var(--c-line)] bg-[var(--c-card-2)]/80 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)]">
                <CalendarDays className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[var(--c-ink)]">
                  Bảng tổng hợp theo {granularity === "day" ? "ngày" : granularity === "week" ? "tuần" : "tháng"} — Toàn màn hình
                </h3>
                <p className="text-xs text-[var(--c-muted)]">
                  Tổng hợp {chartData.length} kỳ thống kê tài chính hệ thống
                </p>
              </div>
            </div>

            {/* Filter Bar inside Header */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Selector Mức độ */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--c-muted)]">Mức độ:</span>
                <Select
                  value={granularity}
                  onValueChange={(val: "day" | "week" | "month") => {
                    setGranularity(val);
                    setSummaryPage(1);
                  }}
                >
                  <SelectTrigger className="w-[130px] h-9 text-xs font-bold rounded-xl border-[var(--c-line)] bg-[var(--c-card)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Theo ngày</SelectItem>
                    <SelectItem value="week">Theo tuần</SelectItem>
                    <SelectItem value="month">Theo tháng</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Lọc Ngày */}
              <div className="w-[220px]">
                <DateRangePicker
                  startDate={dateRange.startDate?.toISOString() ?? ""}
                  endDate={dateRange.endDate?.toISOString() ?? ""}
                  onRangeChange={(startStr, endStr) => {
                    setDateRange({
                      startDate: startStr ? new Date(startStr) : null,
                      endDate: endStr ? new Date(endStr) : null,
                    });
                    setPayrollPage(1);
                    setSummaryPage(1);
                  }}
                  placeholder="Chọn khoảng thời gian"
                />
              </div>

              {/* Lọc Tasker */}
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[var(--c-primary-strong)] shrink-0" />
                <Select
                  value={selectedTaskerId}
                  onValueChange={(val) => {
                    setSelectedTaskerId(val);
                    setPayrollPage(1);
                    setSummaryPage(1);
                  }}
                >
                  <SelectTrigger className="w-[160px] h-9 text-xs font-semibold rounded-xl border-[var(--c-line)] bg-[var(--c-card)]">
                    <SelectValue placeholder="Tất cả Tasker" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="ALL">Tất cả Tasker</SelectItem>
                    {taskerData?.data?.map((t: AdminTasker) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.fullName ?? "Tasker chưa đặt tên"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Lọc Dịch vụ */}
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-[var(--c-primary-strong)] shrink-0" />
                <Select
                  value={selectedServiceId}
                  onValueChange={(val) => {
                    setSelectedServiceId(val);
                    setPayrollPage(1);
                    setSummaryPage(1);
                  }}
                >
                  <SelectTrigger className="w-[160px] h-9 text-xs font-semibold rounded-xl border-[var(--c-line)] bg-[var(--c-card)]">
                    <SelectValue placeholder="Tất cả Dịch vụ" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="ALL">Tất cả Dịch vụ</SelectItem>
                    {Array.isArray(serviceData) &&
                      serviceData.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {isFiltered && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 text-xs font-bold transition-colors"
                  title="Xóa bộ lọc"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Xóa lọc</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsSummaryExpanded(false)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[var(--c-primary)] hover:bg-[var(--c-primary-strong)] rounded-xl transition-all shadow-sm shadow-[var(--c-primary)]/30 ml-2"
                title="Thu nhỏ lại"
              >
                <Minimize2 className="w-4 h-4" />
                <span>Thu nhỏ</span>
              </button>
            </div>
          </div>

          {/* Quick Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-8 py-3 bg-[var(--c-card-2)]/40 border-b border-[var(--c-line)]">
            <div className="px-4 py-2.5 rounded-xl bg-blue-50/60 border border-blue-100/60">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 block">
                Tổng Doanh thu (Gross)
              </span>
              <span className="text-base font-black text-blue-700 tabular-nums">
                {formatCurrency(totals.rev)}
              </span>
            </div>
            <div className="px-4 py-2.5 rounded-xl bg-amber-50/60 border border-amber-100/60">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 block">
                Tasker (Net)
              </span>
              <span className="text-base font-black text-amber-700 tabular-nums">
                {formatCurrency(totals.tasker)}
              </span>
            </div>
            <div className="px-4 py-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100/60">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 block">
                Hoa hồng (Fee)
              </span>
              <span className="text-base font-black text-emerald-700 tabular-nums">
                {formatCurrency(totals.comm)}
              </span>
            </div>
            <div className="px-4 py-2.5 rounded-xl bg-purple-50/60 border border-purple-100/60">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 block">
                Tổng Đơn hoàn thành
              </span>
              <span className="text-base font-black text-purple-700 tabular-nums">
                {totals.txns.toLocaleString("vi-VN")} đơn
              </span>
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-4">
            <table className="w-full text-left text-[14px]">
              <thead className="sticky top-0 bg-[var(--c-card)] shadow-sm z-10">
                <tr>
                  <th className="py-3.5 px-6 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[12px]">Kỳ</th>
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[12px] text-right">Đơn hoàn thành</th>
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[12px] text-right">Tổng doanh thu</th>
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[12px] text-right">Thu nhập Tasker</th>
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[12px] text-right">Hoa hồng nền tảng</th>
                  <th className="py-3.5 px-6 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[12px] text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--c-line)]">
                {pagedChartData.map((row: RevenueSummaryResponse & { label: string }, idx: number) => (
                  <tr key={idx} className="hover:bg-[var(--c-card-2)]/60 transition-colors">
                    <td className="py-4 px-6 font-bold text-[var(--c-ink)] text-base">{row.label}</td>
                    <td className="py-4 px-4 text-right font-semibold text-[var(--c-ink)] tabular-nums">
                      {row.totalTransactions.toLocaleString("vi-VN")} đơn
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-[var(--c-ink)] tabular-nums">
                      {formatCurrency(row.totalRevenue)}
                    </td>
                    <td className="py-4 px-4 text-right font-semibold text-amber-700 tabular-nums">
                      {formatCurrency(row.totalTaskerEarnings)}
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-emerald-700 tabular-nums">
                      {formatCurrency(row.totalPlatformCommission)}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--c-card)] hover:bg-[var(--c-card-2)] border border-[var(--c-line)] text-[var(--c-ink)] hover:text-[var(--c-primary-strong)] font-bold text-xs transition-colors"
                        title="Xem chi tiết đơn trong kỳ"
                        onClick={() => setSelectedPeriod(row)}
                      >
                        <Eye className="w-4 h-4 text-[var(--c-primary-strong)]" />
                        <span>Xem chi tiết kỳ</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="sticky bottom-0 bg-[var(--c-card)] border-t-2 border-[var(--c-line)]">
                <tr>
                  <td className="py-4 px-6 font-black text-[var(--c-ink)] uppercase text-base">Tổng cộng</td>
                  <td className="py-4 px-4 text-right font-black text-[var(--c-ink)] tabular-nums text-base">
                    {totals.txns.toLocaleString("vi-VN")} đơn
                  </td>
                  <td className="py-4 px-4 text-right font-black text-[var(--c-ink)] tabular-nums text-base">
                    {formatCurrency(totals.rev)}
                  </td>
                  <td className="py-4 px-4 text-right font-black text-amber-700 tabular-nums text-base">
                    {formatCurrency(totals.tasker)}
                  </td>
                  <td className="py-4 px-6 text-right font-black text-emerald-700 tabular-nums text-base">
                    {formatCurrency(totals.comm)}
                  </td>
                  <td className="py-4 px-6"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Full Pagination Footer for Summary */}
          {!isLoading && chartData.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-8 py-3.5 border-t border-[var(--c-line)] bg-[var(--c-card-2)]/80">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <span className="text-xs font-medium text-[var(--c-muted)]">
                  Hiển thị {Math.min((summaryPage - 1) * summaryLimit + 1, chartData.length)} đến {Math.min(summaryPage * summaryLimit, chartData.length)} trong tổng số {chartData.length} kỳ
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[var(--c-muted)]">Số dòng:</span>
                  <Select
                    value={String(summaryLimit)}
                    onValueChange={(val) => {
                      setSummaryLimit(Number(val));
                      setSummaryPage(1);
                    }}
                  >
                    <SelectTrigger className="h-7 w-16 text-xs bg-[var(--c-card)] border-[var(--c-line)] text-[var(--c-ink)] font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={summaryPage === 1}
                  onClick={() => setSummaryPage(1)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--c-line)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-[var(--c-card)]"
                  title="Trang đầu"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={summaryPage === 1}
                  onClick={() => setSummaryPage((p) => Math.max(1, p - 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--c-line)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-[var(--c-card)]"
                  title="Trang trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1 px-1">
                  {getPageNumbers(summaryPage, summaryTotalPages).map((p, i) =>
                    typeof p === "number" ? (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setSummaryPage(p)}
                        className={cn(
                          "min-w-8 h-8 px-2 flex items-center justify-center rounded-lg text-xs font-bold transition-all duration-200",
                          summaryPage === p
                            ? "bg-[var(--c-primary)] text-white shadow-sm shadow-[var(--c-primary)]/30 font-black"
                            : "border border-[var(--c-line)] bg-[var(--c-card)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)]"
                        )}
                      >
                        {p}
                      </button>
                    ) : (
                      <span
                        key={`dots-${i}`}
                        className="px-1 text-xs text-[var(--c-muted)] font-bold select-none"
                      >
                        ...
                      </span>
                    )
                  )}
                </div>

                <button
                  type="button"
                  disabled={summaryPage >= summaryTotalPages}
                  onClick={() => setSummaryPage((p) => Math.min(summaryTotalPages, p + 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--c-line)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-[var(--c-card)]"
                  title="Trang tiếp"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={summaryPage >= summaryTotalPages}
                  onClick={() => setSummaryPage(summaryTotalPages)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--c-line)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-[var(--c-card)]"
                  title="Trang cuối"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Drawer Xem theo Kỳ */}
      <RevenuePeriodDetailDrawer
        data={selectedPeriod}
        granularity={granularity}
        open={!!selectedPeriod}
        onClose={() => setSelectedPeriod(null)}
      />

      {/* Modal Chi tiết Booking */}
      <AdminBookingDetailModal
        open={!!selectedBookingId}
        onOpenChange={(open) => {
          if (!open) setSelectedBookingId(null);
        }}
        booking={selectedBookingDetail ?? null}
      />
    </div>
  );
}
