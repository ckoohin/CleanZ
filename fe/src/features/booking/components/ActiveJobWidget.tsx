"use client";

import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  MapPin,
  Calendar,
  User,
  Phone,
  ChevronRight,
  Activity,
  Briefcase,
  Coins,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { useTaskerActiveBooking } from "@/features/booking/hooks/useTaskerBooking";
import type { BookingStatus } from "@/features/booking/types/booking.types";

const STATUS_TEXT: Record<BookingStatus, string> = {
  POSTED: "Đang chờ nhận",
  PENDING_CUSTOMER_CONFIRMATION: "Chờ khách xác nhận",
  CONFIRMED: "Đã nhận việc",
  TASKER_ON_THE_WAY: "Đang di chuyển tới",
  CHECKED_IN: "Đã đến nơi",
  IN_PROGRESS: "Đang làm việc",
  COMPLETED: "Đã hoàn thành",
  CANCELLED: "Đã hủy",
  EXPIRED: "Đã hết hạn",
};

const STATUS_COLORS: Record<BookingStatus, string> = {
  POSTED: "bg-blue-500/10 text-blue-600 border-blue-200/50",
  PENDING_CUSTOMER_CONFIRMATION: "bg-amber-500/10 text-amber-700 border-amber-200/50",
  CONFIRMED: "bg-amber-500/10 text-amber-600 border-amber-200/50",
  TASKER_ON_THE_WAY: "bg-orange-500/10 text-orange-600 border-orange-200/50",
  CHECKED_IN: "bg-emerald-500/10 text-emerald-600 border-emerald-200/50",
  IN_PROGRESS: "bg-green-500/10 text-green-600 border-green-200/50",
  COMPLETED: "bg-slate-500/10 text-slate-600 border-slate-200/50",
  CANCELLED: "bg-red-500/10 text-red-600 border-red-200/50",
  EXPIRED: "bg-neutral-500/10 text-neutral-600 border-neutral-200/50",
};

