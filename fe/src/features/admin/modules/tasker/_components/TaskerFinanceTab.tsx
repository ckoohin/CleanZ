"use client";

import React, { useState, useMemo } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { 
  Wallet, 
  Percent, 
  Receipt, 
  FileText, 
  BarChart3, 
  History, 
  CircleDollarSign,
  CalendarRange,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Activity,
  TrendingUp,
  Calculator,
  Search,
  Filter,
  X,
} from "lucide-react";
import { AdminCard } from "@/components/admin";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  useAdminTaskerEarnings,
  useAdminTaskerEarningsDetails,
  useAdminTaskerWalletTransactions,
  useAdminTaskerWalletSummary,
  useAdminTaskerWalletCashflowChart,
} from "../hooks/admin-tasker.hooks";
import type { TaskerWalletTransaction } from "../types/admin-tasker.types";
import { rangeOf, fmtDate } from "../../../lib/date-ranges";
import {
  ComposedChart,
  AreaChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Input } from "@/components/ui/input";
import { AdminBookingDetailModal } from "@/features/admin/modules/booking/_components/AdminBookingDetailModal";
import { TaskerWalletTxDetailDrawer } from "./TaskerWalletTxDetailDrawer";
import { useAdminBookingDetail } from "@/features/admin/modules/booking/hooks/useAdminBooking";
import { TransactionDetailDrawer } from "@/features/admin/modules/customer/_components/TransactionDetailDrawer";
import { ChevronLeft, ChevronRight } from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────────────────

const PERIOD_OPTIONS: { key: "all" | "today" | "last7" | "thisMonth" | "lastMonth"; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "today", label: "Hôm nay" },
  { key: "last7", label: "7 ngày qua" },
  { key: "thisMonth", label: "Tháng này" },
  { key: "lastMonth", label: "Tháng trước" },
];

function fmtMoney(value: number): string {
  return `${value.toLocaleString("vi-VN")} đ`;
}

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

// ─── Shared Components ──────────────────────────────────────────────────────

const EarningStat: React.FC<{
  icon: React.ElementType;
  value: string;
  label: string;
  sublabel?: string;
  tone: "emerald" | "amber" | "blue" | "purple";
}> = ({ icon: Icon, value, label, sublabel, tone }) => {
  const tones = {
    emerald: "bg-[rgba(14,159,110,0.12)] text-[#0E9F6E]",
    amber: "bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)]",
    blue: "bg-[rgba(37,99,235,0.12)] text-[#2563EB]",
    purple: "bg-[rgba(147,51,234,0.12)] text-[#9333EA]",
  };
  return (
    <AdminCard className="p-5 flex items-center gap-4 hover:border-[var(--c-primary-strong)]/30 transition-colors group cursor-default">
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110", tones[tone])}>
        <Icon className="w-5 h-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-black leading-none text-[var(--c-ink)] tabular-nums">{value}</p>
        <p className="text-[13px] font-semibold text-[var(--c-ink)] mt-1.5 leading-tight">{label}</p>
        {sublabel && (
          <p className="text-[11px] text-[var(--c-muted)] mt-0.5 leading-tight">{sublabel}</p>
        )}
      </div>
    </AdminCard>
  );
};

// ─── Sub-tab Views ──────────────────────────────────────────────────────────

