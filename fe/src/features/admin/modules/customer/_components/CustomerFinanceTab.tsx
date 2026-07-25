"use client";

import React, { useState } from "react";
import {
  useCustomerWalletOverview,
  useCustomerWalletTransactions,
  useCustomerTopups,
  useCustomerWithdrawals,
  useCustomerServiceBreakdown,
  useAdjustWallet,
} from "@/features/admin/modules/wallets/hooks/useAdminWallets";
import type { WalletTransactionType } from "@/features/admin/modules/wallets/types/wallet.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  WalletCards,
  LockKeyhole,
  CreditCard,
  RotateCcw,
  SlidersHorizontal,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  CircleDollarSign,
  PlusCircle,
  FileText,
  BarChart3,
  PackageOpen,
  CalendarDays,
  X,
  CalendarIcon,
  Search,
  CalendarRange,
  List,
  TrendingUp,
  Eye,
  CheckCircle2,
  XCircle,
  Layers,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { TransactionDetailDrawer } from "./TransactionDetailDrawer";
import {
  ComposedChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "@/lib/toast";

interface Props {
  customerId: string;
}

const TRANSACTION_TYPES: Record<string, { label: string; color: string }> = {
  PAYMENT: { label: "Thanh toán đơn", color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  REFUND: { label: "Hoàn tiền", color: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  DEPOSIT: { label: "Nạp tiền PayPal", color: "bg-purple-500/10 text-purple-600 border-purple-200" },
  ADJUSTMENT: { label: "Điều chỉnh Admin", color: "bg-amber-500/10 text-amber-600 border-amber-200" },
  DEPOSIT_HOLD: { label: "Giữ tiền cọc", color: "bg-orange-500/10 text-orange-600 border-orange-200" },
};

const formatCurrency = (value: number | string | undefined) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));

export function CustomerFinanceTab({ customerId }: Props) {
  const [subTab, setSubTab] = useState<"LEDGER" | "TOPUPS" | "WITHDRAWALS" | "SERVICES">("LEDGER");
  const [page, setPage] = useState(1);
  const [topupPage, setTopupPage] = useState(1);
  const [withdrawalPage, setWithdrawalPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [ledgerDirection, setLedgerDirection] = useState<string>("ALL");
  const [ledgerPreset, setLedgerPreset] = useState<string>("ALL");
  const [ledgerDateRange, setLedgerDateRange] = useState<{ from: string; to: string }>({ from: "", to: "" });
  const [ledgerFromOpen, setLedgerFromOpen] = useState(false);
  const [ledgerToOpen, setLedgerToOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [serviceViewMode, setServiceViewMode] = useState<"LIST" | "CHART">("LIST");
  const [chartCurveMode, setChartCurveMode] = useState<"BOTH" | "COMPLETED" | "CANCELLED">("BOTH");
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const getLedgerDateParams = () => {
    if (ledgerPreset === "CUSTOM") {
      return {
        fromDate: ledgerDateRange.from || undefined,
        toDate: ledgerDateRange.to || undefined,
      };
    }
    if (ledgerPreset === "ALL") return {};
    const now = new Date();
    const toStr = now.toISOString().slice(0, 10);
    const fromDate = new Date(now);
    if (ledgerPreset === "7D") fromDate.setDate(now.getDate() - 7);
    else if (ledgerPreset === "30D") fromDate.setDate(now.getDate() - 30);
    else if (ledgerPreset === "3M") fromDate.setMonth(now.getMonth() - 3);
    else if (ledgerPreset === "6M") fromDate.setMonth(now.getMonth() - 6);
    else if (ledgerPreset === "YEAR") fromDate.setMonth(0, 1);
    return { fromDate: fromDate.toISOString().slice(0, 10), toDate: toStr };
  };
  const ledgerDateParams = getLedgerDateParams();
  const [breakdownPreset, setBreakdownPreset] = useState<string>("ALL");
  const [breakdownDateRange, setBreakdownDateRange] = useState<{ from: string; to: string }>({ from: "", to: "" });

  const [topupSearch, setTopupSearch] = useState("");
  const [topupStatusFilter, setTopupStatusFilter] = useState("ALL");
  const [topupPreset, setTopupPreset] = useState("ALL");
  const [topupDateRange, setTopupDateRange] = useState<{ from: string; to: string }>({ from: "", to: "" });
  const [topupFromOpen, setTopupFromOpen] = useState(false);
  const [topupToOpen, setTopupToOpen] = useState(false);

  const getTopupDateParams = () => {
    if (topupPreset === "CUSTOM") {
      return {
        fromDate: topupDateRange.from || undefined,
        toDate: topupDateRange.to || undefined,
      };
    }
    if (topupPreset === "ALL") return {};
    const now = new Date();
    const toStr = now.toISOString().slice(0, 10);
    const fromDate = new Date(now);
    if (topupPreset === "7D") fromDate.setDate(now.getDate() - 7);
    else if (topupPreset === "30D") fromDate.setDate(now.getDate() - 30);
    else if (topupPreset === "3M") fromDate.setMonth(now.getMonth() - 3);
    else if (topupPreset === "6M") fromDate.setMonth(now.getMonth() - 6);
    else if (topupPreset === "YEAR") fromDate.setMonth(0, 1);
    return { fromDate: fromDate.toISOString().slice(0, 10), toDate: toStr };
  };
  const topupDateParams = getTopupDateParams();
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  };

  const parseDateStr = (dateStr: string) => {
    if (!dateStr) return undefined;
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  const formatDateKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  // Tính from/to từ preset hoặc custom range
  const getBreakdownDateParams = () => {
    if (breakdownPreset === "CUSTOM") {
      return {
        from: breakdownDateRange.from || undefined,
        to: breakdownDateRange.to || undefined,
      };
    }
    if (breakdownPreset === "ALL") return {};
    const now = new Date();
    const toStr = now.toISOString().slice(0, 10);
    const fromDate = new Date(now);
    if (breakdownPreset === "7D") fromDate.setDate(now.getDate() - 7);
    else if (breakdownPreset === "30D") fromDate.setDate(now.getDate() - 30);
    else if (breakdownPreset === "3M") fromDate.setMonth(now.getMonth() - 3);
    else if (breakdownPreset === "6M") fromDate.setMonth(now.getMonth() - 6);
    else if (breakdownPreset === "YEAR") fromDate.setMonth(0, 1);
    return { from: fromDate.toISOString().slice(0, 10), to: toStr };
  };
  const breakdownParams = getBreakdownDateParams();

  const { data: overview, isLoading: isOverviewLoading } =
    useCustomerWalletOverview(customerId);

  const { data: txData, isLoading: isTxLoading } = useCustomerWalletTransactions(
    customerId,
    {
      page,
      limit: 10,
      ...(typeFilter !== "ALL" && { type: typeFilter as WalletTransactionType }),
      ...(ledgerDirection !== "ALL" && { direction: ledgerDirection as "IN" | "OUT" }),
      ...(ledgerSearch.trim() && { search: ledgerSearch.trim() }),
      ...ledgerDateParams,
    },
  );

  const { data: topupData, isLoading: isTopupLoading } = useCustomerTopups(
    customerId,
    {
      page: topupPage,
      limit: 10,
      ...(topupStatusFilter !== "ALL" && { status: topupStatusFilter }),
      ...(topupSearch.trim() && { search: topupSearch.trim() }),
      ...topupDateParams,
    },
  );

  const { data: withdrawalData, isLoading: isWithdrawalLoading } =
    useCustomerWithdrawals(customerId, { page: withdrawalPage, limit: 10 });

  const { data: serviceBreakdown, isLoading: isBreakdownLoading } =
    useCustomerServiceBreakdown(customerId, breakdownParams);

  const adjustMutation = useAdjustWallet();

  const handleAdjustSubmit = () => {
    const amount = Number(adjustAmount);
    if (!Number.isFinite(amount) || amount === 0) {
      toast.error("Số tiền điều chỉnh phải khác 0");
      return;
    }
    if (!adjustNote.trim()) {
      toast.error("Vui lòng nhập lý do điều chỉnh");
      return;
    }
    if (!overview?.walletId) {
      toast.error("Khách hàng chưa khởi tạo ví");
      return;
    }

    adjustMutation.mutate(
      {
        walletId: overview.walletId,
        amount,
        type: "ADJUSTMENT",
        description: adjustNote.trim(),
      },
      {
        onSuccess: () => {
          setAdjustOpen(false);
          setAdjustAmount("");
          setAdjustNote("");
        },
      },
    );
  };

  const renderPagination = (
    currentPage: number,
    totalPages: number,
    totalItems: number,
    onPageChange: (p: number) => void,
    unitLabel: string = "mục"
  ) => {
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
      const pages: (number | string)[] = [];
      const maxVisible = 5;
      if (totalPages <= maxVisible + 2) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        let start = Math.max(2, currentPage - 1);
        let end = Math.min(totalPages - 1, currentPage + 1);

        if (currentPage <= 3) {
          end = 4;
        } else if (currentPage >= totalPages - 2) {
          start = totalPages - 3;
        }

        if (start > 2) pages.push("...");
        for (let i = start; i <= end; i++) pages.push(i);
        if (end < totalPages - 1) pages.push("...");
        pages.push(totalPages);
      }
      return pages;
    };

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[var(--c-line)] text-xs text-[var(--c-muted)]">
        <div className="flex items-center gap-2">
          <span>
            Trang <strong className="text-[var(--c-primary-strong)] font-bold">{currentPage}</strong> / {totalPages}
          </span>
          <span className="text-[var(--c-line)]">|</span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--c-card-2)] border border-[var(--c-line)]">
            Tổng <strong className="mx-1 text-[var(--c-ink)]">{totalItems}</strong> {unitLabel}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            className="flex items-center justify-center size-8 rounded-xl border border-[var(--c-line)] bg-[var(--c-card)] text-[var(--c-ink)] hover:border-[var(--c-primary-strong)] hover:text-[var(--c-primary-strong)] disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer shadow-2xs"
            title="Trang trước"
          >
            <ChevronLeft className="size-4" />
          </button>

          {getPageNumbers().map((p, idx) =>
            typeof p === "number" ? (
              <button
                key={idx}
                type="button"
                onClick={() => onPageChange(p)}
                className={`flex items-center justify-center min-w-[32px] h-8 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  p === currentPage
                    ? "bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)] border border-[var(--c-primary-strong)]/30 shadow-2xs"
                    : "border border-[var(--c-line)] bg-[var(--c-card)] text-[var(--c-ink)] hover:border-[var(--c-primary-strong)] hover:text-[var(--c-primary-strong)]"
                }`}
              >
                {p}
              </button>
            ) : (
              <span key={idx} className="px-1 text-[var(--c-muted)] font-bold">
                ...
              </span>
            )
          )}

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="flex items-center justify-center size-8 rounded-xl border border-[var(--c-line)] bg-[var(--c-card)] text-[var(--c-ink)] hover:border-[var(--c-primary-strong)] hover:text-[var(--c-primary-strong)] disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer shadow-2xs"
            title="Trang sau"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Balance */}
        <div className="rounded-2xl border border-[var(--c-line)] bg-[var(--c-card)] p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--c-muted)]">
            <span className="flex items-center gap-1.5">
              <CreditCard className="size-4 text-[var(--c-primary-strong)]" /> Số dư khả dụng
            </span>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-700 bg-emerald-50 text-[10px]">
              VÍ DƯ
            </Badge>
          </div>
          <div className="mt-3">
            {isOverviewLoading ? (
              <Skeleton className="h-7 w-28 rounded-xl" />
            ) : (
              <p className="text-2xl font-black text-emerald-600 tracking-tight">
                {formatCurrency(overview?.balance)}
              </p>
            )}
          </div>
        </div>

        {/* Card 2: Hold Balance */}
        <div className="rounded-2xl border border-[var(--c-line)] bg-[var(--c-card)] p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--c-muted)]">
            <span className="flex items-center gap-1.5">
              <LockKeyhole className="size-4 text-amber-600" /> Đang giữ cọc (Hold)
            </span>
            <Badge variant="outline" className="border-amber-500/30 text-amber-700 bg-amber-50 text-[10px]">
              TẠM KHÓA
            </Badge>
          </div>
          <div className="mt-3">
            {isOverviewLoading ? (
              <Skeleton className="h-7 w-28 rounded-xl" />
            ) : (
              <p className="text-2xl font-black text-[var(--c-ink)] tracking-tight">
                {formatCurrency(overview?.holdBalance)}
              </p>
            )}
          </div>
        </div>

        {/* Card 3: Total Topup */}
        <div className="rounded-2xl border border-[var(--c-line)] bg-[var(--c-card)] p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--c-muted)]">
            <span className="flex items-center gap-1.5">
              <WalletCards className="size-4 text-blue-600" /> Tổng nạp PayPal
            </span>
            <span className="text-[10px] text-[var(--c-muted)] font-bold">
              {overview?.topupCount ?? 0} lượt nạp
            </span>
          </div>
          <div className="mt-3">
            {isOverviewLoading ? (
              <Skeleton className="h-7 w-28 rounded-xl" />
            ) : (
              <p className="text-2xl font-black text-[var(--c-ink)] tracking-tight">
                {formatCurrency(overview?.totalTopupVnd)}
              </p>
            )}
          </div>
        </div>

        {/* Card 4: Total Refunded */}
        <div className="rounded-2xl border border-[var(--c-line)] bg-[var(--c-card)] p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--c-muted)]">
            <span className="flex items-center gap-1.5">
              <RotateCcw className="size-4 text-purple-600" /> Hoàn bồi thường
            </span>
            <span className="text-[10px] text-[var(--c-muted)] font-bold">
              {overview?.withdrawalCount ?? 0} đơn rút
            </span>
          </div>
          <div className="mt-3">
            {isOverviewLoading ? (
              <Skeleton className="h-7 w-28 rounded-xl" />
            ) : (
              <p className="text-2xl font-black text-[var(--c-ink)] tracking-tight">
                {formatCurrency(overview?.totalRefunded)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--c-line)] pb-2">
        <button
          type="button"
          onClick={() => setSubTab("LEDGER")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            subTab === "LEDGER"
              ? "bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)] border border-[var(--c-primary-strong)]/30 shadow-2xs"
              : "bg-[var(--c-card)] text-[var(--c-muted)] hover:text-[var(--c-ink)] border border-[var(--c-line)]"
          }`}
        >
          <FileText className="size-3.5 inline mr-1.5" />
          Nhật ký biến động ví (Ledger)
        </button>

        <button
          type="button"
          onClick={() => setSubTab("TOPUPS")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            subTab === "TOPUPS"
              ? "bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)] border border-[var(--c-primary-strong)]/30 shadow-2xs"
              : "bg-[var(--c-card)] text-[var(--c-muted)] hover:text-[var(--c-ink)] border border-[var(--c-line)]"
          }`}
        >
          <WalletCards className="size-3.5 inline mr-1.5" />
          Lịch sử nạp PayPal ({overview?.topupCount ?? 0})
        </button>

        <button
          type="button"
          onClick={() => setSubTab("WITHDRAWALS")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            subTab === "WITHDRAWALS"
              ? "bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)] border border-[var(--c-primary-strong)]/30 shadow-2xs"
              : "bg-[var(--c-card)] text-[var(--c-muted)] hover:text-[var(--c-ink)] border border-[var(--c-line)]"
          }`}
        >
          <RotateCcw className="size-3.5 inline mr-1.5" />
          Lịch sử rút bồi thường ({overview?.withdrawalCount ?? 0})
        </button>

        <button
          type="button"
          onClick={() => setSubTab("SERVICES")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            subTab === "SERVICES"
              ? "bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)] border border-[var(--c-primary-strong)]/30 shadow-2xs"
              : "bg-[var(--c-card)] text-[var(--c-muted)] hover:text-[var(--c-ink)] border border-[var(--c-line)]"
          }`}
        >
          <BarChart3 className="size-3.5 inline mr-1.5" />
          Phân tích dịch vụ
        </button>
      </div>

      {/* Main Content Area based on SubTab */}
      {subTab === "LEDGER" && (
        <div className="rounded-2xl border border-[var(--c-line)] bg-[var(--c-card)] p-5 space-y-4 shadow-xs">
          <div className="flex flex-col gap-3 pb-3 border-b border-[var(--c-line)]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[var(--c-ink)] flex items-center gap-2">
                  <FileText className="size-4 text-[var(--c-primary-strong)]" />
                  Nhật ký biến động ví (Transaction Ledger)
                </h3>
                <p className="text-xs text-[var(--c-muted)] mt-0.5">
                  Toàn bộ lịch sử cộng/trừ tiền, nạp tiền và bồi thường của khách hàng.
                </p>
              </div>

              <Button
                size="sm"
                className="h-9 rounded-xl bg-[var(--c-primary-strong)] hover:bg-[var(--c-primary-strong)]/90 text-white font-semibold text-xs shadow-xs self-start sm:self-auto"
                onClick={() => setAdjustOpen(true)}
              >
                <PlusCircle className="size-3.5 mr-1" />
                Điều chỉnh / Bồi thường
              </Button>
            </div>

            {/* ── LEDGER Filters Toolbar (1-Row Ultra Compact) ────────────────── */}
            <div className="flex items-center gap-2 flex-wrap p-3 rounded-xl bg-[var(--c-card-2)] border border-[var(--c-line)] mt-1">
              {/* Ô Tìm kiếm */}
              <div className="relative flex-1 min-w-[180px]">
                <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-muted)] pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Tìm mã booking, mô tả..."
                  value={ledgerSearch}
                  onChange={(e) => { setLedgerSearch(e.target.value); setPage(1); }}
                  className="h-8 pl-8 pr-8 text-xs rounded-xl border-[var(--c-line)] bg-[var(--c-card)]"
                />
                {ledgerSearch && (
                  <button
                    type="button"
                    onClick={() => { setLedgerSearch(""); setPage(1); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--c-muted)] hover:text-[var(--c-ink)]"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Select Hướng tiền */}
              <Select value={ledgerDirection} onValueChange={(val) => { setLedgerDirection(val); setPage(1); }}>
                <SelectTrigger className="h-8 w-32 text-xs rounded-xl border-[var(--c-line)] bg-[var(--c-card)]">
                  <SelectValue placeholder="Chiều tiền" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả chiều tiền</SelectItem>
                  <SelectItem value="IN">
                    <ArrowUpRight className="size-3.5 mr-1.5 inline text-emerald-600" />
                    Cộng tiền (+)
                  </SelectItem>
                  <SelectItem value="OUT">
                    <ArrowDownLeft className="size-3.5 mr-1.5 inline text-rose-600" />
                    Trừ tiền (-)
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Select Loại giao dịch */}
              <Select value={typeFilter} onValueChange={(val) => { setTypeFilter(val); setPage(1); }}>
                <SelectTrigger className="h-8 w-36 text-xs rounded-xl border-[var(--c-line)] bg-[var(--c-card)]">
                  <SlidersHorizontal className="size-3.5 mr-1 text-[var(--c-muted)]" />
                  <SelectValue placeholder="Loại giao dịch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả loại</SelectItem>
                  <SelectItem value="DEPOSIT">Nạp tiền PayPal</SelectItem>
                  <SelectItem value="PAYMENT">Thanh toán đơn</SelectItem>
                  <SelectItem value="REFUND">Hoàn tiền đơn</SelectItem>
                  <SelectItem value="ADJUSTMENT">Điều chỉnh Admin</SelectItem>
                  <SelectItem value="DEPOSIT_HOLD">Giữ tiền cọc</SelectItem>
                </SelectContent>
              </Select>

              {/* Select Khoảng thời gian */}
              <Select
                value={ledgerPreset}
                onValueChange={(val) => {
                  setLedgerPreset(val);
                  if (val !== "CUSTOM") setLedgerDateRange({ from: "", to: "" });
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-40 text-xs rounded-xl border-[var(--c-line)] bg-[var(--c-card)]">
                  <CalendarDays className="size-3.5 mr-1 text-[var(--c-muted)]" />
                  <SelectValue placeholder="Thời gian" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả thời gian</SelectItem>
                  <SelectItem value="7D">7 ngày qua</SelectItem>
                  <SelectItem value="30D">30 ngày qua</SelectItem>
                  <SelectItem value="3M">3 tháng qua</SelectItem>
                  <SelectItem value="6M">6 tháng qua</SelectItem>
                  <SelectItem value="YEAR">Năm nay</SelectItem>
                  <SelectItem value="CUSTOM">
                    <CalendarRange className="size-3.5 mr-1.5 inline text-[var(--c-primary-strong)]" />
                    Tùy chỉnh ngày...
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Custom Date Range Popover — chỉ hiện khi chọn Tùy chỉnh */}
              {ledgerPreset === "CUSTOM" && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-[var(--c-muted)] whitespace-nowrap">Từ</span>
                  <Popover open={ledgerFromOpen} onOpenChange={setLedgerFromOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex h-8 items-center gap-1.5 rounded-xl border border-[var(--c-line)] bg-[var(--c-card)] px-2.5 text-[11px] font-semibold text-[var(--c-ink)] hover:border-[var(--c-primary-strong)]/60 transition-colors cursor-pointer"
                      >
                        <CalendarIcon className="size-3 text-[var(--c-primary-strong)]" />
                        <span>{ledgerDateRange.from ? formatDateDisplay(ledgerDateRange.from) : "Chọn ngày"}</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-0 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-2xl z-50">
                      <Calendar
                        mode="single"
                        selected={parseDateStr(ledgerDateRange.from)}
                        onSelect={(date) => {
                          setLedgerDateRange((prev) => ({ ...prev, from: date ? formatDateKey(date) : "" }));
                          setLedgerFromOpen(false);
                          setPage(1);
                        }}
                        disabled={(date) => date > new Date()}
                        className="rounded-2xl bg-white dark:bg-zinc-900"
                      />
                    </PopoverContent>
                  </Popover>

                  <span className="text-[var(--c-muted)] text-[11px]">–</span>

                  <span className="text-[10px] font-bold text-[var(--c-muted)] whitespace-nowrap">Đến</span>
                  <Popover open={ledgerToOpen} onOpenChange={setLedgerToOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex h-8 items-center gap-1.5 rounded-xl border border-[var(--c-line)] bg-[var(--c-card)] px-2.5 text-[11px] font-semibold text-[var(--c-ink)] hover:border-[var(--c-primary-strong)]/60 transition-colors cursor-pointer"
                      >
                        <CalendarIcon className="size-3 text-[var(--c-primary-strong)]" />
                        <span>{ledgerDateRange.to ? formatDateDisplay(ledgerDateRange.to) : "Chọn ngày"}</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-0 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-2xl z-50">
                      <Calendar
                        mode="single"
                        selected={parseDateStr(ledgerDateRange.to)}
                        onSelect={(date) => {
                          setLedgerDateRange((prev) => ({ ...prev, to: date ? formatDateKey(date) : "" }));
                          setLedgerToOpen(false);
                          setPage(1);
                        }}
                        disabled={(date) => {
                          const maxDate = new Date();
                          if (date > maxDate) return true;
                          if (ledgerDateRange.from) {
                            const fromDate = parseDateStr(ledgerDateRange.from);
                            if (fromDate && date < fromDate) return true;
                          }
                          return false;
                        }}
                        className="rounded-2xl bg-white dark:bg-zinc-900"
                      />
                    </PopoverContent>
                  </Popover>

                  {(ledgerDateRange.from || ledgerDateRange.to) && (
                    <button
                      type="button"
                      onClick={() => { setLedgerDateRange({ from: "", to: "" }); setPage(1); }}
                      className="p-1 rounded-md text-[var(--c-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="Xóa bộ lọc ngày"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Transactions Table */}
          {isTxLoading ? (
            <div className="space-y-2 py-4">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ) : !txData?.items || txData.items.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-[var(--c-line)] rounded-xl">
              <CircleDollarSign className="size-8 text-[var(--c-muted)] mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-[var(--c-ink)]">Chưa có giao dịch nào</p>
              <p className="text-xs text-[var(--c-muted)]">Khách hàng chưa phát sinh biến động số dư trong hệ thống.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--c-line)] text-[var(--c-muted)] font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Thời gian</th>
                    <th className="py-2.5 px-3">Loại</th>
                    <th className="py-2.5 px-3 text-right">Số tiền</th>
                    <th className="py-2.5 px-3 text-right">Số dư Sau</th>
                    <th className="py-2.5 px-3">Mô tả / Đơn hàng</th>
                    <th className="py-2.5 px-3 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--c-line)] text-[var(--c-ink)] font-medium">
                  {txData.items.map((tx) => {
                    const isOutgoing =
                      tx.type === "PAYMENT" ||
                      tx.type === "WITHDRAW" ||
                      tx.type === "DEPOSIT_HOLD" ||
                      tx.type === "DEPOSIT_DEDUCT" ||
                      tx.type === "CANCELLATION_FEE" ||
                      tx.type === "PLATFORM_FEE" ||
                      (tx.balanceAfter !== undefined &&
                        tx.balanceBefore !== undefined &&
                        Number(tx.balanceAfter) < Number(tx.balanceBefore));

                    const isPositive = !isOutgoing;
                    const typeConfig = TRANSACTION_TYPES[tx.type] ?? {
                      label: tx.type,
                      color: "bg-gray-100 text-gray-700",
                    };

                    return (
                      <tr key={tx.id} className="hover:bg-[var(--c-card-2)] transition-colors">
                        <td className="py-3 px-3 text-[var(--c-muted)] whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="size-3 text-[var(--c-muted)]" />
                            {new Date(tx.createdAt).toLocaleString("vi-VN")}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant="outline" className={`text-[10px] font-bold ${typeConfig.color}`}>
                            {typeConfig.label}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-right font-bold whitespace-nowrap">
                          <span className={isPositive ? "text-emerald-600" : "text-rose-600"}>
                            {isPositive ? "+" : "-"}
                            {formatCurrency(Math.abs(Number(tx.amount)))}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-[var(--c-ink-soft)] whitespace-nowrap">
                          {formatCurrency(tx.balanceAfter)}
                        </td>
                        <td className="py-3 px-3 max-w-xs truncate text-[var(--c-muted)]">
                          {tx.booking?.bookingCode ? (
                            <span className="font-bold text-[var(--c-primary-strong)] mr-1.5">
                              [{tx.booking.bookingCode}]
                            </span>
                          ) : null}
                          {tx.description || "N/A"}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTransactionId(tx.id);
                              setDrawerOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[var(--c-card-2)] border border-[var(--c-line)] hover:bg-[var(--c-primary-strong)] hover:text-white transition-all cursor-pointer shadow-2xs group"
                            title="Xem chi tiết trọn vẹn giao dịch"
                          >
                            <Eye className="size-3.5 text-[var(--c-primary-strong)] group-hover:text-white" />
                            Chi tiết
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Modern Pagination Controls */}
              {renderPagination(txData.page, txData.totalPages, txData.total, setPage, "giao dịch")}
            </div>
          )}
        </div>
      )}

      {/* SubTab TOPUPS View */}
      {subTab === "TOPUPS" && (
        <div className="rounded-2xl border border-[var(--c-line)] bg-[var(--c-card)] p-5 space-y-4 shadow-xs">
          <div className="pb-3 border-b border-[var(--c-line)]">
            <h3 className="text-base font-bold text-[var(--c-ink)] flex items-center gap-2">
              <WalletCards className="size-4 text-purple-600" />
              Lịch sử các lệnh Nạp tiền qua Cổng PayPal
            </h3>
            <p className="text-xs text-[var(--c-muted)] mt-0.5">
              Danh sách chi tiết các mã đơn PayPal Order, số tiền USD charge & số tiền VND quy đổi cộng vào ví.
            </p>
          </div>

          {/* Topup Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[var(--c-muted)]" />
              <Input
                placeholder="Tìm PayPal Order ID, Capture ID..."
                value={topupSearch}
                onChange={(e) => {
                  setTopupSearch(e.target.value);
                  setTopupPage(1);
                }}
                className="pl-9 h-8 text-xs rounded-xl border-[var(--c-line)] bg-[var(--c-card)]"
              />
              {topupSearch && (
                <button
                  type="button"
                  onClick={() => { setTopupSearch(""); setTopupPage(1); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--c-muted)] hover:text-slate-700"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Select Trạng thái */}
              <Select value={topupStatusFilter} onValueChange={(val) => { setTopupStatusFilter(val); setTopupPage(1); }}>
                <SelectTrigger className="h-8 w-36 text-xs rounded-xl border-[var(--c-line)] bg-[var(--c-card)]">
                  <SlidersHorizontal className="size-3.5 mr-1 text-[var(--c-muted)]" />
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                  <SelectItem value="COMPLETED">COMPLETED (Thành công)</SelectItem>
                  <SelectItem value="CREATED">CREATED (Khởi tạo)</SelectItem>
                  <SelectItem value="FAILED">FAILED (Thất bại)</SelectItem>
                  <SelectItem value="CANCELLED">CANCELLED (Đã hủy)</SelectItem>
                  <SelectItem value="EXPIRED">EXPIRED (Hết hạn)</SelectItem>
                </SelectContent>
              </Select>

              {/* Select Khoảng thời gian */}
              <Select
                value={topupPreset}
                onValueChange={(val) => {
                  setTopupPreset(val);
                  if (val !== "CUSTOM") setTopupDateRange({ from: "", to: "" });
                  setTopupPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-40 text-xs rounded-xl border-[var(--c-line)] bg-[var(--c-card)]">
                  <CalendarDays className="size-3.5 mr-1 text-[var(--c-muted)]" />
                  <SelectValue placeholder="Thời gian" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả thời gian</SelectItem>
                  <SelectItem value="7D">7 ngày qua</SelectItem>
                  <SelectItem value="30D">30 ngày qua</SelectItem>
                  <SelectItem value="3M">3 tháng qua</SelectItem>
                  <SelectItem value="6M">6 tháng qua</SelectItem>
                  <SelectItem value="YEAR">Năm nay</SelectItem>
                  <SelectItem value="CUSTOM">Tùy chọn ngày...</SelectItem>
                </SelectContent>
              </Select>

              {/* Custom Date Range Pickers */}
              {topupPreset === "CUSTOM" && (
                <div className="flex items-center gap-1 bg-[var(--c-card-2)] p-1 rounded-xl border border-[var(--c-line)]">
                  <span className="text-[10px] font-bold text-[var(--c-muted)] pl-1">Từ</span>
                  <Popover open={topupFromOpen} onOpenChange={setTopupFromOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex h-8 items-center gap-1.5 rounded-xl border border-[var(--c-line)] bg-[var(--c-card)] px-2.5 text-[11px] font-semibold text-[var(--c-ink)] hover:border-[var(--c-primary-strong)]/60 transition-colors cursor-pointer"
                      >
                        <CalendarIcon className="size-3 text-[var(--c-primary-strong)]" />
                        <span>{topupDateRange.from ? formatDateDisplay(topupDateRange.from) : "Chọn ngày"}</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-0 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-2xl z-50">
                      <Calendar
                        mode="single"
                        selected={parseDateStr(topupDateRange.from)}
                        onSelect={(date) => {
                          setTopupDateRange((prev) => ({ ...prev, from: date ? formatDateKey(date) : "" }));
                          setTopupFromOpen(false);
                          setTopupPage(1);
                        }}
                        disabled={(date) => date > new Date()}
                        className="rounded-2xl bg-white dark:bg-zinc-900"
                      />
                    </PopoverContent>
                  </Popover>

                  <span className="text-[var(--c-muted)] text-[11px]">–</span>

                  <span className="text-[10px] font-bold text-[var(--c-muted)]">Đến</span>
                  <Popover open={topupToOpen} onOpenChange={setTopupToOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex h-8 items-center gap-1.5 rounded-xl border border-[var(--c-line)] bg-[var(--c-card)] px-2.5 text-[11px] font-semibold text-[var(--c-ink)] hover:border-[var(--c-primary-strong)]/60 transition-colors cursor-pointer"
                      >
                        <CalendarIcon className="size-3 text-[var(--c-primary-strong)]" />
                        <span>{topupDateRange.to ? formatDateDisplay(topupDateRange.to) : "Chọn ngày"}</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-0 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-2xl z-50">
                      <Calendar
                        mode="single"
                        selected={parseDateStr(topupDateRange.to)}
                        onSelect={(date) => {
                          setTopupDateRange((prev) => ({ ...prev, to: date ? formatDateKey(date) : "" }));
                          setTopupToOpen(false);
                          setTopupPage(1);
                        }}
                        disabled={(date) => date > new Date()}
                        className="rounded-2xl bg-white dark:bg-zinc-900"
                      />
                    </PopoverContent>
                  </Popover>

                  {(topupDateRange.from || topupDateRange.to) && (
                    <button
                      type="button"
                      onClick={() => { setTopupDateRange({ from: "", to: "" }); setTopupPage(1); }}
                      className="p-1 rounded-md text-[var(--c-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {isTopupLoading ? (
            <div className="space-y-2 py-4">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ) : !topupData?.items || topupData.items.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-[var(--c-line)] rounded-xl">
              <WalletCards className="size-8 text-[var(--c-muted)] mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-[var(--c-ink)]">Chưa có lệnh nạp PayPal nào</p>
              <p className="text-xs text-[var(--c-muted)]">Không tìm thấy dữ liệu phù hợp với bộ lọc.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--c-line)] text-[var(--c-muted)] font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Thời gian</th>
                    <th className="py-2.5 px-3">PayPal Order ID</th>
                    <th className="py-2.5 px-3 text-right">Số tiền USD</th>
                    <th className="py-2.5 px-3 text-right">Quy đổi VND</th>
                    <th className="py-2.5 px-3 text-right">Tỷ giá</th>
                    <th className="py-2.5 px-3 text-center">Trạng thái</th>
                    <th className="py-2.5 px-3 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--c-line)] text-[var(--c-ink)] font-medium">
                  {topupData.items.map((tp) => (
                    <tr key={tp.id} className="hover:bg-[var(--c-card-2)] transition-colors">
                      <td className="py-3 px-3 text-[var(--c-muted)] whitespace-nowrap">
                        {new Date(tp.createdAt).toLocaleString("vi-VN")}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-[var(--c-primary-strong)]">
                        {tp.paypalOrderId || tp.id.slice(0, 8)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-blue-600">
                        ${Number(tp.amountUsd).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-600">
                        +{formatCurrency(tp.amountVnd)}
                      </td>
                      <td className="py-3 px-3 text-right text-[var(--c-muted)]">
                        {formatCurrency(tp.fxRate)} / USD
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge
                          variant="outline"
                          className={
                            tp.status === "COMPLETED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : tp.status === "FAILED"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }
                        >
                          {tp.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {tp.walletTxId ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTransactionId(tp.walletTxId ?? null);
                              setDrawerOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[var(--c-card-2)] border border-[var(--c-line)] hover:bg-[var(--c-primary-strong)] hover:text-white transition-all cursor-pointer shadow-2xs group"
                            title="Xem chi tiết trọn vẹn lệnh nạp"
                          >
                            <Eye className="size-3.5 text-[var(--c-primary-strong)] group-hover:text-white" />
                            Chi tiết
                          </button>
                        ) : (
                          <span className="text-[11px] text-[var(--c-muted)]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {renderPagination(topupData.page, topupData.totalPages, topupData.total, setTopupPage, "đơn nạp")}
            </div>
          )}
        </div>
      )}

      {/* SubTab WITHDRAWALS View */}
      {subTab === "WITHDRAWALS" && (
        <div className="rounded-2xl border border-[var(--c-line)] bg-[var(--c-card)] p-5 space-y-4 shadow-xs">
          <div className="pb-3 border-b border-[var(--c-line)]">
            <h3 className="text-base font-bold text-[var(--c-ink)] flex items-center gap-2">
              <RotateCcw className="size-4 text-purple-600" />
              Lịch sử các yêu cầu Rút tiền bồi thường
            </h3>
            <p className="text-xs text-[var(--c-muted)] mt-0.5">
              Theo dõi danh sách khách xin rút tiền bồi thường từ ví CleanZ về tài khoản ngân hàng cá nhân.
            </p>
          </div>

          {isWithdrawalLoading ? (
            <div className="space-y-2 py-4">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ) : !withdrawalData?.items || withdrawalData.items.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-[var(--c-line)] rounded-xl">
              <RotateCcw className="size-8 text-[var(--c-muted)] mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-[var(--c-ink)]">Chưa có yêu cầu rút tiền nào</p>
              <p className="text-xs text-[var(--c-muted)]">Khách hàng chưa gửi yêu cầu rút tiền bồi thường về ngân hàng.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--c-line)] text-[var(--c-muted)] font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Thời gian</th>
                    <th className="py-2.5 px-3">Ngân hàng</th>
                    <th className="py-2.5 px-3">Số tài khoản</th>
                    <th className="py-2.5 px-3 text-right">Số tiền rút</th>
                    <th className="py-2.5 px-3 text-center">Trạng thái</th>
                    <th className="py-2.5 px-3">Ghi chú Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--c-line)] text-[var(--c-ink)] font-medium">
                  {withdrawalData.items.map((wd) => (
                    <tr key={wd.id} className="hover:bg-[var(--c-card-2)] transition-colors">
                      <td className="py-3 px-3 text-[var(--c-muted)] whitespace-nowrap">
                        {new Date(wd.createdAt).toLocaleString("vi-VN")}
                      </td>
                      <td className="py-3 px-3 font-bold">{wd.bankName || "—"}</td>
                      <td className="py-3 px-3 font-mono">{wd.bankAccount || "—"}</td>
                      <td className="py-3 px-3 text-right font-bold text-rose-600">
                        {formatCurrency(wd.amount)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge
                          variant="outline"
                          className={
                            wd.status === "APPROVED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : wd.status === "REJECTED"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }
                        >
                          {wd.status === "APPROVED"
                            ? "ĐÃ DUYỆT"
                            : wd.status === "REJECTED"
                            ? "TỪ CHỐI"
                            : "CHỜ DUYỆT"}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-[var(--c-muted)] max-w-xs truncate">
                        {wd.adminNote || wd.note || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {renderPagination(withdrawalData.page, withdrawalData.totalPages, withdrawalData.total, setWithdrawalPage, "đơn rút")}
            </div>
          )}
        </div>
      )}

      {/* ── Sub-tab: Phân tích Dịch vụ ───────────────────────────────────────── */}
      {subTab === "SERVICES" && (
        <div className="rounded-2xl border border-[var(--c-line)] bg-[var(--c-card)] p-5 space-y-5 shadow-xs">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 pb-4 border-b border-[var(--c-line)]">
            <div>
              <h3 className="text-base font-bold text-[var(--c-ink)] flex items-center gap-2">
                <BarChart3 className="size-4 text-[var(--c-primary-strong)]" />
                Phân tích Chi tiêu theo Dịch vụ
              </h3>
              <p className="text-xs text-[var(--c-muted)] mt-1">
                Xếp hạng dịch vụ theo tổng tiền khách đã chi — chỉ tính đơn{" "}
                <span className="font-semibold text-emerald-600">HOÀN THÀNH</span>.
              </p>
            </div>
          </div>

          {/* ── Filter bar (Ultra Compact Select + Mode Switcher) ──────────── */}
          <div className="flex items-center gap-2.5 flex-wrap p-3 rounded-xl bg-[var(--c-card-2)] border border-[var(--c-line)]">
            {/* Select Khoảng thời gian */}
            <Select
              value={breakdownPreset}
              onValueChange={(val) => {
                setBreakdownPreset(val);
                if (val !== "CUSTOM") setBreakdownDateRange({ from: "", to: "" });
              }}
            >
              <SelectTrigger className="h-8 w-40 text-xs rounded-xl border-[var(--c-line)] bg-[var(--c-card)]">
                <CalendarDays className="size-3.5 mr-1 text-[var(--c-muted)]" />
                <SelectValue placeholder="Thời gian" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả thời gian</SelectItem>
                <SelectItem value="7D">7 ngày qua</SelectItem>
                <SelectItem value="30D">30 ngày qua</SelectItem>
                <SelectItem value="3M">3 tháng qua</SelectItem>
                <SelectItem value="6M">6 tháng qua</SelectItem>
                <SelectItem value="YEAR">Năm nay</SelectItem>
                <SelectItem value="CUSTOM">
                  <CalendarRange className="size-3.5 mr-1.5 inline text-[var(--c-primary-strong)]" />
                  Tùy chỉnh ngày...
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Custom date inputs — chỉ hiện khi chọn Tùy chỉnh */}
            {breakdownPreset === "CUSTOM" && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* From Date Popover */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-[var(--c-muted)] whitespace-nowrap">Từ</span>
                  <Popover open={fromOpen} onOpenChange={setFromOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex h-7 items-center gap-1.5 rounded-xl border border-[var(--c-line)] bg-[var(--c-card)] px-2.5 text-[11px] font-semibold text-[var(--c-ink)] hover:border-[var(--c-primary-strong)]/60 transition-colors cursor-pointer"
                      >
                        <CalendarIcon className="size-3 text-[var(--c-primary-strong)]" />
                        <span>{breakdownDateRange.from ? formatDateDisplay(breakdownDateRange.from) : "Chọn ngày"}</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-0 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-2xl z-50">
                      <Calendar
                        mode="single"
                        selected={parseDateStr(breakdownDateRange.from)}
                        onSelect={(date) => {
                          if (date) {
                            setBreakdownDateRange((prev) => ({ ...prev, from: formatDateKey(date) }));
                          } else {
                            setBreakdownDateRange((prev) => ({ ...prev, from: "" }));
                          }
                          setFromOpen(false);
                        }}
                        disabled={(date) => date > new Date()}
                        className="rounded-2xl bg-white dark:bg-zinc-900"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <span className="text-[var(--c-muted)] text-[11px]">–</span>

                {/* To Date Popover */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-[var(--c-muted)] whitespace-nowrap">Đến</span>
                  <Popover open={toOpen} onOpenChange={setToOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex h-7 items-center gap-1.5 rounded-xl border border-[var(--c-line)] bg-[var(--c-card)] px-2.5 text-[11px] font-semibold text-[var(--c-ink)] hover:border-[var(--c-primary-strong)]/60 transition-colors cursor-pointer"
                      >
                        <CalendarIcon className="size-3 text-[var(--c-primary-strong)]" />
                        <span>{breakdownDateRange.to ? formatDateDisplay(breakdownDateRange.to) : "Chọn ngày"}</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-0 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-2xl z-50">
                      <Calendar
                        mode="single"
                        selected={parseDateStr(breakdownDateRange.to)}
                        onSelect={(date) => {
                          if (date) {
                            setBreakdownDateRange((prev) => ({ ...prev, to: formatDateKey(date) }));
                          } else {
                            setBreakdownDateRange((prev) => ({ ...prev, to: "" }));
                          }
                          setToOpen(false);
                        }}
                        disabled={(date) => {
                          const maxDate = new Date();
                          if (date > maxDate) return true;
                          if (breakdownDateRange.from) {
                            const fromDate = parseDateStr(breakdownDateRange.from);
                            if (fromDate && date < fromDate) return true;
                          }
                          return false;
                        }}
                        className="rounded-2xl bg-white dark:bg-zinc-900"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {(breakdownDateRange.from || breakdownDateRange.to) && (
                  <button
                    type="button"
                    onClick={() => setBreakdownDateRange({ from: "", to: "" })}
                    className="p-1 rounded-md text-[var(--c-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                    title="Xóa bộ lọc ngày"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Mode Switcher: Danh sách vs Biểu đồ uốn lượn */}
            <div className="flex items-center gap-1 p-0.5 rounded-xl bg-[var(--c-card)] border border-[var(--c-line)] ml-auto">
              <button
                type="button"
                onClick={() => setServiceViewMode("LIST")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  serviceViewMode === "LIST"
                    ? "bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)] border border-[var(--c-primary-strong)]/30 shadow-2xs"
                    : "text-[var(--c-muted)] hover:text-[var(--c-ink)]"
                }`}
              >
                <List className="size-3.5" />
                Danh sách
              </button>
              <button
                type="button"
                onClick={() => setServiceViewMode("CHART")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  serviceViewMode === "CHART"
                    ? "bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)] border border-[var(--c-primary-strong)]/30 shadow-2xs"
                    : "text-[var(--c-muted)] hover:text-[var(--c-ink)]"
                }`}
              >
                <TrendingUp className="size-3.5" />
                Biểu đồ uốn lượn
              </button>
            </div>
          </div>

          {isBreakdownLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-2xl" />
              ))}
            </div>
          ) : !serviceBreakdown || serviceBreakdown.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[var(--c-card-2)] border border-[var(--c-line)] flex items-center justify-center">
                <PackageOpen className="size-8 text-[var(--c-muted)]" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-[var(--c-ink)]">Chưa có đơn dịch vụ nào</p>
                <p className="text-xs text-[var(--c-muted)] mt-1 max-w-xs">
                  Khách hàng này chưa thực hiện hoặc chưa có đơn nào hoàn thành.
                </p>
              </div>
            </div>
          ) : (() => {
            const totalCompleted = serviceBreakdown.reduce((s, r) => s + r.completedBookings, 0);
            const totalBookingsAll = serviceBreakdown.reduce((s, r) => s + r.totalBookings, 0);
            const grandSpent = serviceBreakdown.reduce((s, r) => s + r.totalSpent, 0);
            const overallCompletionRate = totalBookingsAll > 0
              ? Math.round((totalCompleted / totalBookingsAll) * 100)
              : 0;

            const RANK_CONFIG = [
              { bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-100 text-amber-700", bar: "from-amber-400 to-amber-500", medal: "🥇" },
              { bg: "bg-slate-50", border: "border-slate-200", badge: "bg-slate-100 text-slate-600", bar: "from-slate-400 to-slate-500", medal: "🥈" },
              { bg: "bg-orange-50", border: "border-orange-200", badge: "bg-orange-100 text-orange-700", bar: "from-orange-400 to-orange-500", medal: "🥉" },
            ];

            return (
              <div className="space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Loại dịch vụ", value: serviceBreakdown.length, unit: "dịch vụ", color: "text-[var(--c-ink)]" },
                    { label: "Tổng đơn HT", value: totalCompleted, unit: "đơn", color: "text-emerald-600" },
                    { label: "Tỉ lệ hoàn thành", value: `${overallCompletionRate}%`, unit: "", color: overallCompletionRate >= 70 ? "text-emerald-600" : overallCompletionRate >= 40 ? "text-amber-600" : "text-red-500" },
                    { label: "Tổng đã chi", value: formatCurrency(grandSpent), unit: "", color: "text-[var(--c-ink)]" },
                  ].map((card) => (
                    <div key={card.label} className="rounded-xl border border-[var(--c-line)] bg-[var(--c-card-2)] p-3 text-center">
                      <p className="text-[10px] font-bold text-[var(--c-muted)] uppercase tracking-wider mb-1.5">{card.label}</p>
                      <p className={`text-lg font-black ${card.color} leading-tight`}>{card.value}</p>
                      {card.unit && <p className="text-[10px] text-[var(--c-muted)] mt-0.5">{card.unit}</p>}
                    </div>
                  ))}
                </div>

                {/* ── View Mode: Chart vs List ────────────────────────────── */}
                {serviceViewMode === "CHART" ? (
                  <div className="rounded-2xl border border-[var(--c-line)] bg-[var(--c-card-2)] p-5 space-y-4 shadow-2xs">
                    <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-[var(--c-line)]/60">
                      <div className="flex items-center gap-4 flex-wrap">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-[var(--c-ink)]">
                          <span className="w-3 h-3 rounded-md bg-[#fd7e14] inline-block shadow-2xs" />
                          Tổng chi tiêu (VND)
                        </span>

                        {(chartCurveMode === "BOTH" || chartCurveMode === "COMPLETED") && (
                          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block shadow-2xs" />
                            Đơn hoàn thành (đường xanh)
                          </span>
                        )}

                        {(chartCurveMode === "BOTH" || chartCurveMode === "CANCELLED") && (
                          <span className="flex items-center gap-1.5 text-xs font-bold text-rose-600">
                            <span className="w-3 h-3 rounded-full bg-rose-500 inline-block shadow-2xs" />
                            Đơn đã hủy (đường đỏ)
                          </span>
                        )}
                      </div>

                      {/* 3-way Curve Mode Selector */}
                      <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--c-card-2)] border border-[var(--c-line)] ml-auto">
                        <button
                          type="button"
                          onClick={() => setChartCurveMode("BOTH")}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            chartCurveMode === "BOTH"
                              ? "bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)] border border-[var(--c-primary-strong)]/30 shadow-2xs"
                              : "text-[var(--c-muted)] hover:text-[var(--c-ink)]"
                          }`}
                        >
                          <Layers className="size-3.5" />
                          Tất cả
                        </button>
                        <button
                          type="button"
                          onClick={() => setChartCurveMode("COMPLETED")}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            chartCurveMode === "COMPLETED"
                              ? "bg-emerald-600 text-white shadow-2xs"
                              : "text-[var(--c-muted)] hover:text-emerald-600"
                          }`}
                        >
                          <CheckCircle2 className="size-3.5" />
                          Đơn hoàn thành
                        </button>
                        <button
                          type="button"
                          onClick={() => setChartCurveMode("CANCELLED")}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            chartCurveMode === "CANCELLED"
                              ? "bg-rose-600 text-white shadow-2xs"
                              : "text-[var(--c-muted)] hover:text-rose-600"
                          }`}
                        >
                          <XCircle className="size-3.5" />
                          Đơn đã hủy
                        </button>
                      </div>
                    </div>

                    <div className="h-[340px] w-full pt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                          data={serviceBreakdown}
                          margin={{ top: 15, right: 10, bottom: 25, left: 10 }}
                        >
                          <defs>
                            <linearGradient id="spentBarGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#fd7e14" stopOpacity={0.9} />
                              <stop offset="100%" stopColor="#fd7e14" stopOpacity={0.3} />
                            </linearGradient>
                            <linearGradient id="curvedGreenAreaGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                              <stop offset="100%" stopColor="#10b981" stopOpacity={0.0} />
                            </linearGradient>
                            <linearGradient id="curvedRedAreaGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#ef4444" stopOpacity={0.35} />
                              <stop offset="100%" stopColor="#ef4444" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                          <XAxis
                            dataKey="serviceName"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: "var(--c-muted)" }}
                            dy={10}
                            interval={0}
                            tickFormatter={(val: string) => (val.length > 14 ? `${val.slice(0, 14)}...` : val)}
                          />
                          <YAxis
                            yAxisId="spent"
                            orientation="left"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: "var(--c-muted)" }}
                            tickFormatter={(v: number) => {
                              if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(".0", "")}tr`;
                              if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
                              return String(v);
                            }}
                          />
                          <YAxis
                            yAxisId="bookings"
                            orientation="right"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: "var(--c-muted)" }}
                            allowDecimals={false}
                          />
                          <RechartsTooltip
                            content={({ active, payload }) => {
                              if (!active || !payload || !payload.length) return null;
                              const data = payload[0].payload;
                              return (
                                <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3.5 shadow-2xl space-y-2 text-xs min-w-[210px] z-50">
                                  <p className="font-bold text-[var(--c-ink)] border-b border-[var(--c-line)] pb-1.5">{data.serviceName}</p>
                                  <div className="space-y-1 text-[11px]">
                                    <div className="flex justify-between gap-4">
                                      <span className="text-[var(--c-muted)]">Tổng chi tiêu:</span>
                                      <span className="font-black text-emerald-600">{formatCurrency(data.totalSpent)}</span>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                      <span className="text-[var(--c-muted)]">Đơn hoàn thành:</span>
                                      <span className="font-bold text-emerald-600">{data.completedBookings} đơn</span>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                      <span className="text-[var(--c-muted)]">Đơn đã hủy:</span>
                                      <span className="font-bold text-rose-500">{data.cancelledBookings} đơn</span>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                      <span className="text-[var(--c-muted)]">Tỷ trọng chi tiêu:</span>
                                      <span className="font-bold text-[var(--c-primary-strong)]">{data.spendingPercent}%</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }}
                          />
                          {/* Cột Chi tiêu */}
                          <Bar
                            yAxisId="spent"
                            dataKey="totalSpent"
                            fill="url(#spentBarGrad)"
                            radius={[8, 8, 0, 0]}
                            maxBarSize={45}
                          />
                          {/* Đường uốn lượn Đơn hoàn thành (Màu xanh Emerald) */}
                          {(chartCurveMode === "BOTH" || chartCurveMode === "COMPLETED") && (
                            <Area
                              yAxisId="bookings"
                              type="monotone"
                              dataKey="completedBookings"
                              fill="url(#curvedGreenAreaGrad)"
                              stroke="none"
                            />
                          )}
                          {(chartCurveMode === "BOTH" || chartCurveMode === "COMPLETED") && (
                            <Line
                              yAxisId="bookings"
                              type="monotone"
                              dataKey="completedBookings"
                              name="Đơn hoàn thành"
                              stroke="#10b981"
                              strokeWidth={3}
                              dot={{ r: 5, fill: "#10b981", strokeWidth: 2, stroke: "#ffffff" }}
                              activeDot={{ r: 7, fill: "#059669", strokeWidth: 2, stroke: "#ffffff" }}
                            />
                          )}

                          {/* Đường uốn lượn Đơn đã hủy (Màu đỏ Rose) */}
                          {(chartCurveMode === "BOTH" || chartCurveMode === "CANCELLED") && (
                            <Area
                              yAxisId="bookings"
                              type="monotone"
                              dataKey="cancelledBookings"
                              fill="url(#curvedRedAreaGrad)"
                              stroke="none"
                            />
                          )}
                          {(chartCurveMode === "BOTH" || chartCurveMode === "CANCELLED") && (
                            <Line
                              yAxisId="bookings"
                              type="monotone"
                              dataKey="cancelledBookings"
                              name="Đơn đã hủy"
                              stroke="#ef4444"
                              strokeWidth={3}
                              dot={{ r: 5, fill: "#ef4444", strokeWidth: 2, stroke: "#ffffff" }}
                              activeDot={{ r: 7, fill: "#dc2626", strokeWidth: 2, stroke: "#ffffff" }}
                            />
                          )}
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : (
                  /* Service Ranking List (Chế độ Danh sách hiện tại) */
                <div className="space-y-2.5">
                  {serviceBreakdown.map((item, index) => {
                    const rank = RANK_CONFIG[index] ?? {
                      bg: "bg-[var(--c-card)]",
                      border: "border-[var(--c-line)]",
                      badge: "bg-[var(--c-card-2)] text-[var(--c-muted)]",
                      bar: "from-[var(--c-primary-strong)] to-[var(--c-primary-strong)]",
                      medal: null,
                    };
                    const completionRate = item.totalBookings > 0
                      ? Math.round((item.completedBookings / item.totalBookings) * 100)
                      : 0;
                    const avgSpend = item.completedBookings > 0
                      ? item.totalSpent / item.completedBookings
                      : 0;

                    return (
                      <div
                        key={item.serviceId}
                        className={`p-4 rounded-2xl border ${rank.border} ${rank.bg} space-y-3 transition-all`}
                      >
                        {/* Row 1: Rank + Icon + Name + Spent */}
                        <div className="flex items-center gap-3">
                          {/* Rank number */}
                          <div className={`w-8 h-8 rounded-xl ${rank.badge} flex items-center justify-center shrink-0 font-black text-sm`}>
                            {rank.medal ?? `#${index + 1}`}
                          </div>

                          {/* Service icon */}
                          {item.iconUrl ? (
                            <img
                              src={item.iconUrl}
                              alt={item.serviceName}
                              className="w-10 h-10 rounded-xl object-cover border border-[var(--c-line)] shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-[var(--c-primary-soft)] flex items-center justify-center shrink-0">
                              <PackageOpen className="size-5 text-[var(--c-primary-strong)]" />
                            </div>
                          )}

                          {/* Name + meta */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-[var(--c-ink)] truncate">{item.serviceName}</p>
                            <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                              {/* Hoàn thành */}
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-700">
                                <ArrowUpRight className="size-3" />
                                {item.completedBookings} hoàn thành
                              </span>
                              {/* Đã hủy */}
                              {item.cancelledBookings > 0 ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-red-100 text-red-600">
                                  <ArrowDownLeft className="size-3" />
                                  {item.cancelledBookings} đã hủy
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-400">
                                  0 hủy
                                </span>
                              )}
                              {/* Completion rate nhỏ */}
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                                completionRate >= 80 ? "bg-emerald-50 text-emerald-600" :
                                completionRate >= 50 ? "bg-amber-50 text-amber-600" :
                                "bg-red-50 text-red-500"
                              }`}>
                                HT {completionRate}%
                              </span>
                            </div>
                          </div>

                          {/* Spent + percent */}
                          <div className="text-right shrink-0">
                            <p className="text-sm font-black text-emerald-600">{formatCurrency(item.totalSpent)}</p>
                            <p className="text-[11px] font-bold text-[var(--c-muted)] mt-0.5">{item.spendingPercent}%</p>
                          </div>
                        </div>

                        {/* Row 2: Progress bar */}
                        <div className="space-y-1">
                          <div className="w-full h-2.5 bg-white/60 rounded-full overflow-hidden border border-[var(--c-line)]/40">
                            <div
                              className={`h-full bg-gradient-to-r ${rank.bar} rounded-full transition-all duration-700`}
                              style={{ width: `${item.spendingPercent}%` }}
                            />
                          </div>
                        </div>

                        {/* Row 3: Avg spend + last date */}
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-[var(--c-muted)] flex items-center gap-1">
                            <CircleDollarSign className="size-3" />
                            Trung bình / đơn:{" "}
                            <span className="font-bold text-[var(--c-ink)]">{formatCurrency(avgSpend)}</span>
                          </span>
                          {item.lastBookedAt && (
                            <span className="text-[10px] text-[var(--c-muted)] flex items-center gap-1">
                              <Clock className="size-3" />
                              Lần cuối: {new Date(item.lastBookedAt).toLocaleDateString("vi-VN")}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Adjust Balance Dialog */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="cz-admin sm:max-w-md bg-[var(--c-card)] text-[var(--c-ink)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-[var(--c-ink)] font-bold">
              <CircleDollarSign className="size-5 text-[var(--c-primary-strong)]" />
              Điều chỉnh số dư ví Customer
            </DialogTitle>
            <DialogDescription className="text-xs text-[var(--c-muted)]">
              Nhập số tiền cần cộng (dương) hoặc trừ (âm) kèm lý do đối soát.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-bold text-[var(--c-ink)] mb-1 block">
                Số tiền điều chỉnh (VND)
              </label>
              <Input
                type="number"
                placeholder="VD: 100000 (Cộng) hoặc -50000 (Trừ)"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                className="rounded-xl border-[var(--c-line)] text-sm"
              />
              <p className="text-[11px] text-[var(--c-muted)] mt-1">
                Nhập số dương để cộng tiền bồi thường, nhập số âm để trừ tiền.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-[var(--c-ink)] mb-1 block">
                Lý do điều chỉnh (Bắt buộc)
              </label>
              <Textarea
                placeholder="Nhập lý do chi tiết (VD: Bồi thường sự cố đơn BK-1002)..."
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                rows={3}
                className="rounded-xl border-[var(--c-line)] text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => setAdjustOpen(false)}
            >
              Hủy
            </Button>
            <Button
              size="sm"
              className="rounded-xl bg-[var(--c-primary-strong)] hover:bg-[var(--c-primary-strong)]/90 text-white font-bold"
              disabled={adjustMutation.isPending}
              onClick={handleAdjustSubmit}
            >
              {adjustMutation.isPending ? "Đang xử lý..." : "Xác nhận điều chỉnh"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Detail Sheet Drawer */}
      <TransactionDetailDrawer
        transactionId={selectedTransactionId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
