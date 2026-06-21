import React, { useState } from "react";
import { useServiceBookings } from "@/features/admin/hooks/useAdminServices";
import { Loader2, Search } from "lucide-react";
import BaseEmptyState from "@/components/ui/base/base_empty_state";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

interface ServiceBookingsTabProps {
  serviceId: string;
}

export function ServiceBookingsTab({ serviceId }: ServiceBookingsTabProps) {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useServiceBookings(serviceId, { page, limit: 10 });

  if (isLoading) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="py-10">
        <BaseEmptyState title="Lỗi tải dữ liệu" description="Không thể tải danh sách đặt lịch lúc này." />
      </div>
    );
  }

  const bookings = data.items;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-foreground">Lịch sử đặt lịch ({data.total})</h3>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Tìm kiếm mã đơn..." className="pl-9 bg-background/50 rounded-xl" />
        </div>
      </div>

      <div className="border border-border/50 rounded-2xl overflow-hidden bg-card shadow-sm">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="font-bold">Mã đơn</TableHead>
              <TableHead className="font-bold">Khách hàng</TableHead>
              <TableHead className="font-bold">Tasker nhận</TableHead>
              <TableHead className="font-bold">Thời gian đặt</TableHead>
              <TableHead className="font-bold">Trạng thái</TableHead>
              <TableHead className="font-bold text-right">Tổng tiền</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Chưa có đơn hàng nào cho dịch vụ này
                </TableCell>
              </TableRow>
            ) : (
              bookings.map((booking) => (
                <TableRow key={booking.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-mono font-medium">{booking.bookingCode}</TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">{booking.customerName}</div>
                    <div className="text-xs text-muted-foreground">{booking.customerPhone}</div>
                  </TableCell>
                  <TableCell>
                    {booking.taskerName ? (
                      <>
                        <div className="font-medium text-foreground">{booking.taskerName}</div>
                        <div className="text-xs text-muted-foreground">{booking.taskerPhone}</div>
                      </>
                    ) : (
                      <span className="text-muted-foreground italic text-sm">Chưa có</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {booking.scheduledStart ? format(new Date(booking.scheduledStart), "dd/MM/yyyy HH:mm", { locale: vi }) : "Chưa xếp lịch"}
                  </TableCell>
                  <TableCell>
                    <span className="px-2.5 py-1 rounded-full bg-secondary/20 text-secondary-foreground text-xs font-bold uppercase">
                      {booking.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-bold text-primary">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(booking.totalPrice)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Basic Pagination */}
      {data.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button 
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 border rounded-lg disabled:opacity-50 text-sm font-medium hover:bg-muted"
          >
            Trang trước
          </button>
          <span className="px-4 py-2 text-sm font-medium">Trang {page} / {data.totalPages}</span>
          <button 
            disabled={page === data.totalPages}
            onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 border rounded-lg disabled:opacity-50 text-sm font-medium hover:bg-muted"
          >
            Trang sau
          </button>
        </div>
      )}
    </div>
  );
}