const EarningsOverviewView: React.FC<{ taskerId: string }> = ({ taskerId }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(20);
  // ── Bộ lọc kỳ — persist theo taskerId ──────────────────────────────────────
  const STORAGE_KEY_PERIOD = `admin:tasker:${taskerId}:earnings:period`;
  const STORAGE_KEY_RANGE  = `admin:tasker:${taskerId}:earnings:range`;

  const [period, setPeriod] = useLocalStorage<
    (typeof PERIOD_OPTIONS)[number]["key"] | "custom"
  >(STORAGE_KEY_PERIOD, "all");

  /**
   * customRange lưu dạng string (YYYY-MM-DD) vì Date không JSON-serialize.
   * Khi cần tính range sẽ parse lại bằng fmtDate-compatible logic.
   */
  const [customRangeStr, setCustomRangeStr] = useLocalStorage<{
    startDate: string | null;
    endDate: string | null;
  }>(STORAGE_KEY_RANGE, { startDate: null, endDate: null });

  // Helper: convert lại string → Date để truyền vào DateRangePicker
  const customRange = {
    startDate: customRangeStr.startDate
      ? (() => { const [y, m, d] = customRangeStr.startDate!.split("-").map(Number); return new Date(y, m - 1, d); })()
      : null,
    endDate: customRangeStr.endDate
      ? (() => { const [y, m, d] = customRangeStr.endDate!.split("-").map(Number); return new Date(y, m - 1, d); })()
      : null,
  };

  const setCustomRange = (updater: (prev: { startDate: Date | null; endDate: Date | null }) => { startDate: Date | null; endDate: Date | null }) => {
    const next = updater(customRange);
    setCustomRangeStr({
      startDate: next.startDate ? fmtDate(next.startDate) : null,
      endDate: next.endDate ? fmtDate(next.endDate) : null,
    });
  };

  const [selectedBookingId, setSelectedBookingId] = React.useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const { booking: bookingDetail, isLoading: isBookingLoading } = useAdminBookingDetail(selectedBookingId);

  const [selectedTxnId, setSelectedTxnId] = React.useState<string | null>(null);

  const range = React.useMemo(() => {
    if (period === "all") {
      return { fromDate: "", toDate: "" };
    }
    if (period === "custom") {
      return {
        fromDate: customRange.startDate ? fmtDate(customRange.startDate) : "",
        toDate: customRange.endDate ? fmtDate(customRange.endDate) : "",
      };
    }
    if (period === "today") {
      const now = new Date();
      return { fromDate: fmtDate(now), toDate: fmtDate(now) };
    }
    if (period === "last7") {
      const now = new Date();
      const from = new Date(now);
      from.setDate(now.getDate() - 6);
      return { fromDate: fmtDate(from), toDate: fmtDate(now) };
    }
    if (period === "thisMonth") {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      return { fromDate: fmtDate(firstDay), toDate: fmtDate(now) };
    }
    if (period === "lastMonth") {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      return { fromDate: fmtDate(firstDay), toDate: fmtDate(lastDay) };
    }
    return { fromDate: "", toDate: "" };
  }, [period, customRange]);
  
  const { data, isLoading } = useAdminTaskerEarnings(taskerId, range);
  const { data: detailsData, isLoading: detailsLoading } = useAdminTaskerEarningsDetails(taskerId, range);

  const grossValue = (data?.taskerEarnings ?? 0) + (data?.platformCommission ?? 0);
  const netValue = data?.taskerEarnings ?? 0;
  const commission = data?.platformCommission ?? 0;
  const completed = data?.completedBookings ?? 0;

  // Mock chart data for visual feedback (since API doesn't return time-series yet)
  const chartData = useMemo(() => {
    if (!detailsData || detailsData.length === 0) return [];
    
    // Group by date
    const grouped = detailsData.reduce((acc, curr) => {
      const dateStr = curr.completedAt ? curr.completedAt.split("T")[0] : "N/A";
      if (!acc[dateStr]) {
        acc[dateStr] = { date: dateStr, gross: 0, net: 0, fee: 0 };
      }
      acc[dateStr].net += curr.taskerEarning;
      acc[dateStr].fee += curr.platformCommission;
      acc[dateStr].gross += (curr.taskerEarning + curr.platformCommission);
      return acc;
    }, {} as Record<string, { date: string; gross: number; net: number; fee: number }>);
    
    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
  }, [detailsData]);

  const extendedKpis = useMemo(() => {
    const completedCount = data?.completedBookings || 0;
    const gross = grossValue;
    const net = netValue;
    const fee = commission;

    const aov = Math.round(gross / Math.max(1, completedCount));
    const feeRate = gross > 0 ? ((fee / gross) * 100).toFixed(1) : "0";

    const activeDays = chartData.length || 1;
    const avgDailyNet = Math.round(net / Math.max(1, activeDays));
    const payoutRate = "0.0";

    return { aov, feeRate, avgDailyNet, payoutRate, activeDays };
  }, [data, grossValue, netValue, commission, chartData]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between flex-wrap gap-3 bg-[var(--c-card)] p-3 rounded-2xl border border-[var(--c-line)] shadow-sm">
        <h3 className="text-sm font-bold flex items-center gap-2 text-[var(--c-ink)] pl-2">
          <CalendarRange className="w-4 h-4 text-[var(--c-primary-strong)]" aria-hidden="true" />
          Kỳ đối soát
        </h3>
        <div className="inline-flex items-center gap-1 rounded-xl bg-[var(--c-card-2)] p-1">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setPeriod(opt.key)}
              className={cn(
                "rounded-lg px-4 py-1.5 text-[13px] font-bold transition-all duration-200",
                period === opt.key
                  ? "bg-[var(--c-primary)] text-white shadow-md"
                  : "text-[var(--c-muted)] hover:bg-[var(--c-card)] hover:text-[var(--c-ink)]"
              )}
            >
              {opt.label}
            </button>
          ))}
          
          <div className="flex items-center ml-1">
            <DateRangePicker
              startDate={period === "custom" && customRangeStr.startDate ? customRangeStr.startDate : ""}
              endDate={period === "custom" && customRangeStr.endDate ? customRangeStr.endDate : ""}
              onRangeChange={(startStr, endStr) => {
                if (!startStr && !endStr) {
                  setCustomRangeStr({ startDate: null, endDate: null });
                  setPeriod("all");
                } else {
                  setCustomRangeStr({
                    startDate: startStr || null,
                    endDate: endStr || null,
                  });
                  setPeriod("custom");
                }
              }}
              placeholder="Tùy chọn ngày..."
              allowPastDates
              className={cn(
                "h-[32px] px-3 border-0 transition-all duration-200",
                period === "custom"
                  ? "bg-[var(--c-primary)] text-white shadow-md ring-0 font-bold"
                  : "bg-transparent text-[var(--c-muted)] hover:bg-[var(--c-card)] hover:text-[var(--c-ink)]"
              )}
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-[96px] rounded-2xl bg-[var(--c-card-2)] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <EarningStat
            icon={Receipt}
            tone="blue"
            value={String(completed)}
            label="Đơn hoàn thành"
            sublabel="Trong kỳ đối soát"
          />
          <EarningStat
            icon={CircleDollarSign}
            tone="purple"
            value={fmtMoney(grossValue)}
            label="Tổng doanh thu"
            sublabel="Tasker nhận + Phí nền tảng"
          />
          <EarningStat
            icon={Wallet}
            tone="emerald"
            value={fmtMoney(netValue)}
            label="Tasker thực nhận"
            sublabel="Sau khi trừ phí nền tảng"
          />
          <EarningStat
            icon={Percent}
            tone="amber"
            value={fmtMoney(commission)}
            label="Phí nền tảng"
            sublabel="Hoa hồng nền tảng giữ lại"
          />
        </div>
      )}

      {/* Khối Phân Tích Chỉ Số Tài Chính Nâng Cao (Extended Financial Analytics Bar) */}
      {!isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-[var(--c-card)] border border-[var(--c-line)] shadow-sm">
            <div className="p-2.5 rounded-xl bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)]">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--c-muted)]">Giá trị đơn TB (AOV)</p>
              <p className="text-base font-black text-[var(--c-ink)] tabular-nums mt-0.5">{fmtMoney(extendedKpis.aov)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-[var(--c-card)] border border-[var(--c-line)] shadow-sm">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--c-muted)]">Thu nhập TB / ngày</p>
              <p className="text-base font-black text-emerald-600 tabular-nums mt-0.5">{fmtMoney(extendedKpis.avgDailyNet)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-[var(--c-card)] border border-[var(--c-line)] shadow-sm">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--c-muted)]">Tỷ lệ Phí thực tế</p>
              <p className="text-base font-black text-amber-600 tabular-nums mt-0.5">{extendedKpis.feeRate}% Gross</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-[var(--c-card)] border border-[var(--c-line)] shadow-sm">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--c-muted)]">Tỷ lệ Rút tiền ví</p>
              <p className="text-base font-black text-indigo-600 tabular-nums mt-0.5">{extendedKpis.payoutRate}% Net</p>
            </div>
          </div>
        </div>
      )}

      {/* Chart Section */}
      {!isLoading && chartData.length > 0 && (
        <AdminCard className="p-5">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-[var(--c-ink)] flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[var(--c-primary-strong)]" />
              Biểu đồ doanh thu & chiết khấu
            </h3>
            <p className="text-xs text-[var(--c-muted)] mt-1">
              Phân bổ dòng tiền theo ngày trong kỳ (Gross = Net + Fee)
            </p>
          </div>
          <div className="h-[290px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--c-line)" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: "var(--c-muted)" }} 
                  dy={10}
                  tickFormatter={(val) => {
                    const d = new Date(val);
                    return `${d.getDate()}/${d.getMonth()+1}`;
                  }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: "var(--c-muted)" }} 
                  width={60}
                  tickFormatter={(val) => val >= 1000000 ? `${val/1000000}M` : `${val/1000}k`}
                />
                <RechartsTooltip 
                  cursor={{ stroke: 'var(--c-line)', strokeWidth: 1, strokeDasharray: '4 4' }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    const gross = Number(payload.find((p) => p.dataKey === "gross")?.value ?? 0);
                    const net = Number(payload.find((p) => p.dataKey === "net")?.value ?? 0);
                    const fee = Number(payload.find((p) => p.dataKey === "fee")?.value ?? 0);
                    
                    let dateStr = String(label ?? "");
                    if (label) {
                      try {
                        const d = new Date(String(label));
                        if (!isNaN(d.getTime())) {
                          dateStr = d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
                        }
                      } catch {}
                    }

                    return (
                      <div className="bg-[var(--c-card)] border border-[var(--c-line)] p-3 rounded-2xl shadow-xl text-xs space-y-2 min-w-[210px]">
                        <p className="font-bold text-[var(--c-ink)] border-b border-[var(--c-line)] pb-1 flex items-center justify-between">
                          <span>{dateStr}</span>
                          <span className="text-[10px] text-[var(--c-muted)] font-normal">Thống kê ngày</span>
                        </p>
                        <div className="space-y-1.5 pt-0.5">
                          <div className="flex items-center justify-between font-bold text-[#9333EA]">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#9333EA]" />
                              Tổng doanh thu (Gross):
                            </span>
                            <span>{fmtMoney(gross)}</span>
                          </div>
                          <div className="flex items-center justify-between font-bold text-[#0E9F6E]">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#0E9F6E]" />
                              Thực nhận (Net):
                            </span>
                            <span>{fmtMoney(net)}</span>
                          </div>
                          <div className="flex items-center justify-between font-bold text-[#F59E0B]">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                              Phí nền tảng (Fee):
                            </span>
                            <span>{fmtMoney(fee)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend
                  content={() => (
                    <div className="flex items-center justify-center gap-5 pt-3 text-xs font-bold flex-wrap">
                      <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-[#9333EA]/10 border border-[#9333EA]/20 text-[#9333EA]">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#9333EA] inline-block shadow-sm" />
                        <span>Tổng doanh thu (Gross)</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-[#0E9F6E]/10 border border-[#0E9F6E]/20 text-[#0E9F6E]">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#0E9F6E] inline-block shadow-sm" />
                        <span>Thực nhận (Net)</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#F59E0B]">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] inline-block shadow-sm" />
                        <span>Phí nền tảng (Fee)</span>
                      </div>
                    </div>
                  )}
                />
                <Line
                  type="monotone"
                  dataKey="gross"
                  name="gross"
                  stroke="#9333EA"
                  strokeWidth={3}
                  dot={{ r: 3.5, fill: "#9333EA", strokeWidth: 1.5, stroke: "#ffffff" }}
                  activeDot={{ r: 6.5, strokeWidth: 2.5 }}
                />
                <Line
                  type="monotone"
                  dataKey="net"
                  name="net"
                  stroke="#0E9F6E"
                  strokeWidth={3}
                  dot={{ r: 3.5, fill: "#0E9F6E", strokeWidth: 1.5, stroke: "#ffffff" }}
                  activeDot={{ r: 6.5, strokeWidth: 2.5 }}
                />
                <Line
                  type="monotone"
                  dataKey="fee"
                  name="fee"
                  stroke="#F59E0B"
                  strokeWidth={3}
                  dot={{ r: 3.5, fill: "#F59E0B", strokeWidth: 1.5, stroke: "#ffffff" }}
                  activeDot={{ r: 6.5, strokeWidth: 2.5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </AdminCard>
      )}

      {/* Payroll Table */}
      <AdminCard className="overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[var(--c-line)]">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[var(--c-primary-strong)]" aria-hidden="true" />
            <h3 className="text-sm font-bold text-[var(--c-ink)]">Bảng kê từng đơn (Payroll)</h3>
            {detailsData && detailsData.length > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)]">
                {detailsData.length} đơn
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-[var(--c-ink)] bg-[var(--c-card-2)] hover:bg-[var(--c-line)] rounded-lg transition-colors border border-[var(--c-line)]"
            title="Phóng to xem chi tiết"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Phóng to</span>
          </button>
        </div>

        {detailsLoading ? (
          <div className="px-5 py-5 space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-[var(--c-card-2)] animate-pulse" />
            ))}
          </div>
        ) : !detailsData || detailsData.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <Receipt className="w-10 h-10 text-[var(--c-muted)]/30 mb-3" />
            <p className="text-sm font-semibold text-[var(--c-ink)]">Chưa có giao dịch</p>
            <p className="text-xs text-[var(--c-muted)] mt-1">Không có đơn nào tính lương trong kỳ này.</p>
          </div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left text-[13.5px]">
              <thead className="sticky top-0 bg-[var(--c-card)] shadow-sm z-10">
                <tr>
                  <th className="py-3 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-5">Mã đơn</th>
                  <th className="py-3 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-3">Hoàn thành</th>
                  <th className="py-3 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-3 text-right text-[#9333EA]">Tổng giá (Gross)</th>
                  <th className="py-3 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-3 text-right text-[#0E9F6E]">Thực thu (Net)</th>
                  <th className="py-3 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-5 text-right text-[var(--c-primary-strong)]">Phí Nền tảng</th>
                  <th className="py-3 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--c-line)]">
                {(() => {
                  const itemsPerPage = limit;
                  const maxPage = Math.max(1, Math.ceil((detailsData?.length || 0) / itemsPerPage));
                  const safePage = Math.min(currentPage, maxPage);
                  const startIndex = (safePage - 1) * itemsPerPage;
                  const paginatedData = detailsData.slice(startIndex, startIndex + itemsPerPage);

                  return paginatedData.map((row) => {
                    const gross = row.taskerEarning + row.platformCommission;
                    return (
                      <tr 
                        key={row.bookingId} 
                        className="hover:bg-[var(--c-card-2)] transition-colors group cursor-pointer"
                        onClick={() => setSelectedBookingId(row.bookingId)}
                      >
                        <td className="py-3 px-5 font-bold text-[var(--c-ink)] tabular-nums group-hover:text-[var(--c-primary)] transition-colors flex items-center gap-2">
                          {row.bookingCode}
                          <Receipt className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </td>
                        <td className="py-3 px-3 text-[var(--c-muted)] tabular-nums">{fmtDateTime(row.completedAt)}</td>
                        <td className="py-3 px-3 text-right font-bold text-[var(--c-ink)] tabular-nums">
                          {fmtMoney(gross)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-[#0E9F6E] tabular-nums bg-[#0E9F6E]/5">
                          {fmtMoney(row.taskerEarning)}
                        </td>
                        <td className="py-3 px-5 text-right font-bold text-[var(--c-primary-strong)] tabular-nums bg-[var(--c-primary)]/5">
                          {fmtMoney(row.platformCommission)}
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
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        )}
        {!detailsLoading && detailsData && detailsData.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-3 border-t border-[var(--c-line)] bg-[var(--c-card)]">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <span className="text-xs font-medium text-[var(--c-muted)]">
                Hiển thị {detailsData.length === 0 ? 0 : Math.min((currentPage - 1) * limit + 1, detailsData.length)} đến {Math.min(currentPage * limit, detailsData.length)} trong tổng số {detailsData.length}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[var(--c-muted)]">Số dòng:</span>
                <Select
                  value={String(limit)}
                  onValueChange={(val) => {
                    setLimit(Number(val));
                    setCurrentPage(1);
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
            {(() => {
              const totalPages = Math.max(
                1,
                Math.ceil((detailsData?.length || 0) / limit)
              );
              const getPageNumbers = () => {
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
              };

              return (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(1)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--c-line)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-[var(--c-card)]"
                    title="Trang đầu"
                  >
                    <span className="text-[10px] font-bold">{"<<"}</span>
                  </button>
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--c-line)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-[var(--c-card)]"
                    title="Trang trước"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1 px-1">
                    {getPageNumbers().map((p, i) =>
                      typeof p === "number" ? (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setCurrentPage(p)}
                          className={cn(
                            "min-w-8 h-8 px-2 flex items-center justify-center rounded-lg text-xs font-bold transition-all duration-200",
                            currentPage === p
                              ? "bg-[var(--c-primary)] text-white shadow-sm"
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
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--c-line)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-[var(--c-card)]"
                    title="Trang tiếp"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--c-line)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-[var(--c-card)]"
                    title="Trang cuối"
                  >
                    <span className="text-[10px] font-bold">{">>"}</span>
                  </button>
                </div>
              );
            })()}
          </div>
        )}
      </AdminCard>

      {/* Modal Phóng To Bảng Kê (Payroll Fullscreen View) */}
      {isExpanded && (
        <div className="fixed inset-0 w-screen h-screen bg-[var(--c-card)] z-[9999] flex flex-col overflow-hidden animate-in fade-in duration-200">
          {/* Modal Header */}
          <div className="flex items-center justify-between px-8 py-5 border-b border-[var(--c-line)] bg-[var(--c-card-2)]/60">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)]">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--c-ink)]">Bảng kê từng đơn (Payroll) — Xem chi tiết</h3>
                  <p className="text-xs text-[var(--c-muted)] mt-0.5">Tổng cộng {detailsData?.length || 0} đơn hàng trong kỳ đối soát</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[var(--c-ink)] bg-[var(--c-card)] hover:bg-[var(--c-card-2)] rounded-xl transition-colors border border-[var(--c-line)] shadow-sm"
                title="Thu nhỏ lại"
              >
                <Minimize2 className="w-4 h-4" />
                <span>Thu nhỏ</span>
              </button>
            </div>

            {/* Modal Table Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              <table className="w-full text-left text-[13.5px]">
                <thead className="sticky top-0 bg-[var(--c-card)] shadow-sm z-10">
                  <tr>
                    <th className="py-3 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-5">Mã đơn</th>
                    <th className="py-3 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-3">Hoàn thành</th>
                    <th className="py-3 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-3 text-right text-[#9333EA]">Tổng giá (Gross)</th>
                    <th className="py-3 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-3 text-right text-[#0E9F6E]">Thực thu (Net)</th>
                    <th className="py-3 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-5 text-right text-[var(--c-primary-strong)]">Phí Nền tảng</th>
                    <th className="py-3 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--c-line)]">
                  {(() => {
                    const list = detailsData || [];
                    const itemsPerPage = limit;
                    const maxPage = Math.max(1, Math.ceil(list.length / itemsPerPage));
                    const safePage = Math.min(currentPage, maxPage);
                    const startIndex = (safePage - 1) * itemsPerPage;
                    const paginatedData = list.slice(startIndex, startIndex + itemsPerPage);

                    return paginatedData.map((row) => {
                      const gross = row.taskerEarning + row.platformCommission;
                      return (
                        <tr 
                          key={row.bookingId} 
                          className="hover:bg-[var(--c-card-2)] transition-colors group cursor-pointer"
                          onClick={() => {
                            setSelectedBookingId(row.bookingId);
                          }}
                        >
                          <td className="py-3.5 px-5 font-bold text-[var(--c-ink)] tabular-nums group-hover:text-[var(--c-primary)] transition-colors flex items-center gap-2">
                            {row.bookingCode}
                            <Receipt className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </td>
                          <td className="py-3.5 px-3 text-[var(--c-muted)] tabular-nums">{fmtDateTime(row.completedAt)}</td>
                          <td className="py-3.5 px-3 text-right font-bold text-[var(--c-ink)] tabular-nums">
                            {fmtMoney(gross)}
                          </td>
                          <td className="py-3.5 px-3 text-right font-bold text-[#0E9F6E] tabular-nums bg-[#0E9F6E]/5">
                            {fmtMoney(row.taskerEarning)}
                          </td>
                          <td className="py-3.5 px-5 text-right font-bold text-[var(--c-primary-strong)] tabular-nums bg-[var(--c-primary)]/5">
                            {fmtMoney(row.platformCommission)}
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
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            {/* Modal Footer with full pagination */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-8 py-4 border-t border-[var(--c-line)] bg-[var(--c-card-2)]/50">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <span className="text-xs font-medium text-[var(--c-muted)]">
                  Hiển thị {(detailsData?.length || 0) === 0 ? 0 : Math.min((currentPage - 1) * limit + 1, detailsData?.length || 0)} đến {Math.min(currentPage * limit, detailsData?.length || 0)} trong tổng số {detailsData?.length || 0}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[var(--c-muted)]">Số dòng:</span>
                  <Select
                    value={String(limit)}
                    onValueChange={(val) => {
                      setLimit(Number(val));
                      setCurrentPage(1);
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

              <div className="flex items-center gap-4">
                {(() => {
                  const totalPages = Math.max(
                    1,
                    Math.ceil((detailsData?.length || 0) / limit)
                  );
                  const getPageNumbers = () => {
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
                  };

                  return (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(1)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--c-line)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-[var(--c-card)]"
                        title="Trang đầu"
                      >
                        <span className="text-[10px] font-bold">{"<<"}</span>
                      </button>
                      <button
                        type="button"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--c-line)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-[var(--c-card)]"
                        title="Trang trước"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      <div className="flex items-center gap-1 px-1">
                        {getPageNumbers().map((p, i) =>
                          typeof p === "number" ? (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setCurrentPage(p)}
                              className={cn(
                                "min-w-8 h-8 px-2 flex items-center justify-center rounded-lg text-xs font-bold transition-all duration-200",
                                currentPage === p
                                  ? "bg-[var(--c-primary)] text-white shadow-sm"
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
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--c-line)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-[var(--c-card)]"
                        title="Trang tiếp"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage(totalPages)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--c-line)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-[var(--c-card)]"
                        title="Trang cuối"
                      >
                        <span className="text-[10px] font-bold">{">>"}</span>
                      </button>
                    </div>
                  );
                })()}

                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="px-4 py-2 text-xs font-bold text-white bg-[var(--c-primary)] hover:bg-[var(--c-primary-strong)] transition-colors rounded-xl shadow-sm ml-2"
                >
                  Thu nhỏ
                </button>
              </div>
            </div>
        </div>
      )}

      {/* Modals & Drawers */}
      <AdminBookingDetailModal
        open={!!selectedBookingId}
        onOpenChange={(val) => {
          if (!val) setSelectedBookingId(null);
        }}
        booking={bookingDetail ?? null}
      />
      <TransactionDetailDrawer
        transactionId={selectedTxnId}
        open={!!selectedTxnId}
        onOpenChange={(val) => !val && setSelectedTxnId(null)}
      />
    </div>
  );
};

// ─── Sub-tab Giao dịch Ví (Ledger) ─────────────────────────────────────────

const LedgerView: React.FC<{ taskerId: string }> = ({ taskerId }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selectedTxnId, setSelectedTxnId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showChart, setShowChart] = useState(false);

  // ── Bộ lọc kỳ cho biểu đồ dòng tiền ví ─────────────────────────────────────
  const STORAGE_KEY_CHART_PERIOD = `admin:tasker:${taskerId}:cashflow:period`;
  const STORAGE_KEY_CHART_RANGE = `admin:tasker:${taskerId}:cashflow:range`;

  const [chartPeriod, setChartPeriod] = useLocalStorage<
    (typeof PERIOD_OPTIONS)[number]["key"] | "custom"
  >(STORAGE_KEY_CHART_PERIOD, "all");

  const [chartCustomRangeStr, setChartCustomRangeStr] = useLocalStorage<{
    startDate: string | null;
    endDate: string | null;
  }>(STORAGE_KEY_CHART_RANGE, { startDate: null, endDate: null });

  const chartRange = React.useMemo(() => {
    if (chartPeriod === "all") {
      return { fromDate: "", toDate: "" };
    }
    if (chartPeriod === "custom") {
      return {
        fromDate: chartCustomRangeStr.startDate || "",
        toDate: chartCustomRangeStr.endDate || "",
      };
    }
    if (chartPeriod === "today") {
      const now = new Date();
      return { fromDate: fmtDate(now), toDate: fmtDate(now) };
    }
    if (chartPeriod === "last7") {
      const now = new Date();
      const from = new Date(now);
      from.setDate(now.getDate() - 6);
      return { fromDate: fmtDate(from), toDate: fmtDate(now) };
    }
    if (chartPeriod === "thisMonth") {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      return { fromDate: fmtDate(firstDay), toDate: fmtDate(now) };
    }
    if (chartPeriod === "lastMonth") {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      return { fromDate: fmtDate(firstDay), toDate: fmtDate(lastDay) };
    }
    return { fromDate: "", toDate: "" };
  }, [chartPeriod, chartCustomRangeStr]);

  const { data: txnsRes, isLoading: txnsLoading } = useAdminTaskerWalletTransactions(taskerId);
  const { data: summaryRes, isLoading: summaryLoading } = useAdminTaskerWalletSummary(taskerId);
  const { data: cashflowRes, isLoading: cashflowLoading } = useAdminTaskerWalletCashflowChart(taskerId, chartRange);
  
  const transactions = txnsRes?.data || [];
  const summary = summaryRes?.data || { balance: 0, deposit: 0 };
  const cashflowData = cashflowRes?.data || [];
  const cashflowSummary = cashflowRes?.summary || { totalPlus: 0, totalMinus: 0, netTotal: 0 };

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [selectedTxnObj, setSelectedTxnObj] = useState<TaskerWalletTransaction | null>(null);
  const [isTxDrawerOpen, setIsTxDrawerOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  const filteredTransactions = React.useMemo(() => {
    if (!transactions) return [];
    return transactions.filter((tx) => {
      const matchSearch =
        !searchTerm ||
        tx.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tx.label && tx.label.toLowerCase().includes(searchTerm.toLowerCase())) ||
        tx.type.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType =
        typeFilter === "ALL" ||
        (typeFilter === "PLUS" && tx.isPositive) ||
        (typeFilter === "MINUS" && !tx.isPositive) ||
        tx.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [transactions, searchTerm, typeFilter]);

  if (txnsLoading || summaryLoading) {
    return <div className="p-8 text-center text-[var(--c-muted)]">Đang tải dữ liệu ví...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* Wallet Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Số dư khả dụng */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0D1B3E] to-[#1a2f6c] text-white p-6 shadow-lg">
          <div className="absolute -right-8 -bottom-10 w-40 h-40 rounded-full bg-[var(--c-primary)]/40 blur-2xl" aria-hidden="true" />
          <div className="absolute right-6 top-6 opacity-20">
            <Wallet className="w-16 h-16" />
          </div>
          <div className="relative">
            <p className="text-xs uppercase tracking-widest text-white/60 font-bold mb-2">Số dư khả dụng</p>
            <p className="text-4xl font-black tabular-nums tracking-tight">{fmtMoney(summary.balance).replace(" đ", "")} <span className="text-xl text-white/70 font-semibold">đ</span></p>
            
            <div className="mt-8 flex gap-3">
              <button 
                onClick={() => {
                  toast.success("Đã ghi nhận yêu cầu rút tiền. Tính năng đang được hoàn thiện.");
                }}
                className="px-5 py-2 rounded-xl bg-white text-[#0D1B3E] text-sm font-bold shadow hover:bg-white/90 transition-colors"
              >
                Rút tiền
              </button>
              <button 
                onClick={() => {
                  document.getElementById("ledger-history-table")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="px-5 py-2 rounded-xl bg-white/10 text-white border border-white/20 text-sm font-bold hover:bg-white/20 transition-colors"
              >
                Xem sao kê
              </button>
            </div>
          </div>
        </div>

        {/* Tiền ký quỹ */}
        <div className="relative overflow-hidden rounded-3xl bg-[var(--c-card)] border border-[var(--c-line)] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-[var(--c-muted)] font-bold mb-2">Tiền ký quỹ (Giữ chân)</p>
                <p className="text-4xl font-black tabular-nums tracking-tight text-[var(--c-ink)]">{fmtMoney(summary.deposit).replace(" đ", "")} <span className="text-xl text-[var(--c-muted)] font-semibold">đ</span></p>
              </div>
              <div className="w-12 h-12 rounded-full bg-[rgba(14,159,110,0.1)] text-[#0E9F6E] flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>
            <p className="text-sm text-[var(--c-muted)] mt-3 max-w-[280px]">
              Đã hoàn tất đóng ký quỹ. Số tiền này sẽ được hoàn trả khi Tasker ngưng hợp tác (sau 15 ngày).
            </p>
          </div>
          <div className="mt-6 flex items-center gap-2">
            <Badge variant="outline" className="bg-[#0E9F6E]/10 text-[#0E9F6E] border-none font-bold uppercase tracking-wider text-[10px]">
              Đủ điều kiện nhận việc
            </Badge>
          </div>
        </div>
      </div>

      {/* Lịch sử giao dịch */}
      <AdminCard className="overflow-hidden" id="ledger-history-table">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[var(--c-line)] flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[var(--c-primary-strong)]" aria-hidden="true" />
            <h3 className="text-sm font-bold text-[var(--c-ink)]">Lịch sử giao dịch (Ledger)</h3>
            {filteredTransactions && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)]">
                {filteredTransactions.length} giao dịch
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowChart(!showChart)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors border shadow-sm",
                showChart
                  ? "bg-[var(--c-primary)] text-white border-[var(--c-primary)]"
                  : "bg-[var(--c-card-2)] text-[var(--c-ink)] border-[var(--c-line)] hover:bg-[var(--c-line)]"
              )}
            >
              <BarChart3 className="w-4 h-4" />
              <span>{showChart ? "Ẩn biểu đồ" : "Biểu đồ dòng tiền"}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-[var(--c-ink)] bg-[var(--c-card-2)] hover:bg-[var(--c-line)] rounded-lg transition-colors border border-[var(--c-line)]"
              title="Phóng to xem chi tiết"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Phóng to</span>
            </button>
          </div>
        </div>

        {/* Toolbar Bộ lọc nâng cao */}
        <div className="px-5 py-3 border-b border-[var(--c-line)] bg-[var(--c-card-2)]/20 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-muted)]" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm mã đơn, loại hoặc mã giao dịch..."
                className="pl-8 h-8 text-xs bg-[var(--c-card)] border-[var(--c-line)]"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--c-muted)] hover:text-[var(--c-ink)]"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 text-xs text-[var(--c-muted)]">
              <Filter className="w-3.5 h-3.5" />
              <span>Loại:</span>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8 text-xs bg-[var(--c-card)] border-[var(--c-line)] min-w-[140px]">
                <SelectValue placeholder="Tất cả loại" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả giao dịch</SelectItem>
                <SelectItem value="PLUS">Dòng tiền cộng (+)</SelectItem>
                <SelectItem value="MINUS">Dòng tiền trừ (-)</SelectItem>
                <SelectItem value="TASKER_EARNING">Thu nhập đơn</SelectItem>
                <SelectItem value="PLATFORM_FEE">Phí nền tảng</SelectItem>
                <SelectItem value="WITHDRAW">Rút tiền</SelectItem>
                <SelectItem value="DEPOSIT">Nạp cọc</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Biểu đồ dòng tiền kép (Dual Line/Area Chart) */}
        {showChart && (
          <div className="p-5 bg-[var(--c-card-2)]/30 border-b border-[var(--c-line)] space-y-4 animate-in fade-in duration-300">
            {/* Header & Filter */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4.5 h-4.5 text-[var(--c-primary-strong)]" />
                <span className="text-xs font-bold text-[var(--c-ink)]">Biểu đồ biến động dòng tiền (+ / -)</span>
              </div>
              <div className="inline-flex items-center gap-1 rounded-xl bg-[var(--c-card-2)] p-1 border border-[var(--c-line)]">
                {PERIOD_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setChartPeriod(opt.key)}
                    className={cn(
                      "rounded-lg px-3 py-1 text-xs font-bold transition-all duration-200",
                      chartPeriod === opt.key
                        ? "bg-[var(--c-primary)] text-white shadow-sm"
                        : "text-[var(--c-muted)] hover:text-[var(--c-ink)] hover:bg-[var(--c-card)]"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
                <div className="flex items-center ml-1">
                  <DateRangePicker
                    startDate={chartPeriod === "custom" && chartCustomRangeStr.startDate ? chartCustomRangeStr.startDate : ""}
                    endDate={chartPeriod === "custom" && chartCustomRangeStr.endDate ? chartCustomRangeStr.endDate : ""}
                    onRangeChange={(startStr, endStr) => {
                      if (!startStr && !endStr) {
                        setChartCustomRangeStr({ startDate: null, endDate: null });
                        setChartPeriod("all");
                      } else {
                        setChartCustomRangeStr({
                          startDate: startStr || null,
                          endDate: endStr || null,
                        });
                        setChartPeriod("custom");
                      }
                    }}
                    placeholder="Tùy chọn ngày..."
                    allowPastDates
                    className={cn(
                      "h-[28px] px-2 text-xs border-0 transition-all duration-200",
                      chartPeriod === "custom"
                        ? "bg-[var(--c-primary)] text-white shadow-md font-bold"
                        : "bg-transparent text-[var(--c-muted)] hover:bg-[var(--c-card)] hover:text-[var(--c-ink)]"
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Stat Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-2xl bg-[#0E9F6E]/10 border border-[#0E9F6E]/20 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-[#0E9F6E] uppercase tracking-wider">Tiền Cộng (+)</p>
                  <p className="text-xl font-black text-[#0E9F6E] tabular-nums mt-0.5">{fmtMoney(cashflowSummary.totalPlus)}</p>
                </div>
                <ArrowDownLeft className="w-6 h-6 text-[#0E9F6E]" />
              </div>
              <div className="p-3 rounded-2xl bg-[#E11D48]/10 border border-[#E11D48]/20 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-[#E11D48] uppercase tracking-wider">Tiền Trừ (-)</p>
                  <p className="text-xl font-black text-[#E11D48] tabular-nums mt-0.5">{fmtMoney(cashflowSummary.totalMinus)}</p>
                </div>
                <ArrowUpRight className="w-6 h-6 text-[#E11D48]" />
              </div>
              <div className="p-3 rounded-2xl bg-[var(--c-card)] border border-[var(--c-line)] flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-[var(--c-muted)] uppercase tracking-wider">Biến động ròng (Net)</p>
                  <p className={cn(
                    "text-xl font-black tabular-nums mt-0.5",
                    cashflowSummary.netTotal >= 0 ? "text-[#0E9F6E]" : "text-[#E11D48]"
                  )}>
                    {cashflowSummary.netTotal >= 0 ? "+" : ""}{fmtMoney(cashflowSummary.netTotal)}
                  </p>
                </div>
                <Wallet className="w-6 h-6 text-[var(--c-muted)]" />
              </div>
            </div>

            {/* Area Chart Container */}
            <div className="h-64 w-full pt-2">
              {cashflowLoading ? (
                <div className="h-full flex items-center justify-center text-xs text-[var(--c-muted)]">Đang tải biểu đồ...</div>
              ) : cashflowData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-xs text-[var(--c-muted)]">
                  <BarChart3 className="w-8 h-8 opacity-30 mb-2" />
                  <span>Không có dữ liệu dòng tiền trong khoảng thời gian này</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cashflowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="plusGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0E9F6E" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#0E9F6E" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="minusGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#E11D48" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#E11D48" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--c-line)" />
                    <XAxis dataKey="date" stroke="var(--c-muted)" fontSize={11} tickLine={false} />
                    <YAxis stroke="var(--c-muted)" fontSize={11} tickLine={false} tickFormatter={(val) => `${(val / 1000).toLocaleString()}k`} />
                    <RechartsTooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload || !payload.length) return null;
                        const plus = Number(payload.find((p) => p.dataKey === "plusAmount")?.value ?? 0);
                        const minus = Number(payload.find((p) => p.dataKey === "minusAmount")?.value ?? 0);
                        const net = plus - minus;
                        return (
                          <div className="bg-[var(--c-card)] border border-[var(--c-line)] p-3 rounded-2xl shadow-xl text-xs space-y-2 min-w-[200px]">
                            <p className="font-bold text-[var(--c-ink)] border-b border-[var(--c-line)] pb-1 flex items-center justify-between">
                              <span>{label}</span>
                              <span className="text-[10px] text-[var(--c-muted)] font-normal">Chi tiết ngày</span>
                            </p>
                            <div className="space-y-1.5 pt-0.5">
                              <div className="flex items-center justify-between font-bold text-[#0E9F6E]">
                                <span className="flex items-center gap-1">
                                  <ArrowDownLeft className="w-3.5 h-3.5" /> Tiền Cộng (+):
                                </span>
                                <span>{fmtMoney(plus)}</span>
                              </div>
                              <div className="flex items-center justify-between font-bold text-[#E11D48]">
                                <span className="flex items-center gap-1">
                                  <ArrowUpRight className="w-3.5 h-3.5" /> Tiền Trừ (-):
                                </span>
                                <span>{fmtMoney(minus)}</span>
                              </div>
                              <div className="flex items-center justify-between font-bold text-[var(--c-ink)] pt-1 border-t border-[var(--c-line)]">
                                <span className="flex items-center gap-1 text-[var(--c-muted)]">
                                  <Wallet className="w-3.5 h-3.5" /> Biến động Ròng:
                                </span>
                                <span className={net >= 0 ? "text-[#0E9F6E]" : "text-[#E11D48]"}>
                                  {net >= 0 ? "+" : ""}{fmtMoney(net)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Legend
                      content={() => (
                        <div className="flex items-center justify-center gap-4 pt-4 text-xs font-bold flex-wrap">
                          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#0E9F6E]/10 border border-[#0E9F6E]/20 text-[#0E9F6E] shadow-sm">
                            <ArrowDownLeft className="w-4 h-4" />
                            <span>Dòng tiền cộng (+): {fmtMoney(cashflowSummary.totalPlus)}</span>
                          </div>
                          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#E11D48]/10 border border-[#E11D48]/20 text-[#E11D48] shadow-sm">
                            <ArrowUpRight className="w-4 h-4" />
                            <span>Dòng tiền trừ (-): {fmtMoney(cashflowSummary.totalMinus)}</span>
                          </div>
                        </div>
                      )}
                    />
                    <Area
                      type="monotone"
                      dataKey="plusAmount"
                      name="plusAmount"
                      stroke="#0E9F6E"
                      strokeWidth={3}
                      dot={{ r: 3.5, fill: "#0E9F6E", strokeWidth: 1.5, stroke: "#ffffff" }}
                      activeDot={{ r: 6.5, strokeWidth: 2.5, fill: "#0E9F6E" }}
                      fillOpacity={1}
                      fill="url(#plusGradient)"
                    />
                    <Area
                      type="monotone"
                      dataKey="minusAmount"
                      name="minusAmount"
                      stroke="#E11D48"
                      strokeWidth={3}
                      dot={{ r: 3.5, fill: "#E11D48", strokeWidth: 1.5, stroke: "#ffffff" }}
                      activeDot={{ r: 6.5, strokeWidth: 2.5, fill: "#E11D48" }}
                      fillOpacity={1}
                      fill="url(#minusGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
          {filteredTransactions.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <History className="w-10 h-10 text-[var(--c-muted)]/30 mb-3" />
              <p className="text-sm font-semibold text-[var(--c-ink)]">Không tìm thấy giao dịch nào</p>
              <p className="text-xs text-[var(--c-muted)] mt-1">Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc loại giao dịch.</p>
            </div>
          ) : (
          <table className="w-full text-left text-[13.5px]">
            <thead className="sticky top-0 bg-[var(--c-card)] shadow-sm z-10">
              <tr>
                <th className="py-3 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-5">Giao dịch</th>
                <th className="py-3 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-3">Loại</th>
                <th className="py-3 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-3 text-right">Biến động</th>
                <th className="py-3 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-3 text-right">Số dư cuối</th>
                <th className="py-3 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-5 text-right">Trạng thái</th>
                <th className="py-3 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--c-line)]">
              {(() => {
                const itemsPerPage = limit;
                const maxPage = Math.max(1, Math.ceil((filteredTransactions?.length || 0) / itemsPerPage));
                const safePage = Math.min(currentPage, maxPage);
                const startIndex = (safePage - 1) * itemsPerPage;
                const paginatedData = filteredTransactions.slice(startIndex, startIndex + itemsPerPage);

                return paginatedData.map((row: TaskerWalletTransaction) => (
                  <tr 
                    key={row.id} 
                    className="hover:bg-[var(--c-card-2)] transition-colors group cursor-pointer"
                    onClick={() => {
                      setSelectedTxnObj(row);
                      setIsTxDrawerOpen(true);
                    }}
                  >
                    <td className="py-3.5 px-5 font-bold text-[var(--c-ink)]">
                      <div className="flex items-center gap-2">
                        <span className="group-hover:text-[var(--c-primary)] transition-colors line-clamp-1">{row.label || row.type}</span>
                        <Receipt className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-[var(--c-primary)] transition-opacity shrink-0" />
                      </div>
                      <p className="text-xs font-normal text-[var(--c-muted)] mt-0.5">{fmtDateTime(row.date)}</p>
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant="outline" className="text-[10px] uppercase bg-[var(--c-card-2)] border-[var(--c-line)] text-[var(--c-ink)]">
                        {row.type}
                      </Badge>
                    </td>
                    <td className={cn(
                      "py-3 px-3 text-right font-black tabular-nums",
                      row.isPositive ? "text-[#0E9F6E]" : "text-[#E11D48]"
                    )}>
                      {row.isPositive ? "+" : "-"}{fmtMoney(row.amount)}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-[var(--c-ink)] tabular-nums">
                      {fmtMoney(row.balance)}
                    </td>
                    <td className="py-3 px-5 text-right">
                      {row.status === "SUCCESS" ? (
                        <Badge variant="outline" className="bg-[#0E9F6E]/10 text-[#0E9F6E] border-none text-[10px] uppercase font-bold tracking-widest">
                          Thành công
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-[#D97706]/10 text-[#D97706] border-none text-[10px] uppercase font-bold tracking-widest">
                          Đang xử lý
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-5 text-right">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[var(--c-primary-strong)] bg-[var(--c-primary-soft)] hover:bg-[var(--c-primary)] hover:text-white transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTxnObj(row);
                          setIsTxDrawerOpen(true);
                        }}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
          )}
        </div>
        {filteredTransactions && filteredTransactions.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-3 border-t border-[var(--c-line)] bg-[var(--c-card)]">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <span className="text-xs font-medium text-[var(--c-muted)]">
                Hiển thị {filteredTransactions.length === 0 ? 0 : Math.min((currentPage - 1) * limit + 1, filteredTransactions.length)} đến {Math.min(currentPage * limit, filteredTransactions.length)} trong tổng số {filteredTransactions.length}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[var(--c-muted)]">Số dòng:</span>
                <Select
                  value={String(limit)}
                  onValueChange={(val) => {
                    setLimit(Number(val));
                    setCurrentPage(1);
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
            {(() => {
              const totalPages = Math.max(
                1,
                Math.ceil((transactions?.length || 0) / limit)
              );
              const getPageNumbers = () => {
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
              };

              return (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(1)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--c-line)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-[var(--c-card)]"
                    title="Trang đầu"
                  >
                    <span className="text-[10px] font-bold">{"<<"}</span>
                  </button>
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--c-line)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-[var(--c-card)]"
                    title="Trang trước"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1 px-1">
                    {getPageNumbers().map((p, i) =>
                      typeof p === "number" ? (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setCurrentPage(p)}
                          className={cn(
                            "min-w-8 h-8 px-2 flex items-center justify-center rounded-lg text-xs font-bold transition-all duration-200",
                            currentPage === p
                              ? "bg-[var(--c-primary)] text-white shadow-sm"
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
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--c-line)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-[var(--c-card)]"
                    title="Trang tiếp"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--c-line)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-[var(--c-card)]"
                    title="Trang cuối"
                  >
                    <span className="text-[10px] font-bold">{">>"}</span>
                  </button>
                </div>
              );
            })()}
          </div>
        )}
      </AdminCard>

      {/* Modal Phóng To Lịch Sử Giao Dịch (Ledger Fullscreen View) */}
      {isExpanded && (
        <div className="fixed inset-0 w-screen h-screen bg-[var(--c-card)] z-[9999] flex flex-col overflow-hidden animate-in fade-in duration-200">
          {/* Modal Header */}
          <div className="flex items-center justify-between px-8 py-5 border-b border-[var(--c-line)] bg-[var(--c-card-2)]/60">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)]">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--c-ink)]">Lịch sử giao dịch (Ledger) — Xem chi tiết</h3>
                <p className="text-xs text-[var(--c-muted)] mt-0.5">Tổng cộng {transactions?.length || 0} giao dịch biến động ví</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[var(--c-ink)] bg-[var(--c-card)] hover:bg-[var(--c-card-2)] rounded-xl transition-colors border border-[var(--c-line)] shadow-sm"
              title="Thu nhỏ lại"
            >
              <Minimize2 className="w-4 h-4" />
              <span>Thu nhỏ</span>
            </button>
          </div>

          {/* Modal Table Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <table className="w-full text-left text-[13.5px]">
              <thead className="sticky top-0 bg-[var(--c-card)] shadow-sm z-10">
                <tr>
                  <th className="py-3 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-5">Giao dịch</th>
                  <th className="py-3 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-3">Loại</th>
                  <th className="py-3 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-3 text-right">Biến động</th>
                  <th className="py-3 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-3 text-right">Số dư cuối</th>
                  <th className="py-3 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-5 text-right">Trạng thái</th>
                  <th className="py-3 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--c-line)]">
                {(() => {
                  const itemsPerPage = limit;
                  const maxPage = Math.max(1, Math.ceil((transactions?.length || 0) / itemsPerPage));
                  const safePage = Math.min(currentPage, maxPage);
                  const startIndex = (safePage - 1) * itemsPerPage;
                  const paginatedData = transactions.slice(startIndex, startIndex + itemsPerPage);

                  return paginatedData.map((row: TaskerWalletTransaction) => (
                    <tr 
                      key={row.id} 
                      className="hover:bg-[var(--c-card-2)] transition-colors group cursor-pointer"
                      onClick={() => setSelectedTxnId(row.id)}
                    >
                      <td className="py-3.5 px-5 font-bold text-[var(--c-ink)]">
                        <div className="flex items-center gap-2">
                          <span className="group-hover:text-[var(--c-primary)] transition-colors line-clamp-1">{row.label || row.type}</span>
                          <Receipt className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-[var(--c-primary)] transition-opacity shrink-0" />
                        </div>
                        <p className="text-xs font-normal text-[var(--c-muted)] mt-0.5">{fmtDateTime(row.date)}</p>
                      </td>
                      <td className="py-3.5 px-3">
                        <Badge variant="outline" className="text-[10px] uppercase bg-[var(--c-card-2)] border-[var(--c-line)] text-[var(--c-ink)]">
                          {row.type}
                        </Badge>
                      </td>
                      <td className={cn(
                        "py-3.5 px-3 text-right font-black tabular-nums",
                        row.isPositive ? "text-[#0E9F6E]" : "text-[#E11D48]"
                      )}>
                        {row.isPositive ? "+" : "-"}{fmtMoney(row.amount)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-semibold text-[var(--c-ink)] tabular-nums">
                        {fmtMoney(row.balance)}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        {row.status === "SUCCESS" ? (
                          <Badge variant="outline" className="bg-[#0E9F6E]/10 text-[#0E9F6E] border-none text-[10px] uppercase font-bold tracking-widest">
                            Thành công
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-[#D97706]/10 text-[#D97706] border-none text-[10px] uppercase font-bold tracking-widest">
                            Đang xử lý
                          </Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[var(--c-primary-strong)] bg-[var(--c-primary-soft)] hover:bg-[var(--c-primary)] hover:text-white transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTxnId(row.id);
                          }}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>

          {/* Modal Footer with full pagination */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-8 py-4 border-t border-[var(--c-line)] bg-[var(--c-card-2)]/50">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <span className="text-xs font-medium text-[var(--c-muted)]">
                Hiển thị {transactions.length === 0 ? 0 : Math.min((currentPage - 1) * limit + 1, transactions.length)} đến {Math.min(currentPage * limit, transactions.length)} trong tổng số {transactions.length}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[var(--c-muted)]">Số dòng:</span>
                  <Select
                    value={String(limit)}
                    onValueChange={(val) => {
                      setLimit(Number(val));
                      setCurrentPage(1);
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

            <div className="flex items-center gap-4">
              {(() => {
                const totalPages = Math.max(
                  1,
                  Math.ceil((transactions?.length || 0) / limit)
                );
                const getPageNumbers = () => {
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
                };

                return (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(1)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--c-line)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-[var(--c-card)]"
                      title="Trang đầu"
                    >
                      <span className="text-[10px] font-bold">{"<<"}</span>
                    </button>
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--c-line)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-[var(--c-card)]"
                      title="Trang trước"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-1 px-1">
                      {getPageNumbers().map((p, i) =>
                        typeof p === "number" ? (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setCurrentPage(p)}
                            className={cn(
                              "min-w-8 h-8 px-2 flex items-center justify-center rounded-lg text-xs font-bold transition-all duration-200",
                              currentPage === p
                                ? "bg-[var(--c-primary)] text-white shadow-sm"
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
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--c-line)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-[var(--c-card)]"
                      title="Trang tiếp"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage(totalPages)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--c-line)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-[var(--c-card)]"
                      title="Trang cuối"
                    >
                      <span className="text-[10px] font-bold">{">>"}</span>
                    </button>
                  </div>
                );
              })()}

              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="px-4 py-2 text-xs font-bold text-white bg-[var(--c-primary)] hover:bg-[var(--c-primary-strong)] transition-colors rounded-xl shadow-sm ml-2"
              >
                Thu nhỏ
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Transaction Detail Drawer */}
      <TransactionDetailDrawer
        transactionId={selectedTxnId}
        open={!!selectedTxnId}
        onOpenChange={(val) => !val && setSelectedTxnId(null)}
      />

      {/* Tasker Wallet Transaction Detail Drawer (100% thuộc tính giao dịch) */}
      <TaskerWalletTxDetailDrawer
        transaction={selectedTxnObj}
        open={isTxDrawerOpen}
        onOpenChange={setIsTxDrawerOpen}
        onSelectBookingId={(bookingId) => {
          setIsTxDrawerOpen(false);
          setSelectedBookingId(bookingId);
        }}
      />

      {/* Admin Booking Detail Modal */}
      {selectedBookingId && (
        <AdminBookingDetailModalWrapper
          bookingId={selectedBookingId}
          open={!!selectedBookingId}
          onOpenChange={(val) => !val && setSelectedBookingId(null)}
        />
      )}
    </div>
  );
};

const AdminBookingDetailModalWrapper: React.FC<{
  bookingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ bookingId, open, onOpenChange }) => {
  const { booking } = useAdminBookingDetail(bookingId);
  return (
    <AdminBookingDetailModal
      booking={booking ?? null}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────

export const TaskerFinanceTab: React.FC<{ taskerId: string }> = ({ taskerId }) => {
  const [activeTab, setActiveTab] = useState<"EARNINGS" | "LEDGER">("EARNINGS");

  return (
    <div className="space-y-6">
      {/* Sub-tab Navigation */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveTab("EARNINGS")}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300",
            activeTab === "EARNINGS"
              ? "bg-[var(--c-primary)] text-white shadow-md shadow-[var(--c-primary)]/20"
              : "bg-[var(--c-card)] text-[var(--c-muted)] border border-[var(--c-line)] hover:bg-[var(--c-card-2)] hover:text-[var(--c-ink)] hover:border-[var(--c-line-strong)]"
          )}
        >
          <BarChart3 className="w-4 h-4" />
          Thống kê Thu nhập
        </button>
        <button
          onClick={() => setActiveTab("LEDGER")}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300",
            activeTab === "LEDGER"
              ? "bg-[var(--c-primary)] text-white shadow-md shadow-[var(--c-primary)]/20"
              : "bg-[var(--c-card)] text-[var(--c-muted)] border border-[var(--c-line)] hover:bg-[var(--c-card-2)] hover:text-[var(--c-ink)] hover:border-[var(--c-line-strong)]"
          )}
        >
          <History className="w-4 h-4" />
          Giao dịch Ví
        </button>
      </div>

      {/* Content Area */}
      <div className="min-h-[500px]">
        {activeTab === "EARNINGS" && <EarningsOverviewView taskerId={taskerId} />}
        {activeTab === "LEDGER" && <LedgerView taskerId={taskerId} />}
      </div>
    </div>
  );
};
