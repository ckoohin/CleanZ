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
  ChevronUp,
  Star,
  Activity,
  Sparkles,
  ShieldCheck,
  Briefcase,
  X,
  MessageSquare,
  ChevronRight,
  Coins,
} from "lucide-react";
import { useMyActiveBooking } from "@/features/booking/hooks/useCustomerBooking";
import type { BookingStatus } from "@/features/booking/types/booking.types";

const STATUS_TEXT: Record<BookingStatus, string> = {
  POSTED: "Đang tìm nhân viên",
  CONFIRMED: "Đã nhận đơn",
  TASKER_ON_THE_WAY: "Chuyên gia đang đến",
  CHECKED_IN: "Chuyên gia đã đến nơi",
  IN_PROGRESS: "Đang làm việc",
  COMPLETED: "Đã hoàn thành",
  CANCELLED: "Đã hủy",
  EXPIRED: "Đã hết hạn",
};

const STATUS_COLORS: Record<BookingStatus, string> = {
  POSTED: "bg-blue-500/10 text-blue-600 border-blue-200/50",
  CONFIRMED: "bg-amber-500/10 text-amber-600 border-amber-200/50",
  TASKER_ON_THE_WAY: "bg-orange-500/10 text-orange-600 border-orange-200/50",
  CHECKED_IN: "bg-emerald-500/10 text-emerald-600 border-emerald-200/50",
  IN_PROGRESS: "bg-green-500/10 text-green-600 border-green-200/50",
  COMPLETED: "bg-slate-500/10 text-slate-600 border-slate-200/50",
  CANCELLED: "bg-red-500/10 text-red-600 border-red-200/50",
  EXPIRED: "bg-neutral-500/10 text-neutral-600 border-neutral-200/50",
};

