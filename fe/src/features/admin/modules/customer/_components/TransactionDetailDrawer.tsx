"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useAdminTransactionDetail } from "@/features/admin/modules/wallets/hooks/useAdminWallets";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  Package,
  User,
  Receipt,
  MapPin,
  CalendarDays,
  ExternalLink,
} from "lucide-react";

import { useState } from "react";
import { AdminBookingDetailModal } from "@/features/admin/modules/booking/_components/AdminBookingDetailModal";
import { useAdminBookingDetail } from "@/features/admin/modules/booking/hooks/useAdminBooking";

interface TransactionDetailDrawerProps {
  transactionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "0 đ";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(num);
}

export function TransactionDetailDrawer({
  transactionId,
  open,
  onOpenChange,
}: TransactionDetailDrawerProps) {
  const router = useRouter();
  const { data: detail, isLoading } = useAdminTransactionDetail(transactionId);

  const [selectedBookingIdForDetail, setSelectedBookingIdForDetail] = useState<string | null>(null);
  const [bookingDetailModalOpen, setBookingDetailModalOpen] = useState(false);
  const { booking: detailedBooking } = useAdminBookingDetail(selectedBookingIdForDetail);

  const isOutgoing =
    detail &&
    (detail.type === "PAYMENT" ||
      detail.type === "WITHDRAW" ||
      detail.type === "DEPOSIT_HOLD" ||
      detail.type === "DEPOSIT_DEDUCT" ||
      detail.type === "CANCELLATION_FEE" ||
      detail.type === "PLATFORM_FEE" ||
      detail.balanceAfter < detail.balanceBefore);

  const isIncoming = !isOutgoing;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="cz-admin w-full sm:max-w-lg bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 p-0 border-l border-slate-200 dark:border-zinc-800 shadow-2xl z-50 overflow-y-auto"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/50">
          <SheetHeader>
            <div className="flex items-center gap-2">
              <Receipt className="size-5 text-[var(--c-primary-strong)]" />
              <SheetTitle className="text-lg font-bold text-slate-900 dark:text-zinc-100">
                Chi tiết Giao dịch Ví
              </SheetTitle>
            </div>
            <SheetDescription className="text-xs text-slate-500 dark:text-zinc-400">
              Mã GD: <span className="font-mono text-slate-700 dark:text-zinc-300 font-semibold">{transactionId ?? "—"}</span>
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-28 w-full rounded-2xl" />
              <Skeleton className="h-44 w-full rounded-2xl" />
              <Skeleton className="h-36 w-full rounded-2xl" />
            </div>
          ) : !detail ? (
            <div className="py-12 text-center text-slate-500">
              Không tìm thấy thông tin chi tiết giao dịch.
            </div>
          ) : (
            <>
              {/* Card 1: Main Amount & Status */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/60 space-y-4 text-center">
                <div className="flex justify-center">
                  <Badge
                    variant="outline"
                    className={`px-3 py-1 font-bold text-xs rounded-xl ${
                      isIncoming
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    }`}
                  >
                    {isIncoming ? (
                      <ArrowUpRight className="size-3.5 mr-1 inline" />
                    ) : (
                      <ArrowDownLeft className="size-3.5 mr-1 inline" />
                    )}
                    {detail.type}
                  </Badge>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                    Số tiền biến động
                  </p>
                  <p
                    className={`text-3xl font-black mt-1 ${
                      isIncoming ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {isIncoming ? "+" : "-"}{formatCurrency(Math.abs(detail.amount))}
                  </p>
                </div>

                {/* Balance Before & After */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200/80 dark:border-zinc-800 text-xs">
                  <div className="bg-white dark:bg-zinc-800/80 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800">
                    <p className="text-[10px] text-slate-400 dark:text-zinc-400 font-bold uppercase">Số dư trước</p>
                    <p className="font-bold text-slate-700 dark:text-zinc-200 mt-0.5">{formatCurrency(detail.balanceBefore)}</p>
                  </div>
                  <div className="bg-white dark:bg-zinc-800/80 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800">
                    <p className="text-[10px] text-slate-400 dark:text-zinc-400 font-bold uppercase">Số dư sau</p>
                    <p className="font-bold text-slate-900 dark:text-zinc-100 mt-0.5">{formatCurrency(detail.balanceAfter)}</p>
                  </div>
                </div>
              </div>

              {/* Card 2: Transaction Meta */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-1.5">
                  <FileText className="size-3.5 text-[var(--c-primary-strong)]" />
                  Thông tin Nhật ký Đối soát
                </h4>
                
                <div className="space-y-2 text-xs divide-y divide-slate-100 dark:divide-zinc-800/60">
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500 dark:text-zinc-400">Thời gian tạo:</span>
                    <span className="font-semibold text-slate-900 dark:text-zinc-100 flex items-center gap-1">
                      <CalendarDays className="size-3 text-slate-400" />
                      {detail.createdAt ? new Date(detail.createdAt).toLocaleString("vi-VN") : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500 dark:text-zinc-400">Loại giao dịch:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">{detail.type}</span>
                  </div>
                  {detail.description && (
                    <div className="pt-2">
                      <span className="text-slate-500 dark:text-zinc-400 block mb-1">Mô tả / Ghi chú đối soát:</span>
                      <p className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 text-slate-700 dark:text-zinc-300 text-xs font-medium border border-slate-100 dark:border-zinc-800">
                        {detail.description}
                      </p>
                    </div>
                  )}
                  {detail.customer && (
                    <div className="flex justify-between items-center py-1.5 pt-2">
                      <span className="text-slate-500 dark:text-zinc-400">Khách hàng chủ ví:</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (detail?.customer?.id) {
                            onOpenChange(false);
                            router.push(`/admin/customers/${detail.customer.id}`);
                          }
                        }}
                        className="inline-flex items-center gap-1 font-bold text-slate-900 dark:text-zinc-100 hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer text-xs group"
                        title="Xem trang thông tin khách hàng"
                      >
                        {detail.customer.fullName} {detail.customer.phone ? `(${detail.customer.phone})` : ""}
                        <ExternalLink className="size-3 text-slate-400 group-hover:text-blue-600" />
                      </button>
                    </div>
                  )}
                  {detail.referenceId && (
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-500 dark:text-zinc-400">Mã đối chiếu ({detail.referenceType || "REF"}):</span>
                      <span className="font-mono text-[11px] font-semibold text-slate-700 dark:text-zinc-300">{detail.referenceId}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card 3: đơn nạp ví (nếu giao dịch này gắn với một đơn nạp). */}
              {detail.topup && (
                <div className="p-4 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                      <Receipt className="size-3.5 text-blue-600" />
                      Chi tiết cổng nạp {detail.topup.provider}
                    </h4>
                    {detail.topup.status && (
                      <Badge variant="outline" className="text-[10px] font-bold uppercase bg-blue-100 text-blue-800 border-blue-300">
                        {detail.topup.status}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs divide-y divide-blue-100 dark:divide-blue-900/40">
                    {detail.topup.payosOrderCode && (
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500 dark:text-zinc-400">Mã đơn PayOS:</span>
                        <span className="font-mono font-bold text-blue-700 dark:text-blue-300">{detail.topup.payosOrderCode}</span>
                      </div>
                    )}
                    {detail.topup.paymentLinkId && (
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500 dark:text-zinc-400">Payment link ID:</span>
                        <span className="font-mono text-slate-700 dark:text-zinc-300">{detail.topup.paymentLinkId}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Card 4: Joined Booking Details */}
              {detail.booking && (
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-1.5">
                      <Package className="size-3.5 text-blue-600" />
                      Đơn hàng Liên quan
                    </h4>
                    <Badge variant="outline" className="text-[10px] font-mono font-bold uppercase bg-blue-50 text-blue-700 border-blue-200">
                      {detail.booking.status}
                    </Badge>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    {/* Booking Code */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800">
                      <span className="text-slate-500 dark:text-zinc-400 font-medium">Mã Booking:</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (detail?.booking?.id) {
                            setSelectedBookingIdForDetail(detail.booking.id);
                            setBookingDetailModalOpen(true);
                          }
                        }}
                        className="inline-flex items-center gap-1 font-mono font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer text-sm group"
                        title="Xem modal chi tiết đơn hàng này"
                      >
                        {detail.booking.bookingCode}
                        <ExternalLink className="size-3 text-blue-500 group-hover:text-blue-700" />
                      </button>
                    </div>

                    {/* Service Package */}
                    {detail.booking.package && (
                      <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                        {detail.booking.package.iconUrl ? (
                          <img
                            src={detail.booking.package.iconUrl}
                            alt=""
                            className="size-8 rounded-lg object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="size-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                            <Package className="size-4" />
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-900 dark:text-zinc-100">{detail.booking.package.name}</p>
                          <p className="text-[10px] text-slate-400">Gói dịch vụ chính</p>
                        </div>
                      </div>
                    )}

                    {/* Scheduled Work Time */}
                    {detail.booking.scheduledStart && (
                      <div className="flex items-center justify-between py-1.5 border-t border-slate-100 dark:border-zinc-800">
                        <span className="text-slate-500 dark:text-zinc-400">Thời gian làm việc:</span>
                        <span className="font-semibold text-slate-800 dark:text-zinc-200">
                          {new Date(detail.booking.scheduledStart).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}
                          {detail.booking.scheduledEnd ? ` - ${new Date(detail.booking.scheduledEnd).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}` : ""}
                          {detail.booking.durationHours ? ` (${detail.booking.durationHours}h)` : ""}
                          {" - "}
                          {new Date(detail.booking.scheduledStart).toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                    )}

                    {/* Service Address */}
                    {detail.booking.serviceAddress && (
                      <div className="flex items-start gap-2 py-1.5 border-t border-slate-100 dark:border-zinc-800">
                        <MapPin className="size-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="text-slate-700 dark:text-zinc-300 font-medium">
                          {detail.booking.serviceAddress}
                          {detail.booking.district ? `, ${detail.booking.district}` : ""}
                        </span>
                      </div>
                    )}

                    {/* Assigned Tasker */}
                    {detail.booking.tasker && (
                      <div className="flex items-center justify-between py-1.5 border-t border-slate-100 dark:border-zinc-800">
                        <span className="text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                          <User className="size-3.5 text-emerald-600" />
                          Thợ thực hiện:
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const tasker = detail?.booking?.tasker;
                            if (tasker) {
                              onOpenChange(false);
                              if (tasker.id) {
                                router.push(`/admin/taskers/${tasker.id}`);
                              } else {
                                const q = tasker.phone || tasker.fullName || "";
                                if (q) {
                                  router.push(`/admin/taskers?search=${encodeURIComponent(q)}`);
                                }
                              }
                            }
                          }}
                          className="inline-flex items-center gap-1 font-bold text-slate-900 dark:text-zinc-100 hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer text-xs group"
                          title="Xem chi tiết thợ"
                        >
                          {detail.booking.tasker.fullName} {detail.booking.tasker.phone ? `(${detail.booking.tasker.phone})` : ""}
                          <ExternalLink className="size-3 text-slate-400 group-hover:text-blue-600" />
                        </button>
                      </div>
                    )}

                    {/* Booking Note */}
                    {detail.booking.note && (
                      <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-xs">
                        <span className="font-bold block mb-0.5">📝 Ghi chú từ khách hàng:</span>
                        {detail.booking.note}
                      </div>
                    )}

                    {/* Price Breakdown Accordion / Card */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Phân rã Chi phí Đơn hàng</p>
                      
                      {detail.booking.basePrice !== undefined && detail.booking.basePrice > 0 && (
                        <div className="flex justify-between text-slate-600 dark:text-zinc-400">
                          <span>Giá gói cơ bản:</span>
                          <span>{formatCurrency(detail.booking.basePrice)}</span>
                        </div>
                      )}
                      {detail.booking.addonPrice !== undefined && detail.booking.addonPrice > 0 && (
                        <div className="flex justify-between text-slate-600 dark:text-zinc-400">
                          <span>Dịch vụ thêm:</span>
                          <span>+{formatCurrency(detail.booking.addonPrice)}</span>
                        </div>
                      )}
                      {((detail.booking.peakFee ?? 0) + (detail.booking.petFee ?? 0)) > 0 && (
                        <div className="flex justify-between text-slate-600 dark:text-zinc-400">
                          <span>Phụ phí (Giờ cao điểm/Thú cưng):</span>
                          <span>+{formatCurrency((detail.booking.peakFee ?? 0) + (detail.booking.petFee ?? 0))}</span>
                        </div>
                      )}
                      {detail.booking.discountAmount !== undefined && detail.booking.discountAmount > 0 && (
                        <div className="flex justify-between text-emerald-600 font-medium">
                          <span>Giảm giá / Voucher:</span>
                          <span>-{formatCurrency(detail.booking.discountAmount)}</span>
                        </div>
                      )}

                      <div className="flex justify-between pt-1.5 border-t border-slate-200 dark:border-zinc-700 font-bold text-slate-900 dark:text-zinc-100">
                        <span>Tổng giá trị đơn:</span>
                        <span className="text-emerald-600 text-sm">{formatCurrency(detail.booking.totalAmount)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Booking Detail */}
        <AdminBookingDetailModal
          open={bookingDetailModalOpen}
          onOpenChange={setBookingDetailModalOpen}
          booking={detailedBooking ?? null}
        />
      </SheetContent>
    </Sheet>
  );
}
