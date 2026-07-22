"use client";

import React, { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useAdminCustomerDetail,
  useAdminCustomerBookings,
} from "@/features/admin/modules/customer/hooks/useAdminCustomer";
import { CustomerStatusToggle } from "@/features/admin/modules/customer/_components/CustomerStatusToggle";
import {
  formatVND,
  formatDateTime,
  formatDateTimeFull,
  BOOKING_STATUS_STYLES,
  BOOKING_STATUS_LABELS,
  getBookingPaymentStatusLabel,
  getBookingPaymentStatusTextStyle,
  STAT_CARD_STYLES,
} from "@/features/admin/modules/customer/customer.helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminButton, StatusBadge } from "@/components/admin";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  LogIn,
  CheckCircle,
  XCircle,
  MapPin,
  PawPrint,
  Clock,
  Sparkles,
  DollarSign,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  User,
  History,
  AlertTriangle,
  RotateCcw,
  WalletCards,
  Eye,
  Key,
  Globe,
  CreditCard,
} from "lucide-react";
import { CustomerFinanceTab } from "./CustomerFinanceTab";
import { AdminBookingDetailModal } from "@/features/admin/modules/booking/_components/AdminBookingDetailModal";
import { useAdminBookingDetail } from "@/features/admin/modules/booking/hooks/useAdminBooking";

interface CustomerDetailPageProps {
  customerId: string;
}

interface BookingPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  compact?: boolean;
}

function formatBookingDate(value?: string | null) {
  if (!value) return "Chưa có";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa có";

  return date.toLocaleDateString("vi-VN");
}

