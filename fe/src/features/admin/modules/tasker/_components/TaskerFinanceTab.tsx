"use client";

import React, { useState, useMemo } from "react";
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
  CheckCircle2
} from "lucide-react";
import { AdminCard } from "@/components/admin";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  useAdminTaskerEarnings,
  useAdminTaskerEarningsDetails,
  useAdminTaskerWalletTransactions,
  useAdminTaskerWalletSummary,
} from "../hooks/admin-tasker.hooks";
import type { TaskerWalletTransaction } from "../types/admin-tasker.types";
import { rangeOf } from "../../../lib/date-ranges";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { AdminBookingDetailModal } from "@/features/admin/modules/booking/_components/AdminBookingDetailModal";
import { useAdminBookingDetail } from "@/features/admin/modules/booking/hooks/useAdminBooking";
import { TransactionDetailDrawer } from "@/features/admin/modules/customer/_components/TransactionDetailDrawer";
import { ChevronLeft, ChevronRight } from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────────────────

const PERIOD_OPTIONS: { key: "today" | "thisWeek" | "thisMonth"; label: string }[] = [
  { key: "today", label: "Hôm nay" },
  { key: "thisWeek", label: "Tuần này" },
  { key: "thisMonth", label: "Tháng này" },
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
  tone: "emerald" | "amber" | "blue" | "purple";
}> = ({ icon: Icon, value, label, tone }) => {
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
        <p className="text-xs font-semibold text-[var(--c-muted)] mt-1.5 uppercase tracking-wide">{label}</p>
      </div>
    </AdminCard>
  );
};

// ─── Sub-tab Views ──────────────────────────────────────────────────────────

