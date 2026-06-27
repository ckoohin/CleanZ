import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Clock, MapPin, User, Banknote, ShieldCheck, FileText, CheckCircle2, XCircle } from "lucide-react";
import { AdminButton, StatusBadge, BadgeTone } from "@/components/admin";
import { toast } from "sonner";
import { useCancelAdminBooking } from "@/features/admin/modules/booking/hooks/useAdminBooking";
import { useState } from "react";
import { AssignTaskerDialog } from "@/features/admin/modules/booking/_components/AssignTaskerDialog";
import { ChangeBookingStatusDialog } from "@/features/admin/modules/booking/_components/ChangeBookingStatusDialog";
import { AdminBookingDetail } from "@/features/admin/modules/booking/types/booking.types";

interface AdminBookingDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: AdminBookingDetail | null;
}

export const AdminBookingDetailModal: React.FC<AdminBookingDetailModalProps> = ({
  open,
  onOpenChange,
  booking,
}) => {
  const cancelMutation = useCancelAdminBooking();

  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isChangeStatusOpen, setIsChangeStatusOpen] = useState(false);

  if (!booking) return null;

  const handleCancel = () => {
    if (!window.confirm("Bạn có chắc chắn muốn hủy đơn hàng này không?")) return;
    cancelMutation.mutate({ id: booking.id, reason: "Hủy đơn qua Admin Portal" }, {
      onSuccess: () => {
        toast.success("Hủy đơn thành công");
        onOpenChange(false);
      },
      onError: (err: unknown) => {
        const error = err as { response?: { data?: { message?: string } } };
        toast.error(error?.response?.data?.message || "Có lỗi xảy ra khi hủy đơn");
      }
    });
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'COMPLETED':
        return <StatusBadge tone="success">Hoàn Thành</StatusBadge>;
      case 'POSTED':
        return <StatusBadge tone="warning">Đang Tìm Thợ</StatusBadge>;
      case 'IN_PROGRESS':
        return <StatusBadge tone="info">Đang Thực Hiện</StatusBadge>;
      case 'CANCELLED':
        return <StatusBadge tone="danger">Đã Hủy</StatusBadge>;
      default:
        return <StatusBadge tone="purple">{status}</StatusBadge>;
    }
  };

  const formattedPrice = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(booking.totalPrice || 0);

  const formattedDate = booking.scheduledStart
    ? new Date(booking.scheduledStart).toLocaleDateString("vi-VN")
    : "N/A";
  const formattedTime = booking.scheduledStart
    ? new Date(booking.scheduledStart).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "N/A";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="cz-admin max-w-3xl max-h-[90vh] overflow-y-auto bg-[var(--c-card)] border-[var(--c-line)] text-[var(--c-ink)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl text-[var(--c-ink)]">
            Chi Tiết Booking
            <span className="font-mono text-lg text-[var(--c-primary-strong)] bg-[var(--c-primary-soft)] px-3 py-1 rounded-full">
              {booking.bookingCode}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Status & Price */}
          <div className="bg-[var(--c-card-2)] rounded-xl p-5 border border-[var(--c-line)] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[var(--c-muted)] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Trạng Thái
              </span>
              {getStatusBadge(booking.status)}
            </div>
            <Separator className="bg-[var(--c-line)]" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[var(--c-muted)] flex items-center gap-2">
                <Banknote className="w-4 h-4" /> Tổng Tiền
              </span>
              <span className="text-xl font-bold text-[var(--c-ink)]">
                {formattedPrice}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--c-muted)]">Phương thức:</span>
              <StatusBadge tone="neutral">{booking.paymentMethod}</StatusBadge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--c-muted)]">T/Thái TT:</span>
              <StatusBadge tone={booking.paymentStatus === 'PAID' ? 'success' : 'warning'}>
                {booking.paymentStatus}
              </StatusBadge>
            </div>
          </div>

          {/* Schedule */}
          <div className="bg-[var(--c-card-2)] rounded-xl p-5 border border-[var(--c-line)] space-y-4">
            <h3 className="font-bold flex items-center gap-2 text-[var(--c-ink)] border-b border-[var(--c-line)] pb-2">
              <Clock className="w-5 h-5 text-[var(--c-primary-strong)]" /> Lịch Hẹn
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-[var(--c-muted)] block mb-1">Ngày làm việc</span>
                <span className="font-semibold text-[var(--c-ink)]">{formattedDate}</span>
              </div>
              <div>
                <span className="text-xs text-[var(--c-muted)] block mb-1">Giờ làm việc</span>
                <span className="font-semibold text-[var(--c-ink)]">{formattedTime}</span>
              </div>
              <div>
                <span className="text-xs text-[var(--c-muted)] block mb-1">Thời lượng</span>
                <span className="font-semibold text-[var(--c-ink)]">{booking.durationHours} giờ</span>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-[var(--c-card-2)] rounded-xl p-5 border border-[var(--c-line)] space-y-4 md:col-span-2">
            <h3 className="font-bold flex items-center gap-2 text-[var(--c-ink)] border-b border-[var(--c-line)] pb-2">
              <User className="w-5 h-5 text-[#2563EB]" /> Thông Tin Khách Hàng
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-[var(--c-muted)] block mb-1">Tên khách hàng</span>
                <span className="font-semibold text-[var(--c-ink)]">{booking.customer?.fullName || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs text-[var(--c-muted)] block mb-1">Số điện thoại</span>
                <span className="font-semibold text-[var(--c-ink)]">{booking.customer?.phone || 'N/A'}</span>
              </div>
              <div className="md:col-span-2">
                <span className="text-xs text-[var(--c-muted)] block mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Địa chỉ làm việc
                </span>
                <span className="font-medium text-sm block bg-[var(--c-card)] text-[var(--c-ink)] p-3 rounded border border-[var(--c-line)]">
                  {booking.address?.fullAddress || 'N/A'}
                </span>
              </div>
              {booking.note && (
                <div className="md:col-span-2">
                  <span className="text-xs text-[var(--c-muted)] block mb-1 flex items-center gap-1">
                    <FileText className="w-3 h-3" /> Ghi chú
                  </span>
                  <span className="font-medium text-sm block p-3 rounded border" style={{ background: "rgba(217,119,6,0.14)", color: "#D97706", borderColor: "rgba(217,119,6,0.3)" }}>
                    {booking.note}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Tasker Info */}
          <div className="bg-[var(--c-card-2)] rounded-xl p-5 border border-[var(--c-line)] space-y-4 md:col-span-2">
            <h3 className="font-bold flex items-center gap-2 text-[var(--c-ink)] border-b border-[var(--c-line)] pb-2">
              <User className="w-5 h-5 text-[#0E9F6E]" /> Thông Tin Nhân Viên (Tasker)
            </h3>
            {booking.tasker ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-[var(--c-muted)] block mb-1">Họ tên Tasker</span>
                  <span className="font-semibold text-[var(--c-ink)]">{booking.tasker.fullName}</span>
                </div>
                <div>
                  <span className="text-xs text-[var(--c-muted)] block mb-1">Số điện thoại</span>
                  <span className="font-semibold text-[var(--c-ink)]">{booking.tasker.phone}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 bg-[var(--c-card)] rounded border border-dashed border-[var(--c-line-strong)]">
                <span className="text-[var(--c-muted)] text-sm italic">Chưa có nhân viên nhận đơn này.</span>
              </div>
            )}
          </div>
          {/* Actions */}
          <div className="bg-[var(--c-card-2)] rounded-xl p-5 border border-[var(--c-line)] space-y-4 md:col-span-2">
            <h3 className="font-bold flex items-center gap-2 text-[var(--c-ink)] border-b border-[var(--c-line)] pb-2">
              <CheckCircle2 className="w-5 h-5 text-[#7C3AED]" /> Hành Động Xử Lý
            </h3>

            <div className="flex flex-col md:flex-row gap-4 items-center">
              {booking.status !== 'COMPLETED' && booking.status !== 'CANCELLED' && (
                <>
                  <AdminButton
                    variant="primary"
                    onClick={() => setIsAssignOpen(true)}
                    className="w-full md:w-auto"
                    icon={<User className="w-4 h-4" />}
                  >
                    Gán / Đổi Tasker
                  </AdminButton>

                  <AdminButton
                    onClick={() => setIsChangeStatusOpen(true)}
                    variant="secondary"
                    className="w-full md:w-auto"
                  >
                    Cập nhật trạng thái
                  </AdminButton>

                  <div className="flex-1 md:flex-none flex justify-end ml-auto">
                    <AdminButton
                      variant="danger"
                      onClick={handleCancel}
                      disabled={cancelMutation.isPending}
                      className="w-full md:w-auto"
                      icon={<XCircle className="w-4 h-4" />}
                    >
                      Hủy Đơn Gấp
                    </AdminButton>
                  </div>
                </>
              )}
            </div>
            {booking.status === 'COMPLETED' || booking.status === 'CANCELLED' ? (
              <p className="text-sm text-[var(--c-muted)] italic">Đơn hàng ở trạng thái {booking.status} không thể thực hiện thêm hành động.</p>
            ) : null}
          </div>
        </div>
      </DialogContent>

      {/* Nested Dialogs for Actions */}
      <AssignTaskerDialog
        bookingId={booking.id}
        open={isAssignOpen}
        onOpenChange={setIsAssignOpen}
        currentTaskerId={booking.tasker?.id}
      />
      <ChangeBookingStatusDialog
        bookingId={booking.id}
        currentStatus={booking.status}
        open={isChangeStatusOpen}
        onOpenChange={setIsChangeStatusOpen}
      />
    </Dialog>
  );
};
