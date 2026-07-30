"use client";

import { useMemo, useState } from "react";
import { format, endOfMonth, endOfWeek, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { ArrowDownLeft, ArrowUpRight, CalendarClock, ReceiptText, WalletCards, X } from "lucide-react";
import {
  AdminSheet,
} from "@/components/admin";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWalletTransactions } from "../hooks/useAdminWallets";
import type { RevenueSummaryResponse, WalletTransactionType } from "../types/wallet.types";

interface Props {
  data: (RevenueSummaryResponse & { label: string }) | null;
  granularity: "day" | "week" | "month";
  open: boolean;
  onClose: () => void;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    val
  );

const TYPE_LABELS: Record<WalletTransactionType, string> = {
  DEPOSIT: "Nạp tiền",
  WITHDRAW: "Rút tiền",
  PAYMENT: "Thanh toán",
  REFUND: "Hoàn tiền",
  PLATFORM_FEE: "Phí nền tảng",
  TASKER_EARNING: "Thu nhập Tasker",
  DEPOSIT_HOLD: "Giữ tiền cọc",
  DEPOSIT_RELEASE: "Giải phóng tiền cọc",
  DEPOSIT_DEDUCT: "Khấu trừ tiền cọc",
  CANCELLATION_FEE: "Phí hủy",
  ADJUSTMENT: "Điều chỉnh",
};

