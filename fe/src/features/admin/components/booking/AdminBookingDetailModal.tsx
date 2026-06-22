import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, MapPin, User, Banknote, ShieldCheck, FileText, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  useCancelAdminBooking,
  useAssignTaskerToBooking,
  useActiveTaskers,
} from "../../hooks/useAdminBookings";
import { useState } from "react";

export interface AdminBookingDetail {
  id: string;
  bookingCode?: string;
  status?: string;
  totalPrice?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  scheduledStart?: string;
  durationHours?: number;
  address?: string;
  note?: string;
  customer?: {
    fullName?: string;
    phoneNumber?: string;
  };
  tasker?: {
    fullName?: string;
    phoneNumber?: string;
  };
}

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
  const assignMutation = useAssignTaskerToBooking();
  const taskersQuery = useActiveTaskers();

  const [selectedTasker, setSelectedTasker] = useState<string>('');

  if (!booking) return null;

  const handleCancel = () => {
    if (!window.confirm("Bạn có chắc chắn muốn hủy đơn hàng này không?")) return;
    cancelMutation.mutate(booking.id, {
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

  const handleAssign = () => {
    if (!selectedTasker) {
      toast.error("Vui lòng chọn một Tasker");
      return;
    }
    assignMutation.mutate({ id: booking.id, taskerId: selectedTasker }, {
      onSuccess: () => {
        toast.success("Gán thợ thành công");
        onOpenChange(false);
      },
      onError: (err: unknown) => {
        const error = err as { response?: { data?: { message?: string } } };
        toast.error(error?.response?.data?.message || "Có lỗi xảy ra khi gán thợ");
      }
    });
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-emerald-500 hover:bg-emerald-600">Hoàn Thành</Badge>;
      case 'POSTED':
        return <Badge className="bg-amber-500 hover:bg-amber-600">Đang Tìm Thợ</Badge>;
      case 'IN_PROGRESS':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Đang Thực Hiện</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-red-500 hover:bg-red-600">Đã Hủy</Badge>;
      default:
        return <Badge className="bg-indigo-500 hover:bg-indigo-600">{status}</Badge>;
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            Chi Tiết Booking
            <span className="font-mono text-lg text-primary bg-primary/10 px-3 py-1 rounded-full">
              {booking.bookingCode}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Status & Price */}
          <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-500 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Trạng Thái
              </span>
              {getStatusBadge(booking.status)}
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-500 flex items-center gap-2">
                <Banknote className="w-4 h-4" /> Tổng Tiền
              </span>
              <span className="text-xl font-bold text-slate-900 dark:text-white">
                {formattedPrice}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Phương thức:</span>
              <Badge variant="outline">{booking.paymentMethod}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">T/Thái TT:</span>
              <Badge variant="outline" className={booking.paymentStatus === 'PAID' ? 'text-emerald-500' : 'text-amber-500'}>
                {booking.paymentStatus}
              </Badge>
            </div>
          </div>

          {/* Schedule */}
          <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="font-bold flex items-center gap-2 text-slate-900 dark:text-white border-b pb-2">
              <Clock className="w-5 h-5 text-primary" /> Lịch Hẹn
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-slate-500 block mb-1">Ngày làm việc</span>
                <span className="font-semibold">{formattedDate}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block mb-1">Giờ làm việc</span>
                <span className="font-semibold">{formattedTime}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block mb-1">Thời lượng</span>
                <span className="font-semibold">{booking.durationHours} giờ</span>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 space-y-4 md:col-span-2">
            <h3 className="font-bold flex items-center gap-2 text-slate-900 dark:text-white border-b pb-2">
              <User className="w-5 h-5 text-blue-500" /> Thông Tin Khách Hàng
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-slate-500 block mb-1">Tên khách hàng</span>
                <span className="font-semibold">{booking.customer?.fullName || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block mb-1">Số điện thoại</span>
                <span className="font-semibold">{booking.customer?.phoneNumber || 'N/A'}</span>
              </div>
              <div className="md:col-span-2">
                <span className="text-xs text-slate-500 block mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Địa chỉ làm việc
                </span>
                <span className="font-medium text-sm block bg-white dark:bg-slate-800 p-3 rounded border">
                  {booking.address}
                </span>
              </div>
              {booking.note && (
                <div className="md:col-span-2">
                  <span className="text-xs text-slate-500 block mb-1 flex items-center gap-1">
                    <FileText className="w-3 h-3" /> Ghi chú
                  </span>
                  <span className="font-medium text-sm block bg-amber-50 dark:bg-amber-900/10 text-amber-800 dark:text-amber-200 p-3 rounded border border-amber-200 dark:border-amber-900/30">
                    {booking.note}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Tasker Info */}
          <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 space-y-4 md:col-span-2">
            <h3 className="font-bold flex items-center gap-2 text-slate-900 dark:text-white border-b pb-2">
              <User className="w-5 h-5 text-emerald-500" /> Thông Tin Nhân Viên (Tasker)
            </h3>
            {booking.tasker ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-slate-500 block mb-1">Họ tên Tasker</span>
                  <span className="font-semibold">{booking.tasker.fullName}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block mb-1">Số điện thoại</span>
                  <span className="font-semibold">{booking.tasker.phoneNumber}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 bg-white dark:bg-slate-800 rounded border border-dashed">
                <span className="text-slate-500 text-sm italic">Chưa có nhân viên nhận đơn này.</span>
              </div>
            )}
          </div>
          {/* Actions */}
          <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 space-y-4 md:col-span-2">
            <h3 className="font-bold flex items-center gap-2 text-slate-900 dark:text-white border-b pb-2">
              <CheckCircle2 className="w-5 h-5 text-indigo-500" /> Hành Động Xử Lý
            </h3>
            
            <div className="flex flex-col md:flex-row gap-4 items-end">
              {booking.status === 'POSTED' && (
                <div className="flex-1 space-y-2">
                  <label className="text-xs font-semibold text-slate-500 block">Gán thợ thủ công</label>
                  <div className="flex items-center gap-2">
                    <select 
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={selectedTasker}
                      onChange={(e) => setSelectedTasker(e.target.value)}
                    >
                      <option value="">-- Chọn Tasker --</option>
                      {taskersQuery.data?.map((t: { id: string; fullName: string; phoneNumber: string }) => (
                        <option key={t.id} value={t.id}>{t.fullName} - {t.phoneNumber}</option>
                      ))}
                    </select>
                    <Button 
                      onClick={handleAssign} 
                      disabled={!selectedTasker || assignMutation.isPending}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      Gán Thợ
                    </Button>
                  </div>
                </div>
              )}

              {booking.status !== 'COMPLETED' && booking.status !== 'CANCELLED' && (
                <div className="flex-1 md:flex-none flex justify-end">
                  <Button 
                    variant="destructive" 
                    onClick={handleCancel}
                    disabled={cancelMutation.isPending}
                    className="w-full md:w-auto"
                  >
                    <XCircle className="w-4 h-4 mr-2" /> Hủy Đơn Gấp
                  </Button>
                </div>
              )}
            </div>
            {booking.status === 'COMPLETED' || booking.status === 'CANCELLED' ? (
              <p className="text-sm text-slate-500 italic">Đơn hàng ở trạng thái {booking.status} không thể thực hiện thêm hành động.</p>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
