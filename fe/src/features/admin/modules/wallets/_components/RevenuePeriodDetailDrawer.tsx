"use client";

import { useMemo, useState } from "react";
import { format, endOfMonth, endOfWeek, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FileText, HandCoins, ReceiptText } from "lucide-react";
import { AdminSheet } from "@/components/admin";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAdminRevenuePayroll } from "../hooks/useAdminWallets";
import { useAdminBookingDetail } from "@/features/admin/modules/booking/hooks/useAdminBooking";
import { AdminBookingDetailModal } from "@/features/admin/modules/booking/_components/AdminBookingDetailModal";
import type { RevenueSummaryResponse } from "../types/wallet.types";
import { cn } from "@/lib/utils";

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

export function RevenuePeriodDetailDrawer({
  data,
  granularity,
  open,
  onClose,
}: Props) {
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
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  const { booking: selectedBookingDetail } =
    useAdminBookingDetail(selectedBookingId);

  if (data?.period !== prevPeriod) {
    setPrevPeriod(data?.period);
    setPage(1);
  }

  const { data: payrollData, isLoading } = useAdminRevenuePayroll({
    fromDate,
    toDate,
    limit: 10,
    page,
  });

  if (!data) return null;

  return (
    <>
      <AdminSheet
        open={open}
        onOpenChange={onClose}
        widthClassName="sm:max-w-2xl w-full"
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
        {/* KPI Top Cards */}
        <div className="p-6 border-b border-[var(--c-line)] bg-[var(--c-card)]">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-100/50">
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600 mb-1">
                Doanh thu (Gross)
              </p>
              <p className="text-base font-black text-blue-700">
                {formatCurrency(Number(data.totalRevenue))}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-100/50">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600 mb-1">
                Tasker (Net)
              </p>
              <p className="text-base font-black text-amber-700">
                {formatCurrency(Number(data.totalTaskerEarnings))}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-100/50">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 mb-1">
                Hoa hồng (Fee)
              </p>
              <p className="text-base font-black text-emerald-700">
                {formatCurrency(Number(data.totalPlatformCommission))}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-100/50">
              <p className="text-[11px] font-bold uppercase tracking-wider text-purple-600 mb-1">
                Đơn hoàn thành
              </p>
              <p className="text-base font-black text-purple-700">
                {Number(data.totalTransactions).toLocaleString("vi-VN")} đơn
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Payroll List */}
        <ScrollArea className="flex-1 p-6">
          <h4 className="text-sm font-bold text-[var(--c-ink)] mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[var(--c-primary)]" />
            Bảng kê các đơn hàng trong kỳ (Trang {page})
          </h4>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-24 bg-[var(--c-card-2)] animate-pulse rounded-xl"
                />
              ))}
            </div>
          ) : payrollData?.items && payrollData.items.length > 0 ? (
            <div className="space-y-3">
              {payrollData.items.map((item) => (
                <div
                  key={item.bookingId}
                  className="p-4 rounded-xl bg-[var(--c-card)] border border-[var(--c-line)] hover:border-[var(--c-line-strong)] transition-colors shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--c-line)] pb-2.5 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-[var(--c-ink)] text-sm">
                        {item.bookingCode}
                      </span>
                      <span className="text-xs text-[var(--c-muted)]">
                        • {fmtDateTime(item.completedAt)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedBookingId(item.bookingId)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-[var(--c-primary-strong)] bg-[var(--c-primary-soft)] hover:bg-[var(--c-primary)] hover:text-white transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Chi tiết
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs mb-3">
                    <div>
                      <span className="text-[var(--c-muted)] block text-[11px]">
                        Khách hàng
                      </span>
                      <span className="font-semibold text-[var(--c-ink)]">
                        {item.customerName}
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--c-muted)] block text-[11px]">
                        Tasker
                      </span>
                      <span className="font-semibold text-[var(--c-ink)]">
                        {item.taskerName}
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--c-muted)] block text-[11px]">
                        Dịch vụ
                      </span>
                      <span className="font-medium text-[var(--c-ink)]">
                        {item.serviceName}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-dashed border-[var(--c-line)] text-xs">
                    <div>
                      <span className="text-[var(--c-muted)]">Tổng (Gross): </span>
                      <span className="font-bold text-blue-600 tabular-nums">
                        {formatCurrency(item.totalPrice)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--c-muted)]">Tasker (Net): </span>
                      <span className="font-bold text-amber-600 tabular-nums">
                        {formatCurrency(item.taskerEarning)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--c-muted)]">Fee: </span>
                      <span className="font-bold text-emerald-600 tabular-nums">
                        {formatCurrency(item.platformCommission)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Pagination Controls */}
              {payrollData.totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[var(--c-line)] text-xs">
                  <span className="text-[var(--c-muted)]">
                    Trang <span className="font-bold text-[var(--c-ink)]">{page}</span> / <span className="font-bold text-[var(--c-ink)]">{payrollData.totalPages}</span> ({payrollData.total} đơn)
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={page === 1}
                      onClick={() => setPage(1)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg border border-[var(--c-line)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors bg-[var(--c-card)]"
                      title="Trang đầu"
                    >
                      <ChevronsLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={page === 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="w-7 h-7 flex items-center justify-center rounded-lg border border-[var(--c-line)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors bg-[var(--c-card)]"
                      title="Trang trước"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center gap-1 px-1">
                      {getPageNumbers(page, payrollData.totalPages).map((p, i) =>
                        typeof p === "number" ? (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPage(p)}
                            className={cn(
                              "w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-all duration-200",
                              page === p
                                ? "bg-[var(--c-primary)] text-white shadow-sm shadow-[var(--c-primary)]/30"
                                : "border border-[var(--c-line)] bg-[var(--c-card)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)]"
                            )}
                          >
                            {p}
                          </button>
                        ) : (
                          <span
                            key={`dots-${i}`}
                            className="px-0.5 text-xs text-[var(--c-muted)] font-bold select-none"
                          >
                            ...
                          </span>
                        )
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={page >= payrollData.totalPages}
                      onClick={() => setPage((p) => Math.min(payrollData.totalPages, p + 1))}
                      className="w-7 h-7 flex items-center justify-center rounded-lg border border-[var(--c-line)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors bg-[var(--c-card)]"
                      title="Trang tiếp"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={page >= payrollData.totalPages}
                      onClick={() => setPage(payrollData.totalPages)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg border border-[var(--c-line)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors bg-[var(--c-card)]"
                      title="Trang cuối"
                    >
                      <ChevronsRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-10 bg-[var(--c-card)] rounded-xl border border-[var(--c-line)] border-dashed">
              <HandCoins className="w-10 h-10 text-[var(--c-muted)]/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-[var(--c-muted)]">
                Không có đơn hàng nào trong kỳ này
              </p>
            </div>
          )}
        </ScrollArea>
      </AdminSheet>

      {/* Booking Detail Modal */}
      <AdminBookingDetailModal
        open={!!selectedBookingId}
        onOpenChange={(op) => {
          if (!op) setSelectedBookingId(null);
        }}
        booking={selectedBookingDetail ?? null}
      />
    </>
  );
}
