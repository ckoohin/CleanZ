"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
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
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_TEXT_STYLES,
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
} from "lucide-react";

interface CustomerDetailPageProps {
  customerId: string;
}

export const CustomerDetailPage: React.FC<CustomerDetailPageProps> = ({ customerId }) => {
  const router = useRouter();
  const [bookingPage, setBookingPage] = useState(1);
  const bookingLimit = 10;

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
  const totalPages = meta?.totalPages || 0;

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
        onClick={() => router.push("/admin/customers")}
        className="flex items-center gap-2 text-sm font-semibold text-[var(--c-muted)] hover:text-[var(--c-ink)] transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Quay lại danh sách
      </button>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)] flex items-center justify-center font-black text-xl shrink-0 border border-[var(--c-primary)]/20">
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
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black text-[var(--c-ink)]">{customer.fullName}</h1>
              {customer.isVerified && (
                <StatusBadge tone="success" className="text-[10px] py-0 px-1.5 uppercase rounded-md">
                  <ShieldCheck className="w-3 h-3" /> Đã xác thực
                </StatusBadge>
              )}
            </div>
            <p className="text-sm text-[var(--c-muted)] mt-0.5">
              {customer.email} {customer.phone && `• ${customer.phone}`}
            </p>
          </div>
        </div>
        <CustomerStatusToggle
          customerId={customer.id}
          isActive={customer.isActive}
          fullName={customer.fullName}
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Profile Info */}
        <div className="lg:col-span-1 space-y-4">
          {/* Account Info */}
          <div className="bg-[var(--c-card)] border border-[var(--c-line)] rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-[var(--c-ink)] flex items-center gap-2">
              <User className="w-4 h-4 text-[var(--c-primary-strong)]" /> Thông tin tài khoản
            </h3>
            <div className="space-y-3">
              {[
                { icon: Mail, label: "Email", value: customer.email },
                { icon: Phone, label: "Điện thoại", value: customer.phone || "Chưa cập nhật" },
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
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--c-card-2)] flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-[var(--c-muted)]" />
                  </div>
                  <div>
                    <p className="text-[10px] text-[var(--c-muted)] font-semibold uppercase tracking-wider">{label}</p>
                    <p className="text-xs font-semibold text-[var(--c-ink-soft)] mt-0.5">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Saved Addresses */}
          <div className="bg-[var(--c-card)] border border-[var(--c-line)] rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-[var(--c-ink)] flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[var(--c-primary-strong)]" />
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
                    className="p-3.5 bg-[var(--c-card)] border border-[var(--c-line)] hover:border-[var(--c-line-strong)] transition-colors rounded-xl"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-semibold text-xs text-[var(--c-ink)] bg-[var(--c-card-2)] px-2 py-0.5 rounded-[6px]">
                        {addr.label}
                      </span>
                      <div className="flex items-center gap-1">
                        {addr.isDefault && (
                          <Badge variant="default" className="bg-[var(--c-primary-soft)] hover:bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)] border-transparent text-[9px] py-0 px-1 font-bold">
                            Mặc định
                          </Badge>
                        )}
                        {addr.hasPet && (
                          <Badge variant="secondary" className="bg-[rgba(217,119,6,0.14)] text-[#D97706] border-transparent text-[9px] py-0 px-1 font-bold flex items-center gap-0.5">
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
          <div className="bg-[var(--c-card)] border border-[var(--c-line)] rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-[var(--c-ink)] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[var(--c-primary-strong)]" /> Thống kê giao dịch
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {([
                {
                  label: "Tổng chi tiêu",
                  value: formatVND(customer.stats.totalSpent),
                  icon: DollarSign,
                  color: "emerald",
                },
                {
                  label: "Số đơn hàng",
                  value: customer.stats.totalBookings,
                  icon: Briefcase,
                  color: "blue",
                },
                {
                  label: "Đơn đã hủy",
                  value: customer.stats.cancelledBookings,
                  icon: XCircle,
                  color: "red",
                },
                {
                  label: "Tỉ lệ HT",
                  value: `${customer.stats.completionRate}%`,
                  icon: CheckCircle,
                  color: "amber",
                },
              ] as const).map(({ label, value, icon: Icon, color }) => {
                const style = STAT_CARD_STYLES[color];
                return (
                  <div key={label} className={`p-4 rounded-xl border ${style.wrap}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${style.label}`}>{label}</span>
                      <Icon className={`w-3.5 h-3.5 ${style.icon}`} />
                    </div>
                    <p className={`text-sm font-black truncate ${style.value}`}>{value}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Booking History */}
          <div className="bg-[var(--c-card)] border border-[var(--c-line)] rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-[var(--c-ink)] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--c-primary-strong)]" />
              Lịch sử đặt dịch vụ
              {meta?.total !== undefined && (
                <span className="ml-1 text-[10px] font-bold bg-[var(--c-card-2)] text-[var(--c-muted)] px-2 py-0.5 rounded-full">
                  {meta.total} đơn
                </span>
              )}
            </h3>

            {isBookingsLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center p-10 border border-dashed border-[var(--c-line)] rounded-xl bg-[var(--c-card)]">
                <Sparkles className="w-8 h-8 text-[var(--c-muted)] mx-auto mb-2" />
                <p className="text-sm text-[var(--c-muted)]">Chưa có lịch sử giao dịch nào.</p>
              </div>
            ) : (
              <div className="border border-[var(--c-line)] rounded-2xl overflow-hidden bg-[var(--c-card)]">
                <Table>
                  <TableHeader className="bg-[var(--c-card-2)]">
                    <TableRow className="hover:bg-transparent border-b border-[var(--c-line)]">
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider py-2.5 text-[var(--c-muted)]">Mã đơn</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider py-2.5 text-[var(--c-muted)]">Ngày đặt</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider py-2.5 text-[var(--c-muted)]">Tổng tiền</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider py-2.5 text-[var(--c-muted)]">Trạng thái</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider py-2.5 text-[var(--c-muted)]">Thanh toán</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((booking) => (
                      <TableRow key={booking.id} className="hover:bg-[var(--c-card-2)] border-b border-[var(--c-line)]">
                        <TableCell className="font-semibold text-xs text-[var(--c-ink-soft)] py-3">
                          #{booking.bookingCode}
                        </TableCell>
                        <TableCell className="text-xs text-[var(--c-muted)] py-3">
                          {new Date(booking.scheduledStart).toLocaleDateString("vi-VN")}
                        </TableCell>
                        <TableCell className="font-semibold text-xs text-[var(--c-ink-soft)] py-3">
                          {formatVND(booking.totalPrice)}
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold border uppercase px-1.5 py-0.5 rounded-md ${BOOKING_STATUS_STYLES[booking.status] || "bg-[var(--c-card-2)] text-[var(--c-muted)]"}`}
                          >
                            {BOOKING_STATUS_LABELS[booking.status] || booking.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className={`text-[10px] font-bold uppercase ${PAYMENT_STATUS_TEXT_STYLES[booking.paymentStatus] || "text-[var(--c-muted)]"}`}>
                            {PAYMENT_STATUS_LABELS[booking.paymentStatus] || booking.paymentStatus}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between p-3 border-t border-[var(--c-line)] bg-[var(--c-card-2)]">
                    <span className="text-xs text-[var(--c-muted)]">
                      Trang {bookingPage} / {totalPages} • {meta?.total} đơn tổng cộng
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="w-8 h-8 rounded-full shadow-none border-[var(--c-line-strong)] bg-[var(--c-card)] text-[var(--c-ink-soft)] hover:bg-[var(--c-card-2)]"
                        disabled={bookingPage === 1}
                        onClick={() => setBookingPage((p) => Math.max(1, p - 1))}
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="w-8 h-8 rounded-full shadow-none border-[var(--c-line-strong)] bg-[var(--c-card)] text-[var(--c-ink-soft)] hover:bg-[var(--c-card-2)]"
                        disabled={bookingPage === totalPages}
                        onClick={() => setBookingPage((p) => Math.min(totalPages, p + 1))}
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
