"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  slideInVariants,
  staggerContainerVariants,
  staggerItemFadeUpVariants,
} from "@/constants/motion";
import {
  Plus,
  ArrowDownToLine,
  ArrowUpRight,
  History,
  CreditCard,
  ChevronRight,
  ChevronLeft,
  Wallet,
  CalendarDays,
  X,
  AlertTriangle,
} from "lucide-react";
import {
  useCustomerWallet,
  useCustomerWalletTransactions,
} from "../hooks/useCustomerWallet";
import { useAuth } from "@/features/auth/hooks/auth.hooks";
import { useRef } from "react";
import { TopupDialog } from "./TopupDialog";
import { useCustomerAbsenceRestrictions } from "@/features/booking/hooks/useCustomerBooking";

const LIMIT = 10;

export const WalletDashboard = () => {
  const historyRef = useRef<HTMLDivElement>(null);

  const [page, setPage] = useState(1);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [topupOpen, setTopupOpen] = useState(false);

  const query = {
    page,
    limit: LIMIT,
    ...(fromDate && { fromDate }),
    ...(toDate && { toDate }),
  };

  const { data: user, isLoading: isUserLoading } = useAuth();
  const {
    data: wallet,
    isLoading: isWalletLoading,
    error: walletError,
  } = useCustomerWallet();
  const { data: transactionsData, isLoading: isTxLoading } =
    useCustomerWalletTransactions(query);
  const { data: absenceRestrictions } = useCustomerAbsenceRestrictions();

  const transactions = transactionsData?.items ?? [];
  const totalPages = transactionsData?.totalPages ?? 1;
  const total = transactionsData?.total ?? 0;
  const isLoading = isUserLoading || isWalletLoading;

  const formatDateTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const formatVND = (amount: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);

  const getTransactionDetails = (type: string, amount: number) => {
    switch (type) {
      case "DEPOSIT":
        return {
          bg: "bg-green-50 text-green-500 dark:bg-green-950/30 dark:text-green-400",
          icon: <ArrowDownToLine className="w-5 h-5" />,
          isPositive: true,
        };
      case "REFUND":
      case "DEPOSIT_RELEASE":
        return {
          bg: "bg-blue-50 text-blue-500 dark:bg-blue-950/30 dark:text-blue-400",
          icon: <ArrowDownToLine className="w-5 h-5" />,
          isPositive: true,
        };
      case "PAYMENT":
      case "CANCELLATION_FEE":
      case "DEPOSIT_HOLD":
      case "DEPOSIT_DEDUCT":
        return {
          bg: "bg-red-50 text-red-500 dark:bg-red-950/30 dark:text-red-400",
          icon: <ArrowUpRight className="w-5 h-5" />,
          isPositive: false,
        };
      case "ADJUSTMENT":
        return amount >= 0
          ? {
              bg: "bg-green-50 text-green-500 dark:bg-green-950/30 dark:text-green-400",
              icon: <ArrowDownToLine className="w-5 h-5" />,
              isPositive: true,
            }
          : {
              bg: "bg-red-50 text-red-500 dark:bg-red-950/30 dark:text-red-400",
              icon: <ArrowUpRight className="w-5 h-5" />,
              isPositive: false,
            };
      default:
        return amount >= 0
          ? {
              bg: "bg-green-50 text-green-500 dark:bg-green-950/30 dark:text-green-400",
              icon: <ArrowDownToLine className="w-5 h-5" />,
              isPositive: true,
            }
          : {
              bg: "bg-red-50 text-red-500 dark:bg-red-950/30 dark:text-red-400",
              icon: <ArrowUpRight className="w-5 h-5" />,
              isPositive: false,
            };
    }
  };

  const handleDepositClick = () => setTopupOpen(true);

  // [TẠM TẮT] Rút tiền phía Customer — nút gọi hàm này đã comment bên dưới.
  // const handleScrollToWithdrawal = () => {
  //   document
  //     .getElementById("withdrawal-section")
  //     ?.scrollIntoView({ behavior: "smooth", block: "start" });
  // };

  const handleScrollToHistory = () => {
    historyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const getCardSuffix = () => {
    if (wallet?.id) {
      const parts = wallet.id.split("-");
      return parts[parts.length - 1].substring(0, 4).toUpperCase();
    }
    return "8888";
  };

  const resetFilter = () => {
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  const hasFilter = Boolean(fromDate || toDate);

  if (walletError) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-4">
          <Wallet className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">
          Không thể tải thông tin ví
        </h2>
        <p className="text-muted-foreground max-w-xs mb-6">
          Đã xảy ra lỗi trong quá trình đồng bộ dữ liệu ví từ máy chủ.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:opacity-90 transition-opacity"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header & Card */}
      <div className="bg-primary px-4 pt-12 pb-24 rounded-b-[40px] relative">
        <h1 className="text-xl font-bold text-white mb-8 text-center">
          Ví CleanZ
        </h1>

        <motion.div
          variants={slideInVariants}
          initial="hidden"
          animate="visible"
          className="absolute left-4 right-4 top-28 bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 shadow-xl shadow-slate-900/20 text-white overflow-hidden"
        >
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-card/5 rounded-full blur-2xl"></div>
          <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-primary/20 rounded-full blur-2xl"></div>

          <div className="relative z-10">
            <div className="flex justify-between items-center mb-6">
              <span className="text-muted-foreground/80 font-medium text-sm">
                Số dư khả dụng
              </span>
              <CreditCard className="w-6 h-6 text-muted-foreground/80" />
            </div>

            {isLoading ? (
              <div className="h-9 w-48 bg-slate-700/50 rounded-lg animate-pulse mb-8"></div>
            ) : (
              <h2 className="text-3xl font-bold mb-8">
                {formatVND(wallet?.balance ?? 0)}
              </h2>
            )}

            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] text-muted-foreground/80 uppercase tracking-wider mb-1">
                  Chủ thẻ
                </p>
                {isLoading ? (
                  <div className="h-5 w-32 bg-slate-700/50 rounded animate-pulse"></div>
                ) : (
                  <p className="font-semibold tracking-wide truncate max-w-[200px]">
                    {user?.fullName?.toUpperCase() || "KHÁCH HÀNG CLEANZ"}
                  </p>
                )}
              </div>

              {isLoading ? (
                <div className="h-5 w-16 bg-slate-700/50 rounded animate-pulse"></div>
              ) : (
                <p className="font-mono text-muted-foreground/80">
                  **** {getCardSuffix()}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Spacer for overlapping card */}
      <div className="h-32"></div>

      {/* Quick Actions */}
      {Boolean(absenceRestrictions?.outstandingDebt) && (
        <div className="px-4 pb-6">
          <div className="mx-auto max-w-2xl rounded-3xl border border-rose-200 bg-rose-50 p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
                <AlertTriangle className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-rose-950">
                  Công nợ bồi hoàn còn lại
                </p>
                <p className="mt-1 text-2xl font-black tabular-nums text-rose-800">
                  {formatVND(absenceRestrictions?.outstandingDebt ?? 0)}
                </p>
                <p className="mt-2 text-xs leading-5 text-rose-800">
                  Tiền nạp vào ví sẽ tự động trả công nợ trước; phần còn lại mới
                  trở thành số dư khả dụng.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setTopupOpen(true)}
              className="mt-4 w-full rounded-2xl bg-rose-700 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-rose-700/20"
            >
              Nạp tiền để thanh toán
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="px-4 mb-8">
        <div className="bg-card rounded-2xl p-4 shadow-sm border border-border/50 flex justify-around">
          <button
            onClick={handleDepositClick}
            className="flex flex-col items-center gap-2 group cursor-pointer"
          >
            <div className="w-12 h-12 bg-green-50 text-green-600 dark:bg-green-950/20 dark:text-green-400 rounded-full flex items-center justify-center group-hover:bg-green-500 group-hover:text-white transition-colors">
              <Plus className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-foreground/90">
              Nạp tiền
            </span>
          </button>

          {/* [TẠM TẮT] Rút tiền phía Customer — xem ghi chú ở đầu
              be/src/modules/wallet/customer-withdrawal.controller.ts
          <button
            onClick={handleScrollToWithdrawal}
            className="flex flex-col items-center gap-2 group cursor-pointer"
          >
            <div className="w-12 h-12 bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 rounded-full flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
              <ArrowUpRight className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-foreground/90">
              Rút tiền
            </span>
          </button>
          */}

          <button
            onClick={handleScrollToHistory}
            className="flex flex-col items-center gap-2 group cursor-pointer"
          >
            <div className="w-12 h-12 bg-orange-50 text-primary dark:bg-orange-950/20 dark:text-orange-400 rounded-full flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
              <History className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-foreground/90">
              Lịch sử
            </span>
          </button>
        </div>
      </div>

      {/* Transactions List */}
      <div ref={historyRef} className="px-4 scroll-mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-foreground text-lg">
            Lịch sử giao dịch
          </h3>
          <span className="text-xs text-muted-foreground">
            {total} giao dịch
          </span>
        </div>

        {/* Date filter */}
        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="h-9 w-full rounded-xl border border-border bg-card pl-8 pr-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="Từ ngày"
            />
          </div>
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="h-9 w-full rounded-xl border border-border bg-card pl-8 pr-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="Đến ngày"
            />
          </div>
          {hasFilter && (
            <button
              onClick={resetFilter}
              className="col-span-2 flex items-center justify-center gap-1 rounded-xl border border-border bg-card py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="size-3" />
              Xóa bộ lọc
            </button>
          )}
        </div>

        {isTxLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="bg-card p-4 rounded-2xl border border-border/50 flex items-center gap-4 animate-pulse"
              >
                <div className="w-12 h-12 rounded-full bg-muted shrink-0"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/4"></div>
                </div>
                <div className="h-4 bg-muted rounded w-16"></div>
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="bg-card rounded-2xl p-8 text-center border border-border/50 flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-3">
              <History className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-foreground/80 mb-1">
              {hasFilter
                ? "Không có giao dịch trong khoảng này"
                : "Chưa có giao dịch nào"}
            </p>
            <p className="text-xs text-muted-foreground">
              {hasFilter
                ? "Thử chọn khoảng ngày khác."
                : "Các biến động số dư ví của bạn sẽ xuất hiện tại đây."}
            </p>
          </div>
        ) : (
          <motion.div
            variants={staggerContainerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            {transactions.map((tx) => {
              const details = getTransactionDetails(tx.type, tx.amount);
              return (
                <motion.div
                  key={tx.id}
                  variants={staggerItemFadeUpVariants}
                  className="bg-card p-4 rounded-2xl shadow-sm border border-border/50 flex items-center gap-4 hover:border-border transition-colors duration-255"
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${details.bg}`}
                  >
                    {details.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground text-sm leading-snug break-words">
                      {tx.description || "Giao dịch ví CleanZ"}
                    </p>
                    <p className="text-xs text-muted-foreground/80 mt-1">
                      {formatDateTime(tx.createdAt)}
                    </p>
                  </div>
                  <div
                    className={`font-bold shrink-0 text-sm ${
                      details.isPositive
                        ? "text-green-600 dark:text-green-400"
                        : "text-foreground"
                    }`}
                  >
                    {details.isPositive ? "+" : "-"}
                    {formatVND(Math.abs(tx.amount))}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium disabled:opacity-40 hover:bg-muted transition-colors"
            >
              <ChevronLeft className="size-3.5" />
              Trước
            </button>
            <span className="text-xs text-muted-foreground">
              Trang {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium disabled:opacity-40 hover:bg-muted transition-colors"
            >
              Tiếp
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        )}
      </div>

      <TopupDialog open={topupOpen} onClose={() => setTopupOpen(false)} />
    </div>
  );
};
