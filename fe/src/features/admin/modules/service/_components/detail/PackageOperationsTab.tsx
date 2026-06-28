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
  PENDING:     { label: "Chờ nhận",   className: "bg-[rgba(217,119,6,0.14)] text-[#D97706] dark:bg-[rgba(217,119,6,0.14)] dark:text-[#D97706]",    dot: "bg-[#D97706]" },
  POSTED:      { label: "Chờ nhận",   className: "bg-[rgba(217,119,6,0.14)] text-[#D97706] dark:bg-[rgba(217,119,6,0.14)] dark:text-[#D97706]",    dot: "bg-[#D97706]" },
  CONFIRMED:   { label: "Đã xác nhận",className: "bg-[rgba(37,99,235,0.12)] text-[#2563EB] dark:bg-[rgba(37,99,235,0.12)] dark:text-[#2563EB]",        dot: "bg-[#2563EB]" },
  ACCEPTED:    { label: "Đã nhận",    className: "bg-[rgba(37,99,235,0.12)] text-[#2563EB] dark:bg-[rgba(37,99,235,0.12)] dark:text-[#2563EB]",        dot: "bg-[#2563EB]" },
  ON_THE_WAY:  { label: "Đang đến",   className: "bg-[rgba(37,99,235,0.12)] text-[#2563EB] dark:bg-[rgba(37,99,235,0.12)] dark:text-[#2563EB]",dot: "bg-[#2563EB]" },
  TASKER_ON_THE_WAY: { label: "Đang đến", className: "bg-[rgba(37,99,235,0.12)] text-[#2563EB] dark:bg-[rgba(37,99,235,0.12)] dark:text-[#2563EB]", dot: "bg-[#2563EB]" },
  CHECKED_IN:  { label: "Đã check-in",className: "bg-[rgba(37,99,235,0.12)] text-[#2563EB] dark:bg-[rgba(37,99,235,0.12)] dark:text-[#2563EB]",       dot: "bg-[#2563EB]" },
  IN_PROGRESS: { label: "Đang làm",   className: "bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)]",                                              dot: "bg-[var(--c-primary)]" },
  COMPLETED:   { label: "Hoàn thành", className: "bg-[rgba(14,159,110,0.12)] text-[#0E9F6E] dark:bg-[rgba(14,159,110,0.12)] dark:text-[#0E9F6E]", dot: "bg-[#0E9F6E]" },
  CANCELLED:   { label: "Đã hủy",     className: "bg-[rgba(225,29,72,0.12)] text-[#E11D48] dark:bg-[rgba(225,29,72,0.12)] dark:text-[#E11D48]",       dot: "bg-[#E11D48]" },
  EXPIRED:     { label: "Hết hạn",    className: "bg-[var(--c-card-2)] text-[var(--c-muted)] dark:bg-[var(--c-card-2)] dark:text-[var(--c-muted)]",      dot: "bg-[var(--c-muted)]" },
};

const PAYMENT_METHOD_CFG: Record<string, { label: string; icon: React.ElementType }> = {
  CASH:   { label: "Tiền mặt", icon: Banknote },
  WALLET: { label: "Ví điện tử", icon: Wallet },
  ONLINE: { label: "Thanh toán online", icon: CreditCard },
};

const PAYMENT_STATUS_CFG: Record<string, { label: string; className: string }> = {
  PENDING:  { label: "Chờ thanh toán", className: "bg-[rgba(217,119,6,0.14)] text-[#D97706]" },
  PAID:     { label: "Đã thanh toán",  className: "bg-[rgba(14,159,110,0.12)] text-[#0E9F6E]" },
  REFUNDED: { label: "Đã hoàn tiền",   className: "bg-[rgba(37,99,235,0.12)] text-[#2563EB]" },
  FAILED:   { label: "Thất bại",       className: "bg-[rgba(225,29,72,0.12)] text-[#E11D48]" },
};