export function ActiveJobWidget() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: booking, isLoading } = useTaskerActiveBooking();
  const [showSheet, setShowSheet] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showAvatarZoom, setShowAvatarZoom] = useState(false);

  // Chỉ hiển thị nếu có đơn hoạt động
  if (isLoading || !booking) return null;

  // Home đã hiển thị Active Job Card trực tiếp trong luồng nội dung.
  if (pathname === "/tasker") return null;

  // Không hiển thị widget khi người dùng đang ở chính trang chi tiết công việc của Tasker
  const isDetailPage =
    pathname.includes("/tasker/jobs/") &&
    !pathname.endsWith("/tasker/jobs");
  if (isDetailPage) return null;

  const status = booking.status;
  const statusLabel = STATUS_TEXT[status] || "Đang xử lý";
  const statusColor = STATUS_COLORS[status] || "bg-primary/10 text-primary";

  const handleGoToDetail = () => {
    setShowSheet(false);
    router.push(`/tasker/jobs/${booking.id}`);
  };

  const priceFormatted = booking.price?.totalPrice 
    ? booking.price.totalPrice.toLocaleString("vi-VN") + "đ" 
    : "0đ";
  const startDate = booking.schedule?.scheduledStartDate ?? "";
  const dateParts = startDate.split("-");
  const dateFormatted = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}` : startDate;
  const startTime = booking.schedule?.scheduledStartTime ?? "";
  const startTimeFormatted = startTime.split(":").slice(0, 2).join(":");
  const customerFullName = booking.customer?.fullName ?? null;

  return (
    <>
      {/* Widget nổi ở đáy màn hình di động (trên Bottom Nav) & góc phải desktop */}
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        onClick={() => setShowSheet(true)}
        className="fixed bottom-24 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:w-80 z-40 bg-gradient-to-r from-orange-600 to-amber-500 text-white p-3 sm:p-4 rounded-2xl flex items-center justify-between gap-2 sm:gap-3 shadow-lg shadow-orange-600/20 cursor-pointer hover:shadow-xl hover:shadow-orange-600/30 transition-all border border-white/10 select-none group"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {booking.customer ? (
            <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-white/20 bg-white/10 flex items-center justify-center">
              {booking.customer.avatarUrl ? (
                <img
                  src={booking.customer.avatarUrl}
                  alt={booking.customer.fullName ?? ""}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-white" />
              )}
            </div>
          ) : (
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 text-white animate-pulse" />
            </div>
          )}
          
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5 truncate text-[10px] font-black uppercase leading-none tracking-wider text-white drop-shadow-sm sm:text-xs sm:tracking-widest">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                </span>
                <span className="truncate">{statusLabel}</span>
              </span>
              <span className="hidden shrink-0 items-center text-[11px] font-bold text-white/95 drop-shadow-sm sm:flex">
                Check nhanh <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </span>
            </div>

            <span className="truncate text-sm font-black leading-tight text-white drop-shadow-md sm:text-base">
              {booking.service.name}
            </span>

            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-black leading-none text-orange-100 drop-shadow-sm sm:text-xs">
              {customerFullName && (
                <span className="flex min-w-0 max-w-[45%] items-center gap-1 text-white">
                  <User className="w-3.5 h-3.5 text-orange-200 shrink-0" />
                  <span className="truncate">{customerFullName}</span>
                </span>
              )}
              <span className="flex shrink-0 items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-orange-200 shrink-0" />
                <span>{startTimeFormatted}-{dateFormatted}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1 text-white">
                <Coins className="w-3.5 h-3.5 text-orange-200 shrink-0" />
                <span>{priceFormatted}</span>
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 sm:hidden">
          <ChevronRight className="w-4 h-4 text-white/90" />
        </div>
      </motion.div>

      {/* Bottom Sheet xem nhanh thông tin công việc */}
      <AnimatePresence>
        {showSheet && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-45"
              onClick={() => setShowSheet(false)}
            />
            {/* Sheet content */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl overflow-y-auto max-h-[85vh] p-6 space-y-5 shadow-2xl border-t border-border/40 pb-10 select-none"
            >
              {/* Grab handle */}
              <div className="w-10 h-1 bg-border rounded-full mx-auto" />

              <div className="text-center space-y-1">
                <h3 className="text-lg font-extrabold text-foreground">Theo dõi công việc đang chạy</h3>
                <p className="text-xs text-muted-foreground">Chi tiết trạng thái hiện tại của nhiệm vụ</p>
              </div>

              {/* Status Badge */}
              <div className="flex justify-center">
                <span className={`px-4 py-1.5 rounded-full text-xs font-bold border ${statusColor}`}>
                  {statusLabel}
                </span>
              </div>

              {/* Service info summary */}
              <div className="bg-muted/40 rounded-2xl p-4 border border-border/20 space-y-3.5">
                <div className="flex items-start gap-3">
                  <Briefcase className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Công việc được gán</span>
                    <span className="text-sm font-bold text-foreground truncate">{booking.service.name}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Giờ làm việc</span>
                    <span className="text-sm font-bold text-foreground">
                      {booking.schedule.scheduledStartDate} ({booking.schedule.scheduledStartTime})
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Địa chỉ làm việc</span>
                    <span className="text-xs font-medium text-foreground leading-normal line-clamp-2">
                      {booking.address?.fullAddress || booking.area?.displayAddress || "Chưa có địa chỉ"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Customer info */}
              {booking.customer ? (
                <div 
                  onClick={() => setShowCustomerModal(true)}
                  className="border border-border/50 rounded-2xl p-4 flex items-center justify-between gap-3 bg-card shadow-sm cursor-pointer hover:bg-muted/10 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0 border border-primary/20">
                      {booking.customer.avatarUrl ? (
                        <img
                          src={booking.customer.avatarUrl}
                          alt={booking.customer.fullName ?? ""}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-6 h-6 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">Khách hàng liên hệ</span>
                      <p className="font-bold text-sm text-foreground truncate mt-0.5 flex items-center gap-1 group-hover:text-primary transition-colors">
                        {booking.customer.fullName ?? "Khách hàng"}
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs font-semibold text-muted-foreground">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span>Đối tác tin cậy</span>
                      </div>
                    </div>
                  </div>
                  {booking.customer.phone && booking.canContactCustomer && (
                    <a
                      href={`tel:${booking.customer.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center hover:bg-primary/20 transition-colors shrink-0"
                    >
                      <Phone className="w-4.5 h-4.5 text-primary" />
                    </a>
                  )}
                </div>
              ) : null}

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={handleGoToDetail}
                  className="w-full py-4 bg-primary text-primary-foreground font-black text-sm rounded-2xl flex items-center justify-center gap-2 hover:bg-primary/95 transition-all shadow-md shadow-primary/20 active:scale-[0.98]"
                >
                  Xem chi tiết công việc
                </button>
                <button
                  onClick={() => setShowSheet(false)}
                  className="w-full py-3.5 border border-border rounded-2xl text-sm font-bold text-foreground hover:bg-muted/30 transition-colors"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Customer Detail Modal */}
      <AnimatePresence>
        {showCustomerModal && booking?.customer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-[55]"
              onClick={() => setShowCustomerModal(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed bottom-0 left-0 right-0 z-[60] bg-card rounded-t-3xl overflow-y-auto max-h-[85vh] p-6 space-y-6 shadow-2xl border-t border-border/40 pb-10 select-none"
            >
              <div className="w-10 h-1 bg-border rounded-full mx-auto" />
              
              <div className="flex flex-col items-center text-center space-y-3">
                <div 
                  onClick={() => booking.customer?.avatarUrl && setShowAvatarZoom(true)}
                  className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-primary/20 shadow-sm shrink-0 cursor-zoom-in hover:scale-105 transition-transform"
                >
                  {booking.customer.avatarUrl ? (
                    <img
                      src={booking.customer.avatarUrl}
                      alt={booking.customer.fullName ?? ""}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-10 h-10 text-primary" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-foreground">{booking.customer.fullName ?? "Khách hàng"}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Thông tin liên hệ khách hàng</p>
                </div>
              </div>

              {/* Contact section */}
              {!booking.canContactCustomer ? (
                <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                    Theo chính sách bảo mật, số điện thoại của khách hàng chỉ hiển thị từ trạng thái &ldquo;Đang di chuyển tới&rdquo; (TASKER_ON_THE_WAY).
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {booking.customer.phone && (
                    <div className="flex flex-col items-center justify-center text-center space-y-1">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Số điện thoại</span>
                      <a href={`tel:${booking.customer.phone}`} className="text-xl font-black font-mono text-primary hover:underline">
                        {booking.customer.phone}
                      </a>
                    </div>
                  )}

                  {/* Actions call */}
                  <div className="flex flex-col gap-2 pt-2">
                    {booking.customer.phone && (
                      <a
                        href={`tel:${booking.customer.phone}`}
                        className="w-full py-4 bg-primary text-primary-foreground font-black text-sm rounded-2xl flex items-center justify-center gap-2 hover:bg-primary/95 transition-all shadow-md shadow-primary/20 active:scale-[0.98]"
                      >
                        <Phone className="w-4 h-4 fill-primary-foreground" />
                        <span>Gọi điện ngay</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Bottom close button */}
              <div className="pt-2">
                <button
                  onClick={() => setShowCustomerModal(false)}
                  className="w-full py-3.5 border border-border rounded-2xl text-sm font-bold text-foreground hover:bg-muted/30 transition-colors"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Lightbox Zoom Avatar */}
      <AnimatePresence>
        {showAvatarZoom && booking?.customer?.avatarUrl && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 z-[80] backdrop-blur-sm flex items-center justify-center cursor-zoom-out"
              onClick={() => setShowAvatarZoom(false)}
            >
              <div className="relative max-w-[90vw] max-h-[80vh] flex flex-col items-center">
                <motion.img
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  src={booking.customer.avatarUrl}
                  alt={booking.customer.fullName ?? ""}
                  className="max-w-full max-h-[70vh] rounded-2xl object-contain shadow-2xl border border-white/10"
                />
                <div className="mt-4 text-center">
                  <p className="text-white font-bold text-base">{booking.customer.fullName ?? "Khách hàng"}</p>
                  <p className="text-white/60 text-xs mt-1">Chạm vào vùng trống bất kỳ hoặc ảnh để đóng</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