function getVisiblePages(page: number, totalPages: number) {
  const maxVisible = 5;
  const half = Math.floor(maxVisible / 2);
  const start = Math.max(1, Math.min(page - half, totalPages - maxVisible + 1));
  const end = Math.min(totalPages, start + maxVisible - 1);

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function BookingPagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  compact = false,
}: BookingPaginationProps) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      let start = Math.max(2, page - 1);
      let end = Math.min(totalPages - 1, page + 1);

      if (page <= 3) {
        end = 4;
      } else if (page >= totalPages - 2) {
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
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 ${
        compact ? "py-1" : "p-3.5 border-t border-[var(--c-line)] bg-[var(--c-card)]"
      } text-xs text-[var(--c-muted)]`}
    >
      <div className="flex items-center gap-2">
        <span>
          Trang <strong className="text-[var(--c-primary-strong)] font-bold">{page}</strong> / {totalPages}
        </span>
        <span className="text-[var(--c-line)]">|</span>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--c-card-2)] border border-[var(--c-line)]">
          Tổng <strong className="mx-1 text-[var(--c-ink)]">{total}</strong> đơn
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={page === 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className="flex items-center justify-center size-8 rounded-xl border border-[var(--c-line)] bg-[var(--c-card)] text-[var(--c-ink)] hover:border-[var(--c-primary-strong)] hover:text-[var(--c-primary-strong)] disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer shadow-2xs"
          title="Trang trước"
        >
          <ChevronLeft className="size-4" />
        </button>

        {!compact &&
          getPageNumbers().map((p, idx) =>
            typeof p === "number" ? (
              <button
                key={idx}
                type="button"
                onClick={() => onPageChange(p)}
                className={`flex items-center justify-center min-w-[32px] h-8 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  p === page
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
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="flex items-center justify-center size-8 rounded-xl border border-[var(--c-line)] bg-[var(--c-card)] text-[var(--c-ink)] hover:border-[var(--c-primary-strong)] hover:text-[var(--c-primary-strong)] disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer shadow-2xs"
          title="Trang sau"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

export const CustomerDetailPage: React.FC<CustomerDetailPageProps> = ({ customerId }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "FINANCE">(
    searchParams.get("tab") === "finance" ? "FINANCE" : "OVERVIEW"
  );
  const [bookingPage, setBookingPage] = useState(1);
  const bookingLimit = 10;

  const [selectedBookingIdForDetail, setSelectedBookingIdForDetail] = useState<string | null>(null);
  const [bookingDetailModalOpen, setBookingDetailModalOpen] = useState(false);

  const { booking: detailedBooking } = useAdminBookingDetail(selectedBookingIdForDetail);

  const {
    data: customer,
    isLoading,
    isError,
    error,
    refetch,
  } = useAdminCustomerDetail(customerId);
  const { data: bookingsData, isLoading: isBookingsLoading } = useAdminCustomerBookings(
    customerId,
    bookingPage,
    bookingLimit
  );

  const bookings = bookingsData?.data || [];
  const meta = bookingsData?.meta;
  const totalBookings = meta?.total ?? 0;
  const totalPages = Math.max(1, meta?.totalPages || 1);
  const effectiveBookingPage = meta?.page ?? bookingPage;
  const effectiveBookingLimit = meta?.limit ?? bookingLimit;
  const canPaginateBookings = totalBookings > effectiveBookingLimit;
  const headerPagination = useMemo(
    () => (
      <BookingPagination
        page={effectiveBookingPage}
        totalPages={totalPages}
        total={totalBookings}
        limit={effectiveBookingLimit}
        onPageChange={setBookingPage}
        compact
      />
    ),
    [effectiveBookingLimit, effectiveBookingPage, totalBookings, totalPages],
  );

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-36 rounded-2xl" />
            <Skeleton className="h-36 rounded-2xl" />
          </div>
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  const errorStatus = (error as { response?: { status?: number } })?.response?.status;
  const isNotFound = errorStatus === 404;

  // Lỗi thực sự (500/mạng), không phải 404 — cho phép người dùng thử lại.
  if (isError && !isNotFound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <AlertTriangle className="w-16 h-16 text-[var(--c-muted)]" />
        <h2 className="text-xl font-bold text-[var(--c-ink)]">Không tải được dữ liệu khách hàng</h2>
        <p className="text-[var(--c-muted)]">
          Đã có lỗi xảy ra khi tải thông tin khách hàng. Vui lòng thử lại.
        </p>
        <div className="flex items-center gap-2">
          <AdminButton
            variant="secondary"
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => router.push("/admin/customers")}
          >
            Quay lại
          </AdminButton>
          <AdminButton
            variant="primary"
            icon={<RotateCcw className="w-4 h-4" />}
            onClick={() => refetch()}
          >
            Thử lại
          </AdminButton>
        </div>
      </div>
    );
  }

  // 404 thật hoặc query thành công nhưng không có dữ liệu.
  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <User className="w-16 h-16 text-[var(--c-muted)]" />
        <h2 className="text-xl font-bold text-[var(--c-ink)]">Không tìm thấy khách hàng</h2>
        <p className="text-[var(--c-muted)]">Dữ liệu đã bị xóa hoặc ID không hợp lệ.</p>
        <AdminButton
          variant="secondary"
          icon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => router.push("/admin/customers")}
        >
          Quay lại
        </AdminButton>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        type="button"
        onClick={() => router.push("/admin/customers")}
        className="flex items-center gap-2 text-xs font-bold text-[var(--c-muted)] hover:text-[var(--c-ink)] transition-colors group w-fit cursor-pointer"
      >
        <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
        Quay lại danh sách khách hàng
      </button>

      {/* Page Header (Hero Banner) */}
      <div className="rounded-2xl border border-[var(--c-line)] bg-[var(--c-card)] p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="flex items-center gap-4.5">
          <div className="relative size-16 rounded-2xl bg-gradient-to-br from-[#fd7e14] to-[#e8590c] text-white flex items-center justify-center font-black text-2xl shrink-0 shadow-md ring-4 ring-[var(--c-primary-soft)]">
            {customer.avatarUrl ? (
              <img
                src={customer.avatarUrl}
                alt={customer.fullName}
                className="w-full h-full rounded-2xl object-cover"
              />
            ) : (
              customer.fullName?.[0]?.toUpperCase() || "C"
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-black tracking-tight text-[var(--c-ink)]">{customer.fullName}</h1>
              {customer.isVerified && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-500/20">
                  <ShieldCheck className="size-3.5 text-emerald-600" /> Đã xác thực
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold text-[var(--c-muted)] flex-wrap">
              <span className="flex items-center gap-1.5">
                <Mail className="size-3.5 text-[var(--c-muted)]" />
                {customer.email}
              </span>
              {customer.phone && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <Phone className="size-3.5 text-[var(--c-muted)]" />
                    {customer.phone}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          <CustomerStatusToggle
            customerId={customer.id}
            isActive={customer.isActive}
            fullName={customer.fullName}
          />
        </div>
      </div>

      {/* Tabs Navigation (Sidebar matched) */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-[var(--c-card-2)] border border-[var(--c-line)] w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("OVERVIEW")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === "OVERVIEW"
              ? "bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)] border border-[var(--c-primary-strong)]/30 shadow-2xs"
              : "text-[var(--c-muted)] hover:text-[var(--c-ink)]"
          }`}
        >
          <User className="size-4" />
          Thông tin & Đơn hàng
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("FINANCE")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === "FINANCE"
              ? "bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)] border border-[var(--c-primary-strong)]/30 shadow-2xs"
              : "text-[var(--c-muted)] hover:text-[var(--c-ink)]"
          }`}
        >
          <WalletCards className="size-4" />
          Ví & Tài chính 360°
        </button>
      </div>

      {activeTab === "FINANCE" ? (
        <CustomerFinanceTab customerId={customer.id} />
      ) : (
      /* Content Grid */
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Profile Info */}
        <div className="lg:col-span-1 space-y-4">
          {/* Account Info */}
          <div className="bg-[var(--c-card)] border border-[var(--c-line)] rounded-2xl p-5 space-y-3 shadow-xs">
            <h3 className="text-sm font-bold text-[var(--c-ink)] flex items-center gap-2 pb-2.5 border-b border-[var(--c-line)]">
              <User className="w-4 h-4 text-[var(--c-muted)]" /> Thông tin tài khoản chi tiết
            </h3>
            <div className="divide-y divide-[var(--c-line)]">
              {[
                { icon: Mail, label: "Email", value: customer.email },
                { icon: Phone, label: "Điện thoại", value: customer.phone || "Chưa cập nhật" },
                { icon: ShieldCheck, label: "Trạng thái xác thực", value: customer.isVerified ? "Đã xác thực" : "Chưa xác thực" },
                { icon: Key, label: "Mã ID Tài khoản", value: customer.userId || customer.id, isCode: true },
                { icon: Globe, label: "Hình thức Đăng ký", value: customer.provider || "LOCAL" },
                { icon: CreditCard, label: "Thanh toán Mặc định", value: customer.defaultPaymentMethod || "Ví CleanZ / Tiền mặt" },
                { icon: Calendar, label: "Ngày tham gia", value: formatDateTime(customer.createdAt) },
                { icon: LogIn, label: "Đăng nhập cuối", value: formatDateTime(customer.lastLogin) },
                ...(customer.updatedBy
                  ? [
                      {
                        icon: History,
                        label: "Cập nhật bởi",
                        value: `${customer.updatedByName ?? "Admin"} · ${formatDateTimeFull(customer.updatedAt)}`,
                      },
                    ]
                  : []),
              ].map(({ icon: Icon, label, value, isCode }) => (
                <div key={label} className="flex items-center justify-between gap-3 py-2.5 first:pt-1 last:pb-1">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className="w-3.5 h-3.5 text-[var(--c-muted)] shrink-0" />
                    <span className="text-xs text-[var(--c-muted)] font-medium truncate">{label}</span>
                  </div>
                  <span className={`text-xs font-semibold text-[var(--c-ink)] text-right truncate max-w-[55%] ${isCode ? "font-mono text-[var(--c-ink-soft)]" : ""}`}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Saved Addresses */}
          <div className="bg-[var(--c-card)] border border-[var(--c-line)] rounded-2xl p-5 space-y-3 shadow-xs">
            <h3 className="text-sm font-bold text-[var(--c-ink)] flex items-center gap-2 pb-2.5 border-b border-[var(--c-line)]">
              <MapPin className="w-4 h-4 text-[var(--c-muted)]" />
              Địa chỉ đã lưu ({customer.addresses.length})
            </h3>
            {customer.addresses.length === 0 ? (
              <div className="text-center p-5 border border-dashed border-[var(--c-line)] rounded-xl">
                <p className="text-xs text-[var(--c-muted)]">Chưa lưu địa chỉ nào.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {customer.addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="p-3 bg-[var(--c-card-2)] border border-[var(--c-line)] rounded-xl space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-[var(--c-ink)]">
                        {addr.label}
                      </span>
                      <div className="flex items-center gap-1">
                        {addr.isDefault && (
                          <Badge variant="outline" className="bg-[var(--c-card)] text-[var(--c-ink-soft)] border-[var(--c-line)] text-[9px] py-0 px-1.5 font-bold">
                            Mặc định
                          </Badge>
                        )}
                        {addr.hasPet && (
                          <Badge variant="outline" className="bg-[var(--c-card)] text-[var(--c-muted)] border-[var(--c-line)] text-[9px] py-0 px-1.5 font-bold flex items-center gap-0.5">
                            <PawPrint className="w-2.5 h-2.5" /> Thú cưng
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-[var(--c-muted)] leading-relaxed">{addr.fullAddress}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Stats + Bookings */}
        <div className="lg:col-span-2 space-y-4">
          {/* Stats Cards */}
          <div className="bg-[var(--c-card)] border border-[var(--c-line)] rounded-2xl p-5 space-y-3 shadow-xs">
            <h3 className="text-sm font-bold text-[var(--c-ink)] flex items-center gap-2 pb-2.5 border-b border-[var(--c-line)]">
              <TrendingUp className="w-4 h-4 text-[var(--c-muted)]" /> Thống kê giao dịch
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  label: "Tổng chi tiêu",
                  sub: "Đã thanh toán",
                  value: formatVND(customer.stats.totalSpent),
                  icon: DollarSign,
                },
                {
                  label: "Số đơn hàng",
                  sub: "Tổng lịch sử",
                  value: `${customer.stats.totalBookings} đơn`,
                  icon: Briefcase,
                },
                {
                  label: "Đơn đã hủy",
                  sub: "Không thành công",
                  value: `${customer.stats.cancelledBookings} đơn`,
                  icon: XCircle,
                },
                {
                  label: "Tỉ lệ HT",
                  sub: "Tỷ lệ thành công",
                  value: `${customer.stats.completionRate}%`,
                  icon: CheckCircle,
                },
              ].map(({ label, sub, value, icon: Icon }) => (
                <div key={label} className="p-3.5 rounded-xl border border-[var(--c-line)] bg-[var(--c-card-2)] space-y-2 hover:border-[var(--c-line-strong)] transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[var(--c-muted)] uppercase tracking-wider">{label}</span>
                    <div className="p-1.5 rounded-lg border border-[var(--c-line)] bg-[var(--c-card)] text-[var(--c-muted)]">
                      <Icon className="size-3.5" />
                    </div>
                  </div>
                  <div>
                    <p className="text-base font-black truncate text-[var(--c-ink)]">{value}</p>
                    <p className="text-[10px] text-[var(--c-muted)] mt-0.5 font-medium">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Booking History */}
          <div className="bg-[var(--c-card)] border border-[var(--c-line)] rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--c-line)]">
              <h3 className="text-sm font-bold text-[var(--c-ink)] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[var(--c-muted)]" />
                Lịch sử đặt dịch vụ
                {meta?.total !== undefined && (
                  <span className="ml-1 text-[10px] font-bold bg-[var(--c-card-2)] text-[var(--c-muted)] px-2.5 py-0.5 rounded-full border border-[var(--c-line)]">
                    {meta.total} đơn
                  </span>
                )}
              </h3>
            </div>

            {isBookingsLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center p-10 border border-dashed border-[var(--c-line)] rounded-xl bg-[var(--c-card)]">
                <Sparkles className="w-8 h-8 text-[var(--c-muted)] mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold text-[var(--c-ink)]">Chưa có lịch sử giao dịch nào</p>
                <p className="text-xs text-[var(--c-muted)] mt-0.5">Khách hàng chưa thực hiện đặt lịch dịch vụ trên CleanZ.</p>
              </div>
            ) : (
              <div className="border border-[var(--c-line)] rounded-2xl overflow-hidden bg-[var(--c-card)]">
                <Table>
                  <TableHeader className="bg-[var(--c-card-2)]">
                    <TableRow className="hover:bg-transparent border-b border-[var(--c-line)]">
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider py-3 text-[var(--c-muted)]">Mã đơn</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider py-3 text-[var(--c-muted)]">Ngày đặt</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider py-3 text-[var(--c-muted)]">Tổng tiền</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider py-3 text-[var(--c-muted)]">Trạng thái</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider py-3 text-[var(--c-muted)]">Thanh toán</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider py-3 text-center text-[var(--c-muted)]">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((booking) => (
                      <TableRow key={booking.id} className="hover:bg-[var(--c-card-2)] border-b border-[var(--c-line)] transition-colors">
                        <TableCell className="font-bold text-xs text-[var(--c-ink)] py-3 font-mono">
                          #{booking.bookingCode}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-[var(--c-muted)] py-3">
                          {formatBookingDate(booking.createdAt)}
                        </TableCell>
                        <TableCell className="font-black text-xs text-[var(--c-ink)] py-3">
                          {formatVND(booking.totalPrice)}
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold border uppercase px-2 py-0.5 rounded-lg ${BOOKING_STATUS_STYLES[booking.status] || "bg-[var(--c-card-2)] text-[var(--c-muted)]"}`}
                          >
                            {BOOKING_STATUS_LABELS[booking.status] || booking.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className={`text-[10px] font-bold uppercase ${getBookingPaymentStatusTextStyle(booking.status, booking.paymentStatus)}`}>
                            {getBookingPaymentStatusLabel(booking.status, booking.paymentStatus)}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBookingIdForDetail(booking.id);
                              setBookingDetailModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[var(--c-card-2)] border border-[var(--c-line)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)]/80 transition-all cursor-pointer shadow-2xs"
                            title="Xem chi tiết đơn hàng"
                          >
                            <Eye className="size-3.5 text-[var(--c-muted)]" />
                            Chi tiết
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <BookingPagination
                  page={effectiveBookingPage}
                  totalPages={totalPages}
                  total={totalBookings}
                  limit={effectiveBookingLimit}
                  onPageChange={setBookingPage}
                />
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Booking Detail Modal */}
      <AdminBookingDetailModal
        open={bookingDetailModalOpen}
        onOpenChange={setBookingDetailModalOpen}
        booking={detailedBooking ?? null}
      />
    </div>
  );
};
