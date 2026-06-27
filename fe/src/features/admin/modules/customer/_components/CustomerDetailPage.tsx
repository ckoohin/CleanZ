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
        <AlertTriangle className="w-16 h-16 text-muted-foreground/40" />
        <h2 className="text-xl font-bold">Không tải được dữ liệu khách hàng</h2>
        <p className="text-muted-foreground">
          Đã có lỗi xảy ra khi tải thông tin khách hàng. Vui lòng thử lại.
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push("/admin/customers")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại
          </Button>
          <Button onClick={() => refetch()}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Thử lại
          </Button>
        </div>
      </div>
    );
  }

  // 404 thật hoặc query thành công nhưng không có dữ liệu.
  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <User className="w-16 h-16 text-muted-foreground/40" />
        <h2 className="text-xl font-bold">Không tìm thấy khách hàng</h2>
        <p className="text-muted-foreground">Dữ liệu đã bị xóa hoặc ID không hợp lệ.</p>
        <Button variant="outline" onClick={() => router.push("/admin/customers")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.push("/admin/customers")}
        className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Quay lại danh sách
      </button>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-xl shrink-0 border border-primary/20">
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
              <h1 className="text-2xl font-black text-foreground">{customer.fullName}</h1>
              {customer.isVerified && (
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px] py-0 px-1.5 font-bold uppercase rounded-md gap-1">
                  <ShieldCheck className="w-3 h-3" /> Đã xác thực
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
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
          <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <User className="w-4 h-4 text-primary" /> Thông tin tài khoản
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
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{label}</p>
                    <p className="text-xs font-semibold text-foreground/90 mt-0.5">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Saved Addresses */}
          <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Địa chỉ đã lưu ({customer.addresses.length})
            </h3>
            {customer.addresses.length === 0 ? (
              <div className="text-center p-5 border border-dashed border-border/60 rounded-xl">
                <p className="text-xs text-muted-foreground">Chưa lưu địa chỉ nào.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {customer.addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="p-3.5 bg-background border border-border/40 hover:border-border/80 transition-colors rounded-xl"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-semibold text-xs text-foreground bg-muted px-2 py-0.5 rounded-[6px]">
                        {addr.label}
                      </span>
                      <div className="flex items-center gap-1">
                        {addr.isDefault && (
                          <Badge variant="default" className="bg-primary/10 hover:bg-primary/15 text-primary border-transparent text-[9px] py-0 px-1 font-bold">
                            Mặc định
                          </Badge>
                        )}
                        {addr.hasPet && (
                          <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-transparent text-[9px] py-0 px-1 font-bold flex items-center gap-0.5">
                            <PawPrint className="w-2.5 h-2.5" /> Thú cưng
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{addr.fullAddress}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Stats + Bookings */}
        <div className="lg:col-span-2 space-y-4">
          {/* Stats Cards */}
          <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Thống kê giao dịch
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
          <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Lịch sử đặt dịch vụ
              {meta?.total !== undefined && (
                <span className="ml-1 text-[10px] font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                  {meta.total} đơn
                </span>
              )}
            </h3>

            {isBookingsLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center p-10 border border-dashed border-border/60 rounded-xl bg-background">
                <Sparkles className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Chưa có lịch sử giao dịch nào.</p>
              </div>
            ) : (
              <div className="border border-border/30 rounded-2xl overflow-hidden bg-background">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent border-b border-border/30">
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider py-2.5">Mã đơn</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider py-2.5">Ngày đặt</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider py-2.5">Tổng tiền</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider py-2.5">Trạng thái</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider py-2.5">Thanh toán</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((booking) => (
                      <TableRow key={booking.id} className="hover:bg-muted/10 border-b border-border/20">
                        <TableCell className="font-semibold text-xs text-foreground/90 py-3">
                          #{booking.bookingCode}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground py-3">
                          {new Date(booking.scheduledStart).toLocaleDateString("vi-VN")}
                        </TableCell>
                        <TableCell className="font-semibold text-xs text-foreground/80 py-3">
                          {formatVND(booking.totalPrice)}
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold border uppercase px-1.5 py-0.5 rounded-md ${BOOKING_STATUS_STYLES[booking.status] || "bg-muted text-muted-foreground"}`}
                          >
                            {BOOKING_STATUS_LABELS[booking.status] || booking.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className={`text-[10px] font-bold uppercase ${PAYMENT_STATUS_TEXT_STYLES[booking.paymentStatus] || "text-muted-foreground"}`}>
                            {PAYMENT_STATUS_LABELS[booking.paymentStatus] || booking.paymentStatus}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between p-3 border-t border-border/20 bg-muted/10">
                    <span className="text-xs text-muted-foreground">
                      Trang {bookingPage} / {totalPages} • {meta?.total} đơn tổng cộng
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="w-8 h-8 rounded-full shadow-none border-border/40 hover:bg-muted"
                        disabled={bookingPage === 1}
                        onClick={() => setBookingPage((p) => Math.max(1, p - 1))}
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="w-8 h-8 rounded-full shadow-none border-border/40 hover:bg-muted"
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
