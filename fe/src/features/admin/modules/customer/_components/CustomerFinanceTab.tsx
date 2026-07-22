"use client";

import React, { useState } from "react";
import {
  useCustomerWalletOverview,
  useCustomerWalletTransactions,
  useCustomerTopups,
  useCustomerWithdrawals,
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
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  customerId: string;
}

const TRANSACTION_TYPES: Record<string, { label: string; color: string }> = {
  PAYMENT: { label: "Thanh toán đơn", color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  REFUND: { label: "Hoàn tiền", color: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  TOPUP: { label: "Nạp tiền PayPal", color: "bg-purple-500/10 text-purple-600 border-purple-200" },
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
  const [subTab, setSubTab] = useState<"LEDGER" | "TOPUPS" | "WITHDRAWALS">("LEDGER");
  const [page, setPage] = useState(1);
  const [topupPage, setTopupPage] = useState(1);
  const [withdrawalPage, setWithdrawalPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNote, setAdjustNote] = useState("");

  const { data: overview, isLoading: isOverviewLoading } =
    useCustomerWalletOverview(customerId);

  const { data: txData, isLoading: isTxLoading } = useCustomerWalletTransactions(
    customerId,
    {
      page,
      limit: 10,
      ...(typeFilter !== "ALL" && { type: typeFilter as WalletTransactionType }),
    },
  );

  const { data: topupData, isLoading: isTopupLoading } = useCustomerTopups(
    customerId,
    { page: topupPage, limit: 10 },
  );

  const { data: withdrawalData, isLoading: isWithdrawalLoading } =
    useCustomerWithdrawals(customerId, { page: withdrawalPage, limit: 10 });

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
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            subTab === "LEDGER"
              ? "bg-[var(--c-primary-strong)] text-white shadow-xs"
              : "bg-[var(--c-card)] text-[var(--c-muted)] hover:text-[var(--c-ink)] border border-[var(--c-line)]"
          }`}
        >
          <FileText className="size-3.5 inline mr-1.5" />
          Nhật ký biến động ví (Ledger)
        </button>

        <button
          type="button"
          onClick={() => setSubTab("TOPUPS")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            subTab === "TOPUPS"
              ? "bg-[var(--c-primary-strong)] text-white shadow-xs"
              : "bg-[var(--c-card)] text-[var(--c-muted)] hover:text-[var(--c-ink)] border border-[var(--c-line)]"
          }`}
        >
          <WalletCards className="size-3.5 inline mr-1.5" />
          Lịch sử nạp PayPal ({overview?.topupCount ?? 0})
        </button>

        <button
          type="button"
          onClick={() => setSubTab("WITHDRAWALS")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            subTab === "WITHDRAWALS"
              ? "bg-[var(--c-primary-strong)] text-white shadow-xs"
              : "bg-[var(--c-card)] text-[var(--c-muted)] hover:text-[var(--c-ink)] border border-[var(--c-line)]"
          }`}
        >
          <RotateCcw className="size-3.5 inline mr-1.5" />
          Lịch sử rút bồi thường ({overview?.withdrawalCount ?? 0})
        </button>
      </div>

      {/* Main Content Area based on SubTab */}
      {subTab === "LEDGER" && (
        <div className="rounded-2xl border border-[var(--c-line)] bg-[var(--c-card)] p-5 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[var(--c-line)]">
            <div>
              <h3 className="text-base font-bold text-[var(--c-ink)] flex items-center gap-2">
                <FileText className="size-4 text-[var(--c-primary-strong)]" />
                Nhật ký biến động ví (Transaction Ledger)
              </h3>
              <p className="text-xs text-[var(--c-muted)] mt-0.5">
                Toàn bộ lịch sử cộng/trừ tiền, nạp tiền và bồi thường của khách hàng.
              </p>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <Select value={typeFilter} onValueChange={(val) => { setTypeFilter(val); setPage(1); }}>
                <SelectTrigger className="h-9 w-40 text-xs rounded-xl border-[var(--c-line)]">
                  <SlidersHorizontal className="size-3.5 mr-1 text-[var(--c-muted)]" />
                  <SelectValue placeholder="Loại giao dịch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả loại</SelectItem>
                  <SelectItem value="TOPUP">Nạp tiền PayPal</SelectItem>
                  <SelectItem value="PAYMENT">Thanh toán đơn</SelectItem>
                  <SelectItem value="REFUND">Hoàn tiền đơn</SelectItem>
                  <SelectItem value="ADJUSTMENT">Điều chỉnh Admin</SelectItem>
                </SelectContent>
              </Select>

              <Button
                size="sm"
                className="h-9 rounded-xl bg-[var(--c-primary-strong)] hover:bg-[var(--c-primary-strong)]/90 text-white font-semibold text-xs shadow-xs"
                onClick={() => setAdjustOpen(true)}
              >
                <PlusCircle className="size-3.5 mr-1" />
                Điều chỉnh / Bồi thường
              </Button>
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--c-line)] text-[var(--c-ink)] font-medium">
                  {txData.items.map((tx) => {
                    const isPositive = Number(tx.amount) > 0;
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
                            {isPositive ? "+" : ""}
                            {formatCurrency(tx.amount)}
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination Controls */}
              {txData.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-[var(--c-line)] text-xs text-[var(--c-muted)]">
                  <span>
                    Trang {txData.page} / {txData.totalPages} ({txData.total} giao dịch)
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg text-xs"
                      disabled={page === 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Trước
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg text-xs"
                      disabled={page >= txData.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Sau
                    </Button>
                  </div>
                </div>
              )}
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

          {isTopupLoading ? (
            <div className="space-y-2 py-4">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ) : !topupData?.items || topupData.items.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-[var(--c-line)] rounded-xl">
              <WalletCards className="size-8 text-[var(--c-muted)] mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-[var(--c-ink)]">Chưa có lệnh nạp PayPal nào</p>
              <p className="text-xs text-[var(--c-muted)]">Khách hàng chưa thực hiện nạp tiền qua cổng PayPal.</p>
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
                    </tr>
                  ))}
                </tbody>
              </table>

              {topupData.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-[var(--c-line)] text-xs text-[var(--c-muted)]">
                  <span>Trang {topupData.page} / {topupData.totalPages} ({topupData.total} đơn nạp)</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg text-xs"
                      disabled={topupPage === 1}
                      onClick={() => setTopupPage((p) => Math.max(1, p - 1))}
                    >
                      Trước
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg text-xs"
                      disabled={topupPage >= topupData.totalPages}
                      onClick={() => setTopupPage((p) => p + 1)}
                    >
                      Sau
                    </Button>
                  </div>
                </div>
              )}
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

              {withdrawalData.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-[var(--c-line)] text-xs text-[var(--c-muted)]">
                  <span>Trang {withdrawalData.page} / {withdrawalData.totalPages} ({withdrawalData.total} đơn rút)</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg text-xs"
                      disabled={withdrawalPage === 1}
                      onClick={() => setWithdrawalPage((p) => Math.max(1, p - 1))}
                    >
                      Trước
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg text-xs"
                      disabled={withdrawalPage >= withdrawalData.totalPages}
                      onClick={() => setWithdrawalPage((p) => p + 1)}
                    >
                      Sau
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
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
    </div>
  );
}