const EarningsOverviewView: React.FC<{ taskerId: string }> = ({ taskerId }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [period, setPeriod] = useState<(typeof PERIOD_OPTIONS)[number]["key"] | "custom">("thisMonth");
  const [customRange, setCustomRange] = React.useState<{
    startDate: Date | null;
    endDate: Date | null;
  }>({
    startDate: null,
    endDate: null,
  });

  const [selectedBookingId, setSelectedBookingId] = React.useState<string | null>(null);
  const { booking: bookingDetail, isLoading: isBookingLoading } = useAdminBookingDetail(selectedBookingId);

  const [selectedTxnId, setSelectedTxnId] = React.useState<string | null>(null);

  const range = React.useMemo(() => {
    if (period === "custom") {
      return { fromDate: customRange.startDate?.toISOString() ?? "", toDate: customRange.endDate?.toISOString() ?? "" };
    }
    return rangeOf(period);
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
              startDate={customRange.startDate ? customRange.startDate.toISOString() : ""}
              endDate={customRange.endDate ? customRange.endDate.toISOString() : ""}
              onStartChange={(v) => {
                setCustomRange((p) => ({ ...p, startDate: new Date(v) }));
                setPeriod("custom");
              }}
              onEndChange={(v) => {
                setCustomRange((p) => ({ ...p, endDate: new Date(v) }));
                setPeriod("custom");
              }}
              placeholder="Tùy chọn ngày..."
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
            label="Đơn hoàn thiện"
          />
          <EarningStat
            icon={CircleDollarSign}
            tone="purple"
            value={fmtMoney(grossValue)}
            label="Tổng giá trị (Gross)"
          />
          <EarningStat
            icon={Wallet}
            tone="emerald"
            value={fmtMoney(netValue)}
            label="Thực thu (Net)"
          />
          <EarningStat
            icon={Percent}
            tone="amber"
            value={fmtMoney(commission)}
            label="Chiết khấu (Fee)"
          />
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
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0E9F6E" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#0E9F6E" stopOpacity={0.2}/>
                  </linearGradient>
                  <linearGradient id="colorFee" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--c-primary)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="var(--c-primary)" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
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
                  cursor={{ fill: 'var(--c-card-2)', opacity: 0.5 }}
                  contentStyle={{ borderRadius: '12px', border: '1px solid var(--c-line)', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: '12px' }}
                  labelStyle={{ fontWeight: 'bold', color: 'var(--c-ink)', marginBottom: '8px' }}
                  formatter={(value: unknown, name: unknown) => [
                    fmtMoney(Number(value) || 0),
                    name === 'net' ? 'Thực thu (Net)' : name === 'fee' ? 'Chiết khấu (Fee)' : 'Tổng giá trị (Gross)'
                  ]}
                />
                <Bar dataKey="net" stackId="a" fill="url(#colorNet)" radius={[0, 0, 4, 4]} maxBarSize={40} name="net" />
                <Bar dataKey="fee" stackId="a" fill="url(#colorFee)" radius={[4, 4, 0, 0]} maxBarSize={40} name="fee" />
                <Line type="monotone" dataKey="gross" stroke="#9333EA" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} name="gross" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </AdminCard>
      )}

      {/* Payroll Table */}
      <AdminCard className="overflow-hidden">
        <div className="flex items-center gap-2 px-5 pt-4 pb-3 border-b border-[var(--c-line)]">
          <FileText className="w-4 h-4 text-[var(--c-primary-strong)]" aria-hidden="true" />
          <h3 className="text-sm font-bold text-[var(--c-ink)]">Bảng kê từng đơn (Payroll)</h3>
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
                <select 
                  className="bg-[var(--c-card-2)] border border-[var(--c-line)] text-xs text-[var(--c-ink)] rounded-md px-2 py-1 outline-none focus:ring-1 focus:ring-[var(--c-primary)] font-medium cursor-pointer"
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
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
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--c-line)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-[var(--c-card)]"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <span className="text-xs font-semibold px-3 text-[var(--c-ink)]">
                Trang {currentPage} / {Math.ceil(detailsData.length / limit) || 1}
              </span>

              <button
                type="button"
                disabled={currentPage >= Math.ceil(detailsData.length / limit)}
                onClick={() => setCurrentPage(p => p + 1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--c-line)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-[var(--c-card)]"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={currentPage >= Math.ceil(detailsData.length / limit)}
                onClick={() => setCurrentPage(Math.ceil(detailsData.length / limit) || 1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--c-line)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-[var(--c-card)]"
                title="Trang cuối"
              >
                <span className="text-[10px] font-bold">{">>"}</span>
              </button>
            </div>
          </div>
        )}
      </AdminCard>

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
  const [limit, setLimit] = useState(10);
  const [selectedTxnId, setSelectedTxnId] = useState<string | null>(null);
  const { data: txnsRes, isLoading: txnsLoading } = useAdminTaskerWalletTransactions(taskerId);
  const { data: summaryRes, isLoading: summaryLoading } = useAdminTaskerWalletSummary(taskerId);
  
  const transactions = txnsRes?.data || [];
  const summary = summaryRes?.data || { balance: 0, deposit: 0 };

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
        <div className="flex items-center gap-2 px-5 pt-5 pb-4 border-b border-[var(--c-line)]">
          <History className="w-5 h-5 text-[var(--c-primary-strong)]" aria-hidden="true" />
          <h3 className="text-sm font-bold text-[var(--c-ink)]">Lịch sử giao dịch (Ledger)</h3>
        </div>

        <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
          {transactions.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <History className="w-10 h-10 text-[var(--c-muted)]/30 mb-3" />
              <p className="text-sm font-semibold text-[var(--c-ink)]">Chưa có giao dịch</p>
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
                const itemsPerPage = 10;
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
                    <td className="py-3 px-3">
                      <Badge variant="outline" className="text-[10px] uppercase bg-[var(--c-card-2)] border-[var(--c-line)] text-[var(--c-ink)]">
                        {row.type}
                      </Badge>
                    </td>
                    <td className={cn(
                      "py-3 px-3 text-right font-black tabular-nums",
                      row.isPositive ? "text-[#0E9F6E]" : "text-[#E11D48]"
                    )}>
                      {row.isPositive ? "+" : ""}{fmtMoney(row.amount)}
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
          )}
        </div>
        {transactions && transactions.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-3 border-t border-[var(--c-line)] bg-[var(--c-card)]">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <span className="text-xs font-medium text-[var(--c-muted)]">
                Hiển thị {transactions.length === 0 ? 0 : Math.min((currentPage - 1) * limit + 1, transactions.length)} đến {Math.min(currentPage * limit, transactions.length)} trong tổng số {transactions.length}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[var(--c-muted)]">Số dòng:</span>
                <select 
                  className="bg-[var(--c-card-2)] border border-[var(--c-line)] text-xs text-[var(--c-ink)] rounded-md px-2 py-1 outline-none focus:ring-1 focus:ring-[var(--c-primary)] font-medium cursor-pointer"
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
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
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--c-line)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-[var(--c-card)]"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <span className="text-xs font-semibold px-3 text-[var(--c-ink)]">
                Trang {currentPage} / {Math.ceil(transactions.length / limit) || 1}
              </span>

              <button
                type="button"
                disabled={currentPage >= Math.ceil(transactions.length / limit)}
                onClick={() => setCurrentPage(p => p + 1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--c-line)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-[var(--c-card)]"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={currentPage >= Math.ceil(transactions.length / limit)}
                onClick={() => setCurrentPage(Math.ceil(transactions.length / limit) || 1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--c-line)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-[var(--c-card)]"
                title="Trang cuối"
              >
                <span className="text-[10px] font-bold">{">>"}</span>
              </button>
            </div>
          </div>
        )}
      </AdminCard>
      
      {/* Transaction Detail Drawer */}
      <TransactionDetailDrawer
        transactionId={selectedTxnId}
        open={!!selectedTxnId}
        onOpenChange={(val) => !val && setSelectedTxnId(null)}
      />
    </div>
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