const PRESENCE_CFG: Record<string, { label: string; className: string }> = {
  ONLINE:  { label: "● Online",  className: "bg-[rgba(14,159,110,0.12)] text-[#0E9F6E] dark:bg-[rgba(14,159,110,0.12)] dark:text-[#0E9F6E]" },
  OFFLINE: { label: "● Offline", className: "bg-[var(--c-card-2)] text-[var(--c-muted)] dark:bg-[var(--c-card-2)] dark:text-[var(--c-muted)]" },
};

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { label: status, className: "bg-[var(--c-card-2)] text-[var(--c-muted)]", dot: "bg-[var(--c-muted)]" };
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
      <span className="text-sm text-[var(--c-muted)] shrink-0">{label}</span>
      <span className={cn(
        "text-sm font-semibold text-right",
        highlight ? "text-[var(--c-primary-strong)] text-base" : "text-[var(--c-ink)]",
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
    <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--c-card-2)] border-y border-[var(--c-line)]/40 mt-2">
      <Icon className="w-3.5 h-3.5 text-[var(--c-primary-strong)]" aria-hidden="true" />
      <span className="text-[10px] font-black text-[var(--c-ink)] uppercase tracking-widest">{title}</span>
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
          ? "text-[#E11D48] hover:bg-[rgba(225,29,72,0.12)] dark:hover:bg-[rgba(225,29,72,0.12)]"
          : "text-[var(--c-ink)] hover:bg-[var(--c-card-2)]",
      )}
    >
      <Icon className="w-4 h-4 text-[var(--c-muted)]" aria-hidden="true" />
      {label}
      <ArrowUpRight className="w-3.5 h-3.5 ml-auto text-[var(--c-muted)]" aria-hidden="true" />
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

  const status = STATUS_CFG[booking.status] ?? { label: booking.status, className: "bg-[var(--c-card-2)] text-[var(--c-muted)]", dot: "bg-[var(--c-muted)]" };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="cz-admin w-full sm:max-w-[480px] p-0 overflow-y-auto flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="px-6 py-5 border-b border-[var(--c-line)]/50 bg-[var(--c-card)] sticky top-0 z-10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <SheetTitle className="text-xl font-black text-[var(--c-ink)] flex items-center gap-2">
                <ListOrdered className="w-5 h-5 text-[var(--c-primary-strong)]" aria-hidden="true" />
                Chi tiết đơn hàng
              </SheetTitle>
              <p className="text-sm font-mono text-[var(--c-primary-strong)] mt-1 font-bold">
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
          <div className="divide-y divide-[var(--c-line)]/30">
            <InfoRow label="Họ tên" value={booking.customerName} />
            <InfoRow label="Số điện thoại" value={booking.customerPhone} mono />
            <InfoRow label="Mã khách hàng" value={<span className="text-xs text-[var(--c-muted)]">{booking.customerId}</span>} />
          </div>

          {/* Navigate to customer */}
          <div className="px-3 py-2 border-b border-[var(--c-line)]/30">
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
          <div className="divide-y divide-[var(--c-line)]/30">
            {booking.taskerName ? (
              <>
                <InfoRow label="Họ tên" value={booking.taskerName} />
                <InfoRow label="Số điện thoại" value={booking.taskerPhone ?? "—"} mono />
                <InfoRow label="Mã nhân viên" value={<span className="text-xs text-[var(--c-muted)]">{booking.taskerId}</span>} />
              </>
            ) : (
              <div className="px-4 py-4 text-sm text-[var(--c-muted)] italic flex items-center gap-2">
                <AlertCircle className="w-4 h-4" aria-hidden="true" />
                Chưa có nhân viên nhận đơn
              </div>
            )}
          </div>

          {/* Navigate to tasker */}
          {booking.taskerId && (
            <div className="px-3 py-2 border-b border-[var(--c-line)]/30">
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
          <div className="divide-y divide-[var(--c-line)]/30">
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
          <div className="divide-y divide-[var(--c-line)]/30">
            <InfoRow label="Tổng tiền" value={vnd(booking.totalPrice)} highlight />
          </div>

          {/* Navigate to booking full page */}
          <div className="px-3 py-2 border-b border-[var(--c-line)]/30">
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
          <div className="divide-y divide-[var(--c-line)]/30">
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
    className: "bg-[var(--c-card-2)] text-[var(--c-muted)]",
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="cz-admin w-full sm:max-w-[480px] p-0 overflow-y-auto flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="px-6 py-5 border-b border-[var(--c-line)]/50 bg-[var(--c-card)] sticky top-0 z-10">
          <SheetTitle className="text-xl font-black text-[var(--c-ink)] flex items-center gap-2">
            <Users className="w-5 h-5 text-[var(--c-primary-strong)]" aria-hidden="true" />
            Chi tiết nhân sự
          </SheetTitle>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto pb-8">
          {/* Avatar + Name */}
          <div className="flex flex-col items-center gap-4 px-6 py-8 border-b border-[var(--c-line)]/50">
            <Avatar className="w-24 h-24 border-4 border-[var(--c-card)] shadow-lg ring-2 border-[var(--c-line)]">
              <AvatarImage src={tasker.avatarUrl} />
              <AvatarFallback className="bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)] text-3xl font-black">
                {tasker.fullName?.charAt(0) ?? "T"}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <p className="text-2xl font-black text-[var(--c-ink)]">{tasker.fullName}</p>
              <p className="text-sm text-[var(--c-muted)] mt-0.5">{tasker.phoneNumber}</p>
              <div className="mt-3 flex items-center justify-center gap-2">
                <span className={cn("px-3 py-1 rounded-full text-xs font-bold", presence.className)}>
                  {presence.label}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[var(--c-card-2)] text-[var(--c-muted)]">
                  {tasker.status ?? "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 px-5 py-5 border-b border-[var(--c-line)]/50">
            {[
              { label: "Đánh giá", value: tasker.ratingAvg != null ? Number(tasker.ratingAvg).toFixed(1) : "—", sub: "/ 5 ★", color: "text-[#D97706]", icon: Star },
              { label: "Tổng đơn", value: String(tasker.totalCompletedJobs ?? 0), sub: "đơn", color: "text-[#0E9F6E]", icon: CheckCircle2 },
              { label: "Gói này", value: String(tasker.jobsForThisService ?? 0), sub: "đơn", color: "text-[var(--c-primary-strong)]", icon: Activity },
            ].map((stat) => (
              <div key={stat.label} className="bg-[var(--c-card-2)] border border-[var(--c-line)]/40 rounded-2xl p-4 text-center">
                <stat.icon className={cn("w-5 h-5 mx-auto mb-1.5", stat.color)} aria-hidden="true" />
                <p className="text-2xl font-black text-[var(--c-ink)] leading-none">{stat.value}</p>
                <p className="text-[9px] text-[var(--c-muted)] font-semibold uppercase tracking-wider mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Info */}
          <SectionHeader icon={Briefcase} title="Thông tin chi tiết" />
          <div className="divide-y divide-[var(--c-line)]/30">
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
          <SelectTrigger className="h-9 w-[160px] rounded-xl text-xs font-semibold border-[var(--c-line)]/60 bg-[var(--c-card)]">
            <Filter className="w-3.5 h-3.5 mr-1.5 text-[var(--c-muted)]" aria-hidden="true" />
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent className="cz-admin">
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
          <SelectTrigger className="h-9 w-[150px] rounded-xl text-xs font-semibold border-[var(--c-line)]/60 bg-[var(--c-card)]">
            <Filter className="w-3.5 h-3.5 mr-1.5 text-[var(--c-muted)]" aria-hidden="true" />
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent className="cz-admin">
            <SelectItem value="ALL">Tất cả</SelectItem>
            <SelectItem value="ONLINE">Online</SelectItem>
            <SelectItem value="OFFLINE">Offline</SelectItem>
          </SelectContent>
        </Select>
      )}

      <Select value={sortBy} onValueChange={setSortBy}>
        <SelectTrigger className="h-9 w-[150px] rounded-xl text-xs font-semibold border-[var(--c-line)]/60 bg-[var(--c-card)]">
          <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5 text-[var(--c-muted)]" aria-hidden="true" />
          <SelectValue placeholder="Sắp xếp" />
        </SelectTrigger>
        <SelectContent className="cz-admin">
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
        <ListOrdered className="w-10 h-10 text-[var(--c-muted)] mx-auto mb-3" aria-hidden="true" />
        <p className="text-sm text-[var(--c-muted)]">Không có đơn hàng nào</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[var(--c-line)]/40">
      {/* Header */}
      <div className="hidden md:grid grid-cols-[1.8fr_1.5fr_1fr_1fr_auto] gap-4 px-6 py-3 bg-[var(--c-card-2)] text-[10px] font-black text-[var(--c-muted)] uppercase tracking-widest">
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
          className="grid grid-cols-1 md:grid-cols-[1.8fr_1.5fr_1fr_1fr_auto] gap-2 md:gap-4 px-6 py-4 hover:bg-[var(--c-card-2)] cursor-pointer transition-all duration-150 group border-l-2 border-l-transparent hover:border-l-[var(--c-primary)]"
        >
          {/* Customer */}
          <div className="flex flex-col gap-0.5">
            <p className="font-bold text-[var(--c-ink)] text-sm group-hover:text-[var(--c-primary-strong)] transition-colors">
              {booking.customerName}
            </p>
            <p className="text-xs text-[var(--c-muted)] font-mono">{booking.customerPhone}</p>
            <p className="text-[10px] font-mono text-[var(--c-primary-strong)]/60">#{booking.bookingCode}</p>
          </div>

          {/* Tasker */}
          <div className="flex flex-col gap-0.5">
            {booking.taskerName ? (
              <>
                <p className="font-semibold text-[var(--c-ink)] text-sm">{booking.taskerName}</p>
                <p className="text-xs text-[var(--c-muted)] font-mono">{booking.taskerPhone}</p>
              </>
            ) : (
              <p className="text-sm text-[var(--c-muted)] italic">Chưa có</p>
            )}
          </div>

          {/* Schedule */}
          <div className="text-sm text-[var(--c-muted)]">
            {booking.scheduledStart
              ? format(new Date(booking.scheduledStart), "dd/MM HH:mm", { locale: vi })
              : <span className="italic text-xs">Chưa xếp</span>}
          </div>

          {/* Price */}
          <div className="font-black text-[var(--c-primary-strong)] text-sm">
            {vnd(booking.totalPrice)}
          </div>

          {/* Status + arrow */}
          <div className="flex items-center gap-2">
            <StatusBadge status={booking.status} />
            <ChevronRight className="w-4 h-4 text-[var(--c-muted)] group-hover:text-[var(--c-primary-strong)] transition-colors shrink-0" aria-hidden="true" />
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
        <Users className="w-10 h-10 text-[var(--c-muted)] mx-auto mb-3" aria-hidden="true" />
        <p className="text-sm text-[var(--c-muted)]">Không có nhân sự nào</p>
      </div>
    );
  }

  const MEDALS = ["🥇", "🥈", "🥉"];
  const MEDAL_COLORS = [
    "bg-[rgba(217,119,6,0.14)] text-[#D97706] border-[#D97706]",
    "bg-[var(--c-card-2)] text-[var(--c-muted)] border-[var(--c-line)]",
    "bg-[rgba(217,119,6,0.14)] text-[#D97706] border-[#D97706]",
  ];

  return (
    <div className="divide-y divide-[var(--c-line)]/40">
      {/* Header */}
      <div className="hidden md:grid grid-cols-[2.2fr_1fr_1fr_1fr_auto] gap-4 px-6 py-3 bg-[var(--c-card-2)] text-[10px] font-black text-[var(--c-muted)] uppercase tracking-widest">
        <span>Nhân viên</span>
        <span>Đánh giá ★</span>
        <span>Tổng đơn</span>
        <span>Gói này</span>
        <span>Trạng thái</span>
      </div>

      {items.map((tasker, idx) => {
        const presence = PRESENCE_CFG[tasker.presenceStatus] ?? { label: tasker.presenceStatus, className: "bg-[var(--c-card-2)] text-[var(--c-muted)]" };

        return (
          <div
            key={tasker.id}
            onClick={() => onSelect(tasker)}
            className="grid grid-cols-1 md:grid-cols-[2.2fr_1fr_1fr_1fr_auto] gap-2 md:gap-4 px-6 py-4 hover:bg-[var(--c-card-2)] cursor-pointer transition-all duration-150 group border-l-2 border-l-transparent hover:border-l-[var(--c-primary)]"
          >
            {/* Name + avatar */}
            <div className="flex items-center gap-3">
              {/* Medal / rank */}
              <div className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black shrink-0 border",
                idx < 3 ? MEDAL_COLORS[idx] : "bg-[var(--c-card-2)] text-[var(--c-muted)] border-[var(--c-line)] text-xs",
              )}>
                {idx < 3 ? MEDALS[idx] : `#${idx + 1}`}
              </div>

              <Avatar className="w-10 h-10 shrink-0 border border-[var(--c-line)]/50">
                <AvatarImage src={tasker.avatarUrl} />
                <AvatarFallback className="bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)] text-xs font-black">
                  {tasker.fullName?.charAt(0) ?? "T"}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <p className="font-bold text-[var(--c-ink)] text-sm truncate group-hover:text-[var(--c-primary-strong)] transition-colors">
                  {tasker.fullName}
                </p>
                <p className="text-xs text-[var(--c-muted)] font-mono">{tasker.phoneNumber}</p>
              </div>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-1.5 text-sm font-black text-[#D97706]">
              <Star className="w-3.5 h-3.5 fill-[#D97706] text-[#D97706]" aria-hidden="true" />
              {tasker.ratingAvg != null ? Number(tasker.ratingAvg).toFixed(1) : "—"}
            </div>

            {/* Total jobs */}
            <div className="text-sm font-bold text-[var(--c-ink)]">
              {tasker.totalCompletedJobs ?? 0}
              <span className="text-xs text-[var(--c-muted)] font-normal ml-1">đơn</span>
            </div>

            {/* Jobs for this package */}
            <div className="text-sm font-bold text-[var(--c-primary-strong)]">
              {tasker.jobsForThisService ?? 0}
              <span className="text-xs text-[var(--c-muted)] font-normal ml-1">đơn</span>
            </div>

            {/* Status + arrow */}
            <div className="flex items-center gap-2">
              <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold", presence.className)}>
                {presence.label}
              </span>
              <ChevronRight className="w-4 h-4 text-[var(--c-muted)] group-hover:text-[var(--c-primary-strong)] transition-colors shrink-0" aria-hidden="true" />
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
        className="px-4 py-2 border border-[var(--c-line)]/50 rounded-xl text-sm font-bold disabled:opacity-30 hover:bg-[var(--c-card-2)] transition-colors disabled:cursor-not-allowed"
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
              ? "bg-[var(--c-primary)] text-white shadow-sm shadow-primary/30 scale-105"
              : "border border-[var(--c-line)]/50 hover:bg-[var(--c-card-2)] text-[var(--c-muted)] hover:text-[var(--c-ink)]",
          )}
        >
          {p}
        </button>
      ))}

      {total > 7 && (
        <>
          <span className="text-[var(--c-muted)] text-sm font-bold">…</span>
          <button
            onClick={() => onChange(total)}
            className={cn(
              "w-9 h-9 rounded-xl text-sm font-bold border border-[var(--c-line)]/50 hover:bg-[var(--c-card-2)] text-[var(--c-muted)]",
              current === total && "bg-[var(--c-primary)] text-white border-[var(--c-primary)]",
            )}
          >
            {total}
          </button>
        </>
      )}

      <button
        disabled={current === total}
        onClick={() => onChange(current + 1)}
        className="px-4 py-2 border border-[var(--c-line)]/50 rounded-xl text-sm font-bold disabled:opacity-30 hover:bg-[var(--c-card-2)] transition-colors disabled:cursor-not-allowed"
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
          <h3 className="text-xl font-black text-[var(--c-ink)]">Vận hành</h3>
          <p className="text-sm text-[var(--c-muted)] mt-0.5">
            <span className="font-bold text-[var(--c-ink)]">{totalItems.toLocaleString()}</span>
            {" "}{mode === "bookings" ? "đơn hàng" : "nhân sự"} trong gói
          </p>
        </div>

        {/* Mode toggle pills */}
        <div className="flex rounded-2xl bg-[var(--c-card-2)] p-1.5 gap-1 border border-[var(--c-line)]/50 self-start sm:self-auto">
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
                  ? "bg-[var(--c-primary)] text-white shadow-sm shadow-primary/30"
                  : "text-[var(--c-muted)] hover:text-[var(--c-ink)] hover:bg-[var(--c-card-2)]",
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
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--c-muted)]"
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
            className="pl-10 h-9 rounded-xl bg-[var(--c-card)] text-sm"
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
      <div className="border border-[var(--c-line)]/50 rounded-2xl overflow-hidden bg-[var(--c-card)] shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center h-52">
            <Loader2 className="w-7 h-7 text-[var(--c-primary-strong)] animate-spin" aria-hidden="true" />
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