export function ActiveBookingWidget() {
  const router = useRouter();
  const pathname = usePathname();
  const { data, isLoading } = useMyActiveBooking();
  const [showSheet, setShowSheet] = useState(false);
  const [showTaskerModal, setShowTaskerModal] = useState(false);
  const [showAvatarZoom, setShowAvatarZoom] = useState(false);

  // Chỉ hiển thị nếu có đơn hoạt động
  const booking = data?.booking;
  if (isLoading || !booking) return null;

  // Không hiển thị widget khi người dùng đang ở chính trang chi tiết đơn hàng
  const isDetailPage =
    pathname.includes("/customer/booking/") &&
    !pathname.endsWith("/customer/booking");
  if (isDetailPage) return null;

  const status = booking.status;
  const statusLabel = STATUS_TEXT[status] || "Đang xử lý";
  const statusColor = STATUS_COLORS[status] || "bg-primary/10 text-primary";

  const handleGoToDetail = () => {
    setShowSheet(false);
    router.push(`/customer/booking/${booking.id}`);
  };

  const priceFormatted = booking.price?.totalPrice 
    ? booking.price.totalPrice.toLocaleString("vi-VN") + "đ" 
    : "0đ";
  const startDate = booking.schedule?.scheduledStartDate ?? "";
  const dateParts = startDate.split("-");
  const dateFormatted = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}` : startDate;
  const startTime = booking.schedule?.scheduledStartTime ?? "";
  const startTimeFormatted = startTime.split(":").slice(0, 2).join(":");
  const taskerFullName = booking.tasker?.fullName ?? null;

  return (
    <>
      {/* Widget nổi ở đáy màn hình di động (trên Bottom Nav) & góc phải desktop */}
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        onClick={() => setShowSheet(true)}
        className="fixed bottom-24 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:w-80 z-40 bg-gradient-to-r from-primary to-orange-500 text-primary-foreground p-3 sm:p-4 rounded-2xl flex items-center justify-between gap-2 sm:gap-3 shadow-lg shadow-primary/20 cursor-pointer hover:shadow-xl hover:shadow-primary/30 transition-all border border-white/10 select-none group"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {booking.tasker ? (
            <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-white/20 bg-white/10 flex items-center justify-center">
              {booking.tasker.avatarUrl ? (
                <img
                  src={booking.tasker.avatarUrl}
                  alt={booking.tasker.fullName ?? ""}
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
              {taskerFullName && (
                <span className="flex min-w-0 max-w-[45%] items-center gap-1 text-white">
                  <User className="w-3.5 h-3.5 text-orange-200 shrink-0" />
                  <span className="truncate">{taskerFullName}</span>
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

      {/* Bottom Sheet xem nhanh thông tin đơn */}
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
                <h3 className="text-lg font-extrabold text-foreground">Theo dõi nhanh đơn hàng</h3>
                <p className="text-xs text-muted-foreground">Chi tiết trạng thái hiện tại của buổi làm việc</p>
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
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Dịch vụ đặt lịch</span>
                    <span className="text-sm font-bold text-foreground truncate">{booking.service.name}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Lịch làm việc</span>
                    <span className="text-sm font-bold text-foreground">
                      {booking.schedule.scheduledStartDate} ({booking.schedule.scheduledStartTime})
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Địa chỉ dọn dẹp</span>
                    <span className="text-xs font-medium text-foreground leading-normal line-clamp-2">
                      {booking.address.fullAddress}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tasker info if assigned */}
              {booking.tasker ? (
                <div 
                  onClick={() => setShowTaskerModal(true)}
                  className="border border-border/50 rounded-2xl p-4 flex items-center justify-between gap-3 bg-card shadow-sm cursor-pointer hover:bg-muted/10 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0 border border-primary/20">
                      {booking.tasker.avatarUrl ? (
                        <img
                          src={booking.tasker.avatarUrl}
                          alt={booking.tasker.fullName ?? ""}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-6 h-6 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">Chuyên gia dọn dẹp</span>
                      <p className="font-bold text-sm text-foreground truncate mt-0.5 flex items-center gap-1 group-hover:text-primary transition-colors">
                        {booking.tasker.fullName ?? "Chuyên gia dọn dẹp"}
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs font-semibold">
                        <span className="text-amber-500 flex items-center gap-0.5 shrink-0">
                          <Star className="w-3 h-3 fill-amber-400" />{" "}
                          {booking.tasker.ratingAvg && booking.tasker.ratingAvg > 0
                            ? booking.tasker.ratingAvg.toFixed(1)
                            : "5.0"}
                        </span>
                        <span className="text-muted-foreground/40 shrink-0">•</span>
                        <span className="text-muted-foreground flex items-center gap-1 truncate">
                          <Briefcase className="w-3 h-3 text-primary/75 shrink-0" />
                          {booking.tasker.totalCompletedJobs ?? 0} đơn hoàn thành
                        </span>
                      </div>
                    </div>
                  </div>
                  {booking.tasker.phone && (
                    <a
                      href={`tel:${booking.tasker.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center hover:bg-primary/20 transition-colors shrink-0"
                    >
                      <Phone className="w-4.5 h-4.5 text-primary" />
                    </a>
                  )}
                </div>
              ) : (
                <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping mt-2 shrink-0" />
                  <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                    Hệ thống đang tiến hành ghép nối đơn hàng của bạn với chuyên gia phù hợp nhất. Vui lòng chờ trong giây lát.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={handleGoToDetail}
                  className="w-full py-4 bg-primary text-primary-foreground font-black text-sm rounded-2xl flex items-center justify-center gap-2 hover:bg-primary/95 transition-all shadow-md shadow-primary/20 active:scale-[0.98]"
                >
                  Xem chi tiết đơn hàng
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

      {/* Tasker Detail Modal (được trượt đè lên trên Bottom Sheet z-50) */}
      <AnimatePresence>
        {showTaskerModal && booking?.tasker && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-[55]"
              onClick={() => setShowTaskerModal(false)}
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
                  onClick={() => booking.tasker?.avatarUrl && setShowAvatarZoom(true)}
                  className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-primary/20 shadow-sm shrink-0 cursor-zoom-in hover:scale-105 transition-transform"
                >
                  {booking.tasker.avatarUrl ? (
                    <img
                      src={booking.tasker.avatarUrl}
                      alt={booking.tasker.fullName ?? ""}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-10 h-10 text-primary" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-foreground">{booking.tasker.fullName ?? "Chuyên gia dọn dẹp"}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Hồ sơ đối tác chuyên nghiệp</p>
                </div>
              </div>

              {/* Stats info */}
              <div className="grid grid-cols-2 gap-4 bg-muted/40 p-4 rounded-2xl border border-border/20">
                <div className="flex flex-col items-center justify-center text-center p-2 border-r border-border/50">
                  <div className="flex items-center gap-1 text-amber-500 font-extrabold text-base">
                    <Star className="w-4 h-4 fill-amber-400" />
                    <span>{booking.tasker.ratingAvg && booking.tasker.ratingAvg > 0 ? booking.tasker.ratingAvg.toFixed(1) : "5.0"}</span>
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">Đánh giá</span>
                </div>
                
                <div className="flex flex-col items-center justify-center text-center p-2">
                  <div className="flex items-center gap-1 text-primary font-extrabold text-base">
                    <Briefcase className="w-4 h-4" />
                    <span>{booking.tasker.totalCompletedJobs ?? 0}</span>
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">Số đơn hoàn thành</span>
                </div>
              </div>

              {/* Contact section */}
              {status === "COMPLETED" || status === "CANCELLED" || status === "EXPIRED" ? (
                <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                    Đơn hàng đã kết thúc. Để đảm bảo an toàn thông tin, số điện thoại và các hình thức liên hệ của chuyên gia đã được ẩn tự động.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {booking.tasker.phone && (
                    <div className="flex flex-col items-center justify-center text-center space-y-1">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Số điện thoại liên hệ</span>
                      <a href={`tel:${booking.tasker.phone}`} className="text-xl font-black font-mono text-primary hover:underline">
                        {booking.tasker.phone}
                      </a>
                    </div>
                  )}

                  {/* Actions call/chat */}
                  <div className="flex flex-col gap-2 pt-2">
                    <a
                      href={`tel:${booking.tasker.phone}`}
                      className="w-full py-4 bg-primary text-primary-foreground font-black text-sm rounded-2xl flex items-center justify-center gap-2 hover:bg-primary/95 transition-all shadow-md shadow-primary/20 active:scale-[0.98]"
                    >
                      <Phone className="w-4 h-4 fill-primary-foreground" />
                      <span>Gọi điện ngay</span>
                    </a>
                    
                    <button
                      disabled
                      className="w-full py-4 border border-border bg-background text-muted-foreground/60 font-bold text-sm rounded-2xl flex items-center justify-center gap-2 cursor-not-allowed opacity-80"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Hội thoại trong ứng dụng (Sắp ra mắt)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Bottom close button */}
              <div className="pt-2">
                <button
                  onClick={() => setShowTaskerModal(false)}
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
        {showAvatarZoom && booking?.tasker?.avatarUrl && (
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
                  src={booking.tasker.avatarUrl}
                  alt={booking.tasker.fullName ?? ""}
                  className="max-w-full max-h-[70vh] rounded-2xl object-contain shadow-2xl border border-white/10"
                />
                <div className="mt-4 text-center">
                  <p className="text-white font-bold text-base">{booking.tasker.fullName ?? "Chuyên gia dọn dẹp"}</p>
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
