"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ListOrdered, Users, Search, Loader2, ChevronRight,
  Star, Clock, DollarSign, CheckCircle2, XCircle,
  Briefcase, Calendar, Activity, Filter, SlidersHorizontal,
  ArrowUpRight, Phone, MapPin, Tag, Receipt, AlertCircle,
  ChevronDown, CreditCard, Wallet, Banknote, RefreshCw,
} from "lucide-react";
import {
  useServiceBookings,
  useServiceTaskers,
} from "@/features/admin/modules/service/hooks/useAdminServices";
import {
  AdminServiceBooking,
  AdminServiceTasker,
} from "@/features/admin/modules/service/services/admin-services.service";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { cn } from "@/lib/utils";
import BaseEmptyState from "@/components/ui/base/base_empty_state";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface PackageOperationsTabProps {
  pkg: {
    id: string;
    name: string;
    packageSubServices?: {
      id: string;
      subService: { id: string; name: string };
    }[];
  };
}

type ViewMode = "bookings" | "taskers";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const vnd = (val: number | string | null | undefined) => {
  const n = Number(val);
  if (isNaN(n)) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n);
};

const fmtDate = (d: string | null | undefined) => {
  if (!d) return "Chưa xếp lịch";
  try {
    return format(new Date(d), "dd/MM/yyyy HH:mm", { locale: vi });
  } catch {
    return d;
  }
};

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; className: string; dot: string }> = {
  PENDING:     { label: "Chờ nhận",   className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",    dot: "bg-amber-500" },
  POSTED:      { label: "Chờ nhận",   className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",    dot: "bg-amber-500" },
  CONFIRMED:   { label: "Đã xác nhận",className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",        dot: "bg-blue-500" },
  ACCEPTED:    { label: "Đã nhận",    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",        dot: "bg-blue-500" },
  ON_THE_WAY:  { label: "Đang đến",   className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",dot: "bg-indigo-500" },
  TASKER_ON_THE_WAY: { label: "Đang đến", className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400", dot: "bg-indigo-500" },
  CHECKED_IN:  { label: "Đã check-in",className: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",       dot: "bg-cyan-500" },
  IN_PROGRESS: { label: "Đang làm",   className: "bg-primary/10 text-primary",                                              dot: "bg-primary" },
  COMPLETED:   { label: "Hoàn thành", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", dot: "bg-emerald-500" },
  CANCELLED:   { label: "Đã hủy",     className: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",       dot: "bg-rose-500" },
  EXPIRED:     { label: "Hết hạn",    className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",      dot: "bg-slate-400" },
};

const PAYMENT_METHOD_CFG: Record<string, { label: string; icon: React.ElementType }> = {
  CASH:   { label: "Tiền mặt", icon: Banknote },
  WALLET: { label: "Ví điện tử", icon: Wallet },
  ONLINE: { label: "Thanh toán online", icon: CreditCard },
};

const PAYMENT_STATUS_CFG: Record<string, { label: string; className: string }> = {
  PENDING:  { label: "Chờ thanh toán", className: "bg-amber-100 text-amber-700" },
  PAID:     { label: "Đã thanh toán",  className: "bg-emerald-100 text-emerald-700" },
  REFUNDED: { label: "Đã hoàn tiền",   className: "bg-blue-100 text-blue-700" },
  FAILED:   { label: "Thất bại",       className: "bg-rose-100 text-rose-700" },
};

const PRESENCE_CFG: Record<string, { label: string; className: string }> = {
  ONLINE:  { label: "● Online",  className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  OFFLINE: { label: "● Offline", className: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400" },
};

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { label: status, className: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" };
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap", cfg.className)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

// ─── Info Row ─────────────────────────────────────────────────────────────────

function InfoRow({
  label,
  value,
  highlight = false,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between items-start gap-3 py-3 px-4">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className={cn(
        "text-sm font-semibold text-right",
        highlight ? "text-primary text-base" : "text-foreground",
        mono ? "font-mono" : "",
      )}>
        {value}
      </span>
    </div>
  );
}

// ─── Section Header ────────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 border-y border-border/40 mt-2">
      <Icon className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
      <span className="text-[10px] font-black text-foreground uppercase tracking-widest">{title}</span>
    </div>
  );
}

// ─── Action Button ─────────────────────────────────────────────────────────────

function ActionButton({
  icon: Icon,
  label,
  onClick,
  variant = "default",
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  variant?: "default" | "danger";
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 w-full px-4 py-3 text-sm font-semibold transition-colors",
        variant === "danger"
          ? "text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
          : "text-foreground hover:bg-muted/60",
      )}
    >
      <Icon className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
      {label}
      <ArrowUpRight className="w-3.5 h-3.5 ml-auto text-muted-foreground/50" aria-hidden="true" />
    </button>
  );
}

// ─── Booking Detail Sheet ──────────────────────────────────────────────────────

function BookingDetailSheet({
  booking,
  open,
  onClose,
}: {
  booking: AdminServiceBooking | null;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  if (!booking) return null;

  const status = STATUS_CFG[booking.status] ?? { label: booking.status, className: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[480px] p-0 overflow-y-auto flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="px-6 py-5 border-b border-border/50 bg-card sticky top-0 z-10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <SheetTitle className="text-xl font-black text-foreground flex items-center gap-2">
                <ListOrdered className="w-5 h-5 text-primary" aria-hidden="true" />
                Chi tiết đơn hàng
              </SheetTitle>
              <p className="text-sm font-mono text-primary mt-1 font-bold">
                #{booking.bookingCode}
              </p>
            </div>
            <StatusBadge status={booking.status} />
          </div>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto pb-8">

          {/* ─── Khách hàng ─── */}
          <SectionHeader icon={Users} title="Thông tin khách hàng" />
          <div className="divide-y divide-border/30">
            <InfoRow label="Họ tên" value={booking.customerName} />
            <InfoRow label="Số điện thoại" value={booking.customerPhone} mono />
            <InfoRow label="Mã khách hàng" value={<span className="text-xs text-muted-foreground">{booking.customerId}</span>} />
          </div>

          {/* Navigate to customer */}
          <div className="px-3 py-2 border-b border-border/30">
            <ActionButton
              icon={ArrowUpRight}
              label="Xem chi tiết khách hàng"
              onClick={() => {
                onClose();
                router.push(`/admin/customers/${booking.customerId}`);
              }}
            />
          </div>

          {/* ─── Nhân viên ─── */}
          <SectionHeader icon={Briefcase} title="Nhân viên thực hiện" />
          <div className="divide-y divide-border/30">
            {booking.taskerName ? (
              <>
                <InfoRow label="Họ tên" value={booking.taskerName} />
                <InfoRow label="Số điện thoại" value={booking.taskerPhone ?? "—"} mono />
                <InfoRow label="Mã nhân viên" value={<span className="text-xs text-muted-foreground">{booking.taskerId}</span>} />
              </>
            ) : (
              <div className="px-4 py-4 text-sm text-muted-foreground italic flex items-center gap-2">
                <AlertCircle className="w-4 h-4" aria-hidden="true" />
                Chưa có nhân viên nhận đơn
              </div>
            )}
          </div>

          {/* Navigate to tasker */}
          {booking.taskerId && (
            <div className="px-3 py-2 border-b border-border/30">
              <ActionButton
                icon={ArrowUpRight}
                label="Xem chi tiết nhân sự"
                onClick={() => {
                  onClose();
                  router.push(`/admin/taskers/${booking.taskerId}`);
                }}
              />
            </div>
          )}

          {/* ─── Lịch hẹn ─── */}
          <SectionHeader icon={Calendar} title="Lịch hẹn & Thời gian" />
          <div className="divide-y divide-border/30">
            <InfoRow
              label="Ngày tạo đơn"
              value={fmtDate(booking.createdAt)}
            />
            <InfoRow
              label="Lịch hẹn bắt đầu"
              value={
                booking.scheduledStart
                  ? format(new Date(booking.scheduledStart), "EEEE, dd/MM/yyyy HH:mm", { locale: vi })
                  : "Chưa xếp lịch"
              }
              highlight={!!booking.scheduledStart}
            />
          </div>

          {/* ─── Tài chính ─── */}
          <SectionHeader icon={DollarSign} title="Tài chính & Thanh toán" />
          <div className="divide-y divide-border/30">
            <InfoRow label="Tổng tiền" value={vnd(booking.totalPrice)} highlight />
          </div>

          {/* Navigate to booking full page */}
          <div className="px-3 py-2 border-b border-border/30">
            <ActionButton
              icon={Receipt}
              label="Xem chi tiết giao dịch"
              onClick={() => {
                onClose();
                router.push(`/admin/bookings/${booking.id}`);
              }}
            />
          </div>

          {/* ─── Quick actions ─── */}
          <SectionHeader icon={SlidersHorizontal} title="Hành động" />
          <div className="divide-y divide-border/30">
            <ActionButton
              icon={ArrowUpRight}
              label="Xem toàn bộ chi tiết booking"
              onClick={() => {
                onClose();
                router.push(`/admin/bookings/${booking.id}`);
              }}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Tasker Detail Sheet ───────────────────────────────────────────────────────

function TaskerDetailSheet({
  tasker,
  open,
  onClose,
}: {
  tasker: AdminServiceTasker | null;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  if (!tasker) return null;

  const presence = PRESENCE_CFG[tasker.presenceStatus] ?? {
    label: tasker.presenceStatus,
    className: "bg-muted text-muted-foreground",
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[480px] p-0 overflow-y-auto flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="px-6 py-5 border-b border-border/50 bg-card sticky top-0 z-10">
          <SheetTitle className="text-xl font-black text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" aria-hidden="true" />
            Chi tiết nhân sự
          </SheetTitle>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto pb-8">
          {/* Avatar + Name */}
          <div className="flex flex-col items-center gap-4 px-6 py-8 border-b border-border/50">
            <Avatar className="w-24 h-24 border-4 border-background shadow-lg ring-2 ring-border">
              <AvatarImage src={tasker.avatarUrl} />
              <AvatarFallback className="bg-primary/10 text-primary text-3xl font-black">
                {tasker.fullName?.charAt(0) ?? "T"}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <p className="text-2xl font-black text-foreground">{tasker.fullName}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{tasker.phoneNumber}</p>
              <div className="mt-3 flex items-center justify-center gap-2">
                <span className={cn("px-3 py-1 rounded-full text-xs font-bold", presence.className)}>
                  {presence.label}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-muted text-muted-foreground">
                  {tasker.status ?? "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 px-5 py-5 border-b border-border/50">
            {[
              { label: "Đánh giá", value: tasker.ratingAvg != null ? Number(tasker.ratingAvg).toFixed(1) : "—", sub: "/ 5 ★", color: "text-amber-500", icon: Star },
              { label: "Tổng đơn", value: String(tasker.totalCompletedJobs ?? 0), sub: "đơn", color: "text-emerald-500", icon: CheckCircle2 },
              { label: "Gói này", value: String(tasker.jobsForThisService ?? 0), sub: "đơn", color: "text-primary", icon: Activity },
            ].map((stat) => (
              <div key={stat.label} className="bg-muted/20 border border-border/40 rounded-2xl p-4 text-center">
                <stat.icon className={cn("w-5 h-5 mx-auto mb-1.5", stat.color)} aria-hidden="true" />
                <p className="text-2xl font-black text-foreground leading-none">{stat.value}</p>
                <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Info */}
          <SectionHeader icon={Briefcase} title="Thông tin chi tiết" />
          <div className="divide-y divide-border/30">
            <InfoRow label="Số điện thoại" value={tasker.phoneNumber} mono />
            <InfoRow label="Trạng thái tài khoản" value={tasker.status ?? "—"} />
            <InfoRow
              label="Hiện tại"
              value={
                <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", presence.className)}>
                  {presence.label}
                </span>
              }
            />
            <InfoRow label="Đơn hoàn thành" value={`${tasker.totalCompletedJobs ?? 0} đơn`} />
            <InfoRow label="Đơn gói này" value={`${tasker.jobsForThisService ?? 0} đơn`} highlight />
          </div>

          {/* Navigate */}
          <div className="px-3 py-2 mt-2">
            <ActionButton
              icon={ArrowUpRight}
              label="Xem trang chi tiết nhân sự"
              onClick={() => {
                onClose();
                router.push(`/admin/taskers/${tasker.id}`);
              }}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Filter Bar ────────────────────────────────────────────────────────────────

function FilterBar({
  mode,
  statusFilter,
  setStatusFilter,
  sortBy,
  setSortBy,
}: {
  mode: ViewMode;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  sortBy: string;
  setSortBy: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {mode === "bookings" && (
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[160px] rounded-xl text-xs font-semibold border-border/60 bg-background">
            <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" aria-hidden="true" />
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
            <SelectItem value="PENDING">Chờ nhận</SelectItem>
            <SelectItem value="POSTED">Đã đăng</SelectItem>
            <SelectItem value="CONFIRMED">Đã xác nhận</SelectItem>
            <SelectItem value="IN_PROGRESS">Đang làm</SelectItem>
            <SelectItem value="COMPLETED">Hoàn thành</SelectItem>
            <SelectItem value="CANCELLED">Đã hủy</SelectItem>
            <SelectItem value="EXPIRED">Hết hạn</SelectItem>
          </SelectContent>
        </Select>
      )}

      {mode === "taskers" && (
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[150px] rounded-xl text-xs font-semibold border-border/60 bg-background">
            <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" aria-hidden="true" />
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả</SelectItem>
            <SelectItem value="ONLINE">Online</SelectItem>
            <SelectItem value="OFFLINE">Offline</SelectItem>
          </SelectContent>
        </Select>
      )}

      <Select value={sortBy} onValueChange={setSortBy}>
        <SelectTrigger className="h-9 w-[150px] rounded-xl text-xs font-semibold border-border/60 bg-background">
          <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" aria-hidden="true" />
          <SelectValue placeholder="Sắp xếp" />
        </SelectTrigger>
        <SelectContent>
          {mode === "bookings" ? (
            <>
              <SelectItem value="newest">Mới nhất</SelectItem>
              <SelectItem value="oldest">Cũ nhất</SelectItem>
              <SelectItem value="highest">Tiền cao nhất</SelectItem>
              <SelectItem value="lowest">Tiền thấp nhất</SelectItem>
            </>
          ) : (
            <>
              <SelectItem value="rating">Đánh giá cao nhất</SelectItem>
              <SelectItem value="jobs">Đơn nhiều nhất</SelectItem>
              <SelectItem value="package">Gói này nhiều nhất</SelectItem>
            </>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

// ─── Bookings Table ────────────────────────────────────────────────────────────

function BookingsTable({
  items,
  onSelect,
}: {
  items: AdminServiceBooking[];
  onSelect: (b: AdminServiceBooking) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <ListOrdered className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Không có đơn hàng nào</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/40">
      {/* Header */}
      <div className="hidden md:grid grid-cols-[1.8fr_1.5fr_1fr_1fr_auto] gap-4 px-6 py-3 bg-muted/30 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
        <span>Khách hàng</span>
        <span>Tasker</span>
        <span>Lịch hẹn</span>
        <span>Tổng tiền</span>
        <span>Trạng thái</span>
      </div>

      {items.map((booking) => (
        <div
          key={booking.id}
          onClick={() => onSelect(booking)}
          className="grid grid-cols-1 md:grid-cols-[1.8fr_1.5fr_1fr_1fr_auto] gap-2 md:gap-4 px-6 py-4 hover:bg-muted/20 cursor-pointer transition-all duration-150 group border-l-2 border-l-transparent hover:border-l-primary"
        >
          {/* Customer */}
          <div className="flex flex-col gap-0.5">
            <p className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">
              {booking.customerName}
            </p>
            <p className="text-xs text-muted-foreground font-mono">{booking.customerPhone}</p>
            <p className="text-[10px] font-mono text-primary/60">#{booking.bookingCode}</p>
          </div>

          {/* Tasker */}
          <div className="flex flex-col gap-0.5">
            {booking.taskerName ? (
              <>
                <p className="font-semibold text-foreground text-sm">{booking.taskerName}</p>
                <p className="text-xs text-muted-foreground font-mono">{booking.taskerPhone}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic">Chưa có</p>
            )}
          </div>

          {/* Schedule */}
          <div className="text-sm text-muted-foreground">
            {booking.scheduledStart
              ? format(new Date(booking.scheduledStart), "dd/MM HH:mm", { locale: vi })
              : <span className="italic text-xs">Chưa xếp</span>}
          </div>

          {/* Price */}
          <div className="font-black text-primary text-sm">
            {vnd(booking.totalPrice)}
          </div>

          {/* Status + arrow */}
          <div className="flex items-center gap-2">
            <StatusBadge status={booking.status} />
            <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" aria-hidden="true" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Taskers Table ─────────────────────────────────────────────────────────────

function TaskersTable({
  items,
  onSelect,
}: {
  items: AdminServiceTasker[];
  onSelect: (t: AdminServiceTasker) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <Users className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Không có nhân sự nào</p>
      </div>
    );
  }

  const MEDALS = ["🥇", "🥈", "🥉"];
  const MEDAL_COLORS = [
    "bg-amber-50 text-amber-700 border-amber-200",
    "bg-slate-50 text-slate-600 border-slate-200",
    "bg-orange-50 text-orange-600 border-orange-200",
  ];

  return (
    <div className="divide-y divide-border/40">
      {/* Header */}
      <div className="hidden md:grid grid-cols-[2.2fr_1fr_1fr_1fr_auto] gap-4 px-6 py-3 bg-muted/30 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
        <span>Nhân viên</span>
        <span>Đánh giá ★</span>
        <span>Tổng đơn</span>
        <span>Gói này</span>
        <span>Trạng thái</span>
      </div>

      {items.map((tasker, idx) => {
        const presence = PRESENCE_CFG[tasker.presenceStatus] ?? { label: tasker.presenceStatus, className: "bg-muted text-muted-foreground" };

        return (
          <div
            key={tasker.id}
            onClick={() => onSelect(tasker)}
            className="grid grid-cols-1 md:grid-cols-[2.2fr_1fr_1fr_1fr_auto] gap-2 md:gap-4 px-6 py-4 hover:bg-muted/20 cursor-pointer transition-all duration-150 group border-l-2 border-l-transparent hover:border-l-primary"
          >
            {/* Name + avatar */}
            <div className="flex items-center gap-3">
              {/* Medal / rank */}
              <div className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black shrink-0 border",
                idx < 3 ? MEDAL_COLORS[idx] : "bg-muted text-muted-foreground border-border text-xs",
              )}>
                {idx < 3 ? MEDALS[idx] : `#${idx + 1}`}
              </div>

              <Avatar className="w-10 h-10 shrink-0 border border-border/50">
                <AvatarImage src={tasker.avatarUrl} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-black">
                  {tasker.fullName?.charAt(0) ?? "T"}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <p className="font-bold text-foreground text-sm truncate group-hover:text-primary transition-colors">
                  {tasker.fullName}
                </p>
                <p className="text-xs text-muted-foreground font-mono">{tasker.phoneNumber}</p>
              </div>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-1.5 text-sm font-black text-amber-600">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
              {tasker.ratingAvg != null ? Number(tasker.ratingAvg).toFixed(1) : "—"}
            </div>

            {/* Total jobs */}
            <div className="text-sm font-bold text-foreground">
              {tasker.totalCompletedJobs ?? 0}
              <span className="text-xs text-muted-foreground font-normal ml-1">đơn</span>
            </div>

            {/* Jobs for this package */}
            <div className="text-sm font-bold text-primary">
              {tasker.jobsForThisService ?? 0}
              <span className="text-xs text-muted-foreground font-normal ml-1">đơn</span>
            </div>

            {/* Status + arrow */}
            <div className="flex items-center gap-2">
              <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold", presence.className)}>
                {presence.label}
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" aria-hidden="true" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Pagination ────────────────────────────────────────────────────────────────

function Pagination({
  current,
  total,
  onChange,
}: {
  current: number;
  total: number;
  onChange: (p: number) => void;
}) {
  if (total <= 1) return null;

  const pages = Array.from({ length: Math.min(total, 7) }, (_, i) => i + 1);

  return (
    <div className="flex items-center justify-center gap-1.5 pt-2">
      <button
        disabled={current === 1}
        onClick={() => onChange(current - 1)}
        className="px-4 py-2 border border-border/50 rounded-xl text-sm font-bold disabled:opacity-30 hover:bg-muted transition-colors disabled:cursor-not-allowed"
      >
        ← Trước
      </button>

      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={cn(
            "w-9 h-9 rounded-xl text-sm font-bold transition-all",
            p === current
              ? "bg-primary text-white shadow-sm shadow-primary/30 scale-105"
              : "border border-border/50 hover:bg-muted text-muted-foreground hover:text-foreground",
          )}
        >
          {p}
        </button>
      ))}

      {total > 7 && (
        <>
          <span className="text-muted-foreground text-sm font-bold">…</span>
          <button
            onClick={() => onChange(total)}
            className={cn(
              "w-9 h-9 rounded-xl text-sm font-bold border border-border/50 hover:bg-muted text-muted-foreground",
              current === total && "bg-primary text-white border-primary",
            )}
          >
            {total}
          </button>
        </>
      )}

      <button
        disabled={current === total}
        onClick={() => onChange(current + 1)}
        className="px-4 py-2 border border-border/50 rounded-xl text-sm font-bold disabled:opacity-30 hover:bg-muted transition-colors disabled:cursor-not-allowed"
      >
        Sau →
      </button>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function PackageOperationsTab({ pkg }: PackageOperationsTabProps) {
  const [mode, setMode] = useState<ViewMode>("bookings");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("newest");
  const [bookingPage, setBookingPage] = useState(1);
  const [taskerPage, setTaskerPage] = useState(1);
  const [selectedBooking, setSelectedBooking] = useState<AdminServiceBooking | null>(null);
  const [selectedTasker, setSelectedTasker] = useState<AdminServiceTasker | null>(null);

  const primarySubServiceId = pkg.packageSubServices?.[0]?.subService?.id ?? "";

  const { data: bookingsData, isLoading: bookingsLoading } = useServiceBookings(
    primarySubServiceId,
    { page: bookingPage, limit: 10 },
  );

  const { data: taskersData, isLoading: taskersLoading } = useServiceTaskers(
    primarySubServiceId,
    { page: taskerPage, limit: 20 },
  );

  // ─── Filter & Sort ─────────────────────────────────────────────────────────

  const filteredBookings = (bookingsData?.items ?? [])
    .filter((b) => {
      if (statusFilter !== "ALL" && b.status !== statusFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        b.bookingCode.toLowerCase().includes(q) ||
        b.customerName.toLowerCase().includes(q) ||
        b.customerPhone.includes(q) ||
        (b.taskerName ?? "").toLowerCase().includes(q) ||
        (b.taskerPhone ?? "").includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === "highest") return Number(b.totalPrice) - Number(a.totalPrice);
      if (sortBy === "lowest") return Number(a.totalPrice) - Number(b.totalPrice);
      return 0;
    });

  const filteredTaskers = (taskersData?.items ?? [])
    .filter((t) => {
      if (statusFilter !== "ALL" && t.presenceStatus !== statusFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return t.fullName.toLowerCase().includes(q) || t.phoneNumber.includes(q);
    })
    .sort((a, b) => {
      if (sortBy === "rating") return Number(b.ratingAvg ?? 0) - Number(a.ratingAvg ?? 0);
      if (sortBy === "jobs") return (b.totalCompletedJobs ?? 0) - (a.totalCompletedJobs ?? 0);
      if (sortBy === "package") return (b.jobsForThisService ?? 0) - (a.jobsForThisService ?? 0);
      return 0;
    });

  const isLoading = mode === "bookings" ? bookingsLoading : taskersLoading;
  const totalPages = mode === "bookings"
    ? (bookingsData?.totalPages ?? 1)
    : (taskersData?.totalPages ?? 1);
  const currentPage = mode === "bookings" ? bookingPage : taskerPage;
  const totalItems = mode === "bookings"
    ? (bookingsData?.total ?? 0)
    : (taskersData?.total ?? 0);

  const handlePageChange = (p: number) => {
    if (mode === "bookings") setBookingPage(p);
    else setTaskerPage(p);
  };

  if (!primarySubServiceId) {
    return (
      <div className="py-20">
        <BaseEmptyState
          title="Chưa có dịch vụ con"
          description="Thêm dịch vụ con vào gói để xem dữ liệu vận hành."
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-foreground">Vận hành</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            <span className="font-bold text-foreground">{totalItems.toLocaleString()}</span>
            {" "}{mode === "bookings" ? "đơn hàng" : "nhân sự"} trong gói
          </p>
        </div>

        {/* Mode toggle pills */}
        <div className="flex rounded-2xl bg-muted/50 p-1.5 gap-1 border border-border/50 self-start sm:self-auto">
          {([
            { key: "bookings" as ViewMode, label: "Lịch sử đặt lịch", icon: ListOrdered },
            { key: "taskers"  as ViewMode, label: "Nhân sự",          icon: Users },
          ]).map((btn) => (
            <button
              key={btn.key}
              onClick={() => {
                setMode(btn.key);
                setSearch("");
                setStatusFilter("ALL");
                setSortBy(btn.key === "bookings" ? "newest" : "rating");
              }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                mode === btn.key
                  ? "bg-primary text-white shadow-sm shadow-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
              )}
            >
              <btn.icon className="w-4 h-4" aria-hidden="true" />
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Search + Filters ─── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder={
              mode === "bookings"
                ? "Tìm mã đơn, tên KH, SĐT, tên Tasker..."
                : "Tìm tên, số điện thoại..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-9 rounded-xl bg-background text-sm"
          />
        </div>

        {/* Filters */}
        <FilterBar
          mode={mode}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          sortBy={sortBy}
          setSortBy={setSortBy}
        />
      </div>

      {/* ─── Table ─── */}
      <div className="border border-border/50 rounded-2xl overflow-hidden bg-card shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center h-52">
            <Loader2 className="w-7 h-7 text-primary animate-spin" aria-hidden="true" />
          </div>
        ) : mode === "bookings" ? (
          <BookingsTable items={filteredBookings} onSelect={setSelectedBooking} />
        ) : (
          <TaskersTable items={filteredTaskers} onSelect={setSelectedTasker} />
        )}
      </div>

      {/* ─── Pagination ─── */}
      <Pagination current={currentPage} total={totalPages} onChange={handlePageChange} />

      {/* ─── Detail Sheets ─── */}
      <BookingDetailSheet
        booking={selectedBooking}
        open={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
      />
      <TaskerDetailSheet
        tasker={selectedTasker}
        open={!!selectedTasker}
        onClose={() => setSelectedTasker(null)}
      />
    </div>
  );
}
