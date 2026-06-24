"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useAdminCustomerDetail,
  useAdminCustomerBookings,
} from "@/features/admin/modules/customer/hooks/useAdminCustomer";
import { CustomerStatusToggle } from "@/features/admin/modules/customer/_components/CustomerStatusToggle";
import {
  User,
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
  ExternalLink,
} from "lucide-react";

interface CustomerDetailDrawerProps {
  customerId: string;
  isOpen: boolean;
  onClose: () => void;
}

const BOOKING_STATUS_STYLES: Record<string, string> = {
  POSTED: "bg-muted text-muted-foreground border-border/50",
  CONFIRMED: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  TASKER_ON_THE_WAY: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  CHECKED_IN: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  IN_PROGRESS: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  COMPLETED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  CANCELLED: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  EXPIRED: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
};

const BOOKING_STATUS_LABELS: Record<string, string> = {
  POSTED: "Đăng tải",
  CONFIRMED: "Xác nhận",
  TASKER_ON_THE_WAY: "Đang đến",
  CHECKED_IN: "Đã đến",
  IN_PROGRESS: "Đang làm việc",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
  EXPIRED: "Hết hạn",
};

export const CustomerDetailDrawer: React.FC<CustomerDetailDrawerProps> = ({
  customerId,
  isOpen,
  onClose,
}) => {
  const [bookingPage, setBookingPage] = useState(1);
  const bookingLimit = 5;

  const { data: customer, isLoading: isCustomerLoading } = useAdminCustomerDetail(customerId);
  const { data: bookingsData, isLoading: isBookingsLoading } = useAdminCustomerBookings(
    customerId,
    bookingPage,
    bookingLimit
  );

  // Format currency
  const formatVND = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);
  };

  // Format date-time
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const bookings = bookingsData?.data || [];
  const meta = bookingsData?.meta;
  const totalPages = meta?.totalPages || 0;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-xl md:max-w-2xl w-full h-full p-0 flex flex-col bg-background rounded-l-[24px] overflow-hidden border-l border-border/40 shadow-2xl">
        <div className="p-6 border-b border-border/40 flex items-center justify-between shrink-0">
          <SheetHeader className="text-left flex-1">
            <SheetTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Chi tiết khách hàng
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Thông tin chi tiết về lịch sử giao dịch và tài khoản khách hàng.
            </SheetDescription>
          </SheetHeader>
          <Link
            href={`/admin/customers/${customerId}`}
            className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-primary hover:underline transition-colors animate-pulse"
          >
            Xem trang đầy đủ
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isCustomerLoading ? (
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            <div className="flex items-center gap-4">
              <Skeleton className="w-16 h-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        ) : !customer ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <User className="w-12 h-12 text-muted-foreground/60 mb-2" />
            <h3 className="font-semibold text-base">Không tìm thấy khách hàng</h3>
            <p className="text-sm text-muted-foreground">Có lỗi xảy ra hoặc dữ liệu đã bị xóa.</p>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              {/* Profile Card */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-muted/30 rounded-2xl border border-border/30">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shrink-0">
                    {customer.avatarUrl ? (
                      <img
                        src={customer.avatarUrl}
                        alt={customer.fullName}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      customer.fullName[0]?.toUpperCase()
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-bold leading-none">{customer.fullName}</h2>
                      {customer.isVerified && (
                        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-[10px] py-0 px-1.5 font-bold uppercase rounded-md">
                          Đã xác thực
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail className="w-3.5 h-3.5" />
                      <span>{customer.email}</span>
                    </div>
                    {customer.phone && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{customer.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="shrink-0 pt-2 sm:pt-0">
                  <CustomerStatusToggle
                    customerId={customer.id}
                    isActive={customer.isActive}
                    fullName={customer.fullName}
                  />
                </div>
              </div>

              {/* Login & Provider Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="flex items-center gap-3 p-3.5 bg-background rounded-xl border border-border/30">
                  <div className="w-8 h-8 rounded-lg bg-primary/5 text-primary flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Ngày tham gia</p>
                    <p className="text-xs font-semibold text-foreground/80 mt-0.5">{formatDate(customer.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3.5 bg-background rounded-xl border border-border/30">
                  <div className="w-8 h-8 rounded-lg bg-primary/5 text-primary flex items-center justify-center">
                    <LogIn className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Đăng nhập cuối</p>
                    <p className="text-xs font-semibold text-foreground/80 mt-0.5">{formatDate(customer.lastLogin)}</p>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Thống kê giao dịch
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-emerald-500/5 hover:bg-emerald-500/8 transition-colors p-4 rounded-xl border border-emerald-500/10">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-700/80 uppercase tracking-wider">Tổng chi tiêu</span>
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <p className="text-sm font-bold text-emerald-700 mt-2 truncate">
                      {formatVND(customer.stats.totalSpent)}
                    </p>
                  </div>

                  <div className="bg-blue-500/5 hover:bg-blue-500/8 transition-colors p-4 rounded-xl border border-blue-500/10">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-blue-700/80 uppercase tracking-wider">Đơn hàng</span>
                      <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <p className="text-lg font-bold text-blue-700 mt-1">
                      {customer.stats.totalBookings}
                    </p>
                  </div>

                  <div className="bg-rose-500/5 hover:bg-rose-500/8 transition-colors p-4 rounded-xl border border-rose-500/10">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-rose-700/80 uppercase tracking-wider">Đơn đã hủy</span>
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    </div>
                    <p className="text-lg font-bold text-rose-700 mt-1">
                      {customer.stats.cancelledBookings}
                    </p>
                  </div>

                  <div className="bg-amber-500/5 hover:bg-amber-500/8 transition-colors p-4 rounded-xl border border-amber-500/10">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-amber-700/80 uppercase tracking-wider">Hoàn thành</span>
                      <CheckCircle className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <p className="text-lg font-bold text-amber-700 mt-1">
                      {customer.stats.completionRate}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Saved Addresses */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-primary" />
                  Danh sách địa chỉ ({customer.addresses.length})
                </h3>
                {customer.addresses.length === 0 ? (
                  <div className="text-center p-5 border border-dashed border-border/60 rounded-xl">
                    <p className="text-xs text-muted-foreground">Chưa lưu địa chỉ nào.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {customer.addresses.map((addr) => (
                      <div
                        key={addr.id}
                        className="p-3.5 bg-background border border-border/40 hover:border-border/80 transition-colors rounded-xl flex flex-col justify-between gap-3 shadow-none"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-xs text-foreground bg-muted/60 px-2 py-0.5 rounded-[6px]">
                              {addr.label}
                            </span>
                            <div className="flex items-center gap-1">
                              {addr.isDefault && (
                                <Badge variant="default" className="bg-primary/10 hover:bg-primary/15 text-primary border-transparent text-[9px] py-0 px-1 font-bold">
                                  Mặc định
                                </Badge>
                              )}
                              {addr.hasPet && (
                                <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 border-transparent text-[9px] py-0 px-1 font-bold flex items-center gap-0.5">
                                  <PawPrint className="w-2.5 h-2.5" /> Thú cưng
                                </Badge>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {addr.fullAddress}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Booking History */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-primary" />
                  Lịch sử đặt dịch vụ
                </h3>

                {isBookingsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : bookings.length === 0 ? (
                  <div className="text-center p-6 border border-dashed border-border/60 rounded-xl bg-background">
                    <p className="text-xs text-muted-foreground">Chưa có lịch sử giao dịch nào.</p>
                  </div>
                ) : (
                  <div className="border border-border/30 rounded-2xl overflow-hidden bg-background">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow className="hover:bg-transparent border-b border-border/30">
                          <TableHead className="text-[10px] font-bold uppercase tracking-wider py-2">Mã đơn</TableHead>
                          <TableHead className="text-[10px] font-bold uppercase tracking-wider py-2">Thời gian</TableHead>
                          <TableHead className="text-[10px] font-bold uppercase tracking-wider py-2">Tổng tiền</TableHead>
                          <TableHead className="text-[10px] font-bold uppercase tracking-wider py-2">Trạng thái</TableHead>
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
                                className={`text-[10px] font-bold border uppercase px-1.5 py-0.5 rounded-md ${
                                  BOOKING_STATUS_STYLES[booking.status] || "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {BOOKING_STATUS_LABELS[booking.status] || booking.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Simple Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between p-3 border-t border-border/20 bg-muted/10">
                        <span className="text-xs text-muted-foreground">
                          Trang {bookingPage} / {totalPages}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="w-7 h-7 rounded-full shadow-none border-transparent hover:bg-muted"
                            disabled={bookingPage === 1}
                            onClick={() => setBookingPage((p) => Math.max(1, p - 1))}
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="w-7 h-7 rounded-full shadow-none border-transparent hover:bg-muted"
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
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
};