export function RevenuePeriodDetailDrawer({ data, granularity, open, onClose }: Props) {
  const { fromDate, toDate } = useMemo(() => {
    if (!data?.period) return { fromDate: undefined, toDate: undefined };
    const d = parseISO(data.period);
    let end = d;
    if (granularity === "month") {
      end = endOfMonth(d);
    } else if (granularity === "week") {
      end = endOfWeek(d, { weekStartsOn: 1 });
    }
    return {
      fromDate: format(d, "yyyy-MM-dd"),
      toDate: format(end, "yyyy-MM-dd"),
    };
  }, [data, granularity]);

  const [page, setPage] = useState(1);
  const [prevPeriod, setPrevPeriod] = useState(data?.period);

  if (data?.period !== prevPeriod) {
    setPrevPeriod(data?.period);
    setPage(1);
  }

  const { data: txData, isLoading } = useWalletTransactions({
    fromDate,
    toDate,
    limit: 15,
    page,
  });

  if (!data) return null;

  return (
    <AdminSheet
      open={open}
      onOpenChange={onClose}
      widthClassName="sm:max-w-xl w-full"
      bodyClassName="p-0 flex flex-col bg-[var(--c-bg)]"
      title={
        <span className="flex items-center gap-2 text-xl font-black text-[var(--c-ink)]">
          <ReceiptText className="w-5 h-5 text-[var(--c-primary)]" />
          Chi tiết kỳ {data.label}
        </span>
      }
      description={
        fromDate && toDate && fromDate !== toDate
          ? `Từ ${format(parseISO(fromDate), "dd/MM/yyyy")} đến ${format(parseISO(toDate), "dd/MM/yyyy")}`
          : fromDate
          ? `Ngày ${format(parseISO(fromDate), "dd/MM/yyyy")}`
          : ""
      }
    >
      <div className="p-6 border-b border-[var(--c-line)] bg-[var(--c-card)]">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100/50">
            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600 mb-1">
              Doanh thu
            </p>
            <p className="text-lg font-black text-blue-700">
              {formatCurrency(Number(data.totalRevenue))}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100/50">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 mb-1">
              Phí nền tảng
            </p>
            <p className="text-lg font-black text-emerald-700">
              {formatCurrency(Number(data.totalPlatformCommission))}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-100/50">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600 mb-1">
              Thu nhập Tasker
            </p>
            <p className="text-lg font-black text-amber-700">
              {formatCurrency(Number(data.totalTaskerEarnings))}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-100/50">
            <p className="text-[11px] font-bold uppercase tracking-wider text-purple-600 mb-1">
              Giao dịch
            </p>
            <p className="text-lg font-black text-purple-700">
              {Number(data.totalTransactions).toLocaleString("vi-VN")} đơn
            </p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-6">
        <h4 className="text-sm font-bold text-[var(--c-ink)] mb-4 flex items-center gap-2">
          <WalletCards className="w-4 h-4 text-[var(--c-muted)]" />
          Giao dịch phát sinh (Trang {page})
        </h4>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-[var(--c-card-2)] animate-pulse rounded-xl" />
            ))}
          </div>
        ) : txData?.items && txData.items.length > 0 ? (
          <div className="space-y-3">
            {txData.items.map((tx) => {
              const isPositive =
                (tx.wallet?.ownerType === "SYSTEM" && ["PAYMENT", "PLATFORM_FEE", "CANCELLATION_FEE"].includes(tx.type)) ||
                (tx.wallet?.ownerType === "TASKER" && ["TASKER_EARNING", "DEPOSIT_RELEASE"].includes(tx.type));
              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-4 p-4 rounded-xl bg-[var(--c-card)] border border-[var(--c-line)] hover:border-[var(--c-line-strong)] transition-colors"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      isPositive ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                    }`}
                  >
                    {isPositive ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[var(--c-ink)] truncate">
                      {TYPE_LABELS[tx.type] || tx.type}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-[12px] text-[var(--c-muted)]">
                      <span className="flex items-center gap-1">
                        <CalendarClock className="w-3.5 h-3.5" />
                        {format(parseISO(tx.createdAt), "HH:mm dd/MM/yyyy", { locale: vi })}
                      </span>
                      {tx.booking?.bookingCode && (
                        <span className="flex items-center gap-1 font-medium text-[var(--c-primary)]">
                          <ReceiptText className="w-3.5 h-3.5" />
                          {tx.booking.bookingCode}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={`text-sm font-black tabular-nums ${
                        isPositive ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {isPositive ? "+" : "-"}
                      {formatCurrency(Math.abs(Number(tx.amount)))}
                    </p>
                    <p className="text-[11px] text-[var(--c-muted)] mt-1 truncate max-w-[100px]">
                      Ví {tx.wallet?.ownerType}
                    </p>
                  </div>
                </div>
              );
            })}
            
            {/* Pagination Controls */}
            {txData.totalPages > 1 && (
              <div className="flex flex-col items-center justify-center mt-6 pt-4 border-t border-[var(--c-line)] gap-3">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--c-line)] bg-[var(--c-card)] hover:bg-[var(--c-card-2)] disabled:opacity-50 disabled:pointer-events-none transition-colors text-[var(--c-muted)] hover:text-[var(--c-ink)]"
                    title="Trang trước"
                  >
                    <ArrowDownLeft className="w-4 h-4 rotate-45" />
                  </button>
                  
                  {Array.from({ length: txData.totalPages }, (_, i) => i + 1).map((pageNum) => {
                    // Show first, last, current, and +/- 1 from current
                    if (
                      pageNum === 1 ||
                      pageNum === txData.totalPages ||
                      Math.abs(pageNum - page) <= 1
                    ) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold transition-colors ${
                            page === pageNum
                              ? "bg-[var(--c-primary)] text-white border border-[var(--c-primary)]"
                              : "border border-[var(--c-line)] bg-[var(--c-card)] hover:bg-[var(--c-card-2)] text-[var(--c-muted)] hover:text-[var(--c-ink)]"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                    
                    // Show ellipsis
                    if (
                      pageNum === 2 && page > 3 ||
                      pageNum === txData.totalPages - 1 && page < txData.totalPages - 2
                    ) {
                      return (
                        <span key={pageNum} className="px-1 text-[var(--c-muted)]">...</span>
                      );
                    }
                    
                    return null;
                  })}

                  <button
                    onClick={() => setPage((p) => Math.min(txData.totalPages, p + 1))}
                    disabled={page >= txData.totalPages}
                    className="flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--c-line)] bg-[var(--c-card)] hover:bg-[var(--c-card-2)] disabled:opacity-50 disabled:pointer-events-none transition-colors text-[var(--c-muted)] hover:text-[var(--c-ink)]"
                    title="Trang sau"
                  >
                    <ArrowUpRight className="w-4 h-4 rotate-45" />
                  </button>
                </div>
                <p className="text-[12px] text-[var(--c-muted)]">
                  Hiển thị <span className="font-bold text-[var(--c-ink)]">{txData.items.length}</span> giao dịch trên tổng số <span className="font-bold text-[var(--c-ink)]">{txData.total}</span>
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-10 bg-[var(--c-card)] rounded-xl border border-[var(--c-line)] border-dashed">
            <ReceiptText className="w-10 h-10 text-[var(--c-line-strong)] mx-auto mb-3" />
            <p className="text-sm font-medium text-[var(--c-muted)]">
              Không có giao dịch nào trong kỳ này
            </p>
          </div>
        )}
      </ScrollArea>
    </AdminSheet>
  );
}
