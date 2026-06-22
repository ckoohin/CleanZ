"use client"

import * as React from "react"
import { CheckCircle2, XCircle, RefreshCw } from "lucide-react"

import { BaseTableList, Column, RowAction } from "@/components/ui/base/base_table_list"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

import { useAdminBookings } from "@/features/admin/modules/booking/hooks/useAdminBooking"
import { adminBookingService } from "@/features/admin/modules/booking/services/admin-booking.service"
import { AdminBookingDetailModal } from "@/features/admin/modules/booking/_components/AdminBookingDetailModal"
import { AdminCreateBookingDrawer } from "@/features/admin/modules/booking/_components/AdminCreateBookingDrawer"
import { AdminBookingDetail, AdminBookingItem } from "@/features/admin/modules/booking/types/booking.types"

export function AdminBookingPage() {
  const [keyword, setKeyword] = React.useState("")
  const [page, setPage] = React.useState(1)
  const limit = 10

  const { data, total, isLoading, mutate } = useAdminBookings({
    page,
    limit,
    keyword,
  })

  const [selectedBooking, setSelectedBooking] = React.useState<AdminBookingDetail | null>(null)
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = React.useState(false)

  const handleViewDetail = async (id: string) => {
    try {
      const detail = await adminBookingService.getAdminBookingDetail(id)
      setSelectedBooking(detail)
      setIsModalOpen(true)
    } catch (error) {
      toast.error("Không thể tải chi tiết đơn hàng")
    }
  }

  const handleExpireOverdue = async () => {
    try {
      const res = await adminBookingService.triggerExpireOverdue()
      toast.success(`Đã cập nhật ${res.expiredCount} đơn hàng quá hạn`)
      mutate()
    } catch (error) {
      toast.error("Lỗi khi kiểm tra đơn quá hạn")
    }
  }

  const columns: Column<AdminBookingItem>[] = [
    {
      key: "bookingCode",
      title: "Mã Đơn",
      render: (row) => (
        <span className="font-mono text-xs uppercase tracking-wider text-primary font-bold">
          {row.bookingCode}
        </span>
      ),
    },
    {
      key: "customerName",
      title: "Khách hàng",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold">{row.customer?.fullName || 'N/A'}</span>
          <span className="text-[10px] text-muted-foreground">{row.customer?.phone}</span>
        </div>
      ),
    },
    {
      key: "taskerName",
      title: "Tasker",
      render: (row) => (
        <div className="flex flex-col">
          {row.tasker ? (
            <>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{row.tasker.fullName}</span>
              <span className="text-[10px] text-muted-foreground">{row.tasker.phone}</span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground italic">Chưa nhận</span>
          )}
        </div>
      ),
    },
    {
      key: "scheduledStart",
      title: "Lịch hẹn",
      render: (row) => {
        if (!row.scheduledStart) return <span className="text-muted-foreground">N/A</span>
        const date = new Date(row.scheduledStart)
        return (
          <div className="flex flex-col">
            <span className="font-medium">{date.toLocaleDateString("vi-VN")}</span>
            <span className="text-xs text-muted-foreground">{date.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        )
      },
    },
    {
      key: "totalPrice",
      title: "Tổng tiền",
      render: (row) => {
        const formatted = new Intl.NumberFormat("vi-VN", {
          style: "currency",
          currency: "VND",
        }).format(row.totalPrice)
        return <span className="font-bold">{formatted}</span>
      },
    },
    {
      key: "status",
      title: "Trạng thái",
      render: (row) => {
        return (
          <Badge className={cn(
            "px-3 py-1 rounded-full font-bold text-[10px] uppercase border-none",
            row.status === "COMPLETED" ? "bg-emerald-500/10 text-emerald-500" :
            row.status === "POSTED" ? "bg-amber-500/10 text-amber-500" :
            row.status === "IN_PROGRESS" ? "bg-blue-500/10 text-blue-500" :
            row.status === "CANCELLED" ? "bg-red-500/10 text-red-500" :
            "bg-indigo-500/10 text-indigo-500"
          )}>
            {row.status}
          </Badge>
        )
      },
    },
  ]

  const rowActions: RowAction<AdminBookingItem>[] = [
    {
      type: "view",
      label: "Xem chi tiết",
      onClick: (row) => handleViewDetail(row.id),
    },
    {
      label: "Gán Tasker",
      icon: CheckCircle2,
      onClick: (row) => handleViewDetail(row.id),
      hidden: (row) => row.status !== "POSTED",
      variant: "default",
    },
    {
      label: "Hủy đơn hộ",
      icon: XCircle,
      onClick: (row) => handleViewDetail(row.id),
      hidden: (row) => row.status === "CANCELLED" || row.status === "COMPLETED",
      variant: "destructive",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Quản lý Đơn hàng
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Theo dõi và can thiệp vào các Booking trên hệ thống.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleExpireOverdue} variant="outline" className="border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Kiểm tra đơn quá hạn
          </Button>
          <Button onClick={() => setIsCreateDrawerOpen(true)} className="bg-primary hover:bg-primary/90">
            Tạo đơn hộ
          </Button>
        </div>
      </div>

      <BaseTableList
        columns={columns}
        data={data}
        rowKey="id"
        keyword={keyword}
        onKeywordChange={setKeyword}
        placeholderSearch="Tìm kiếm mã đơn hoặc tên KH..."
        rowActions={rowActions}
        totalItems={total}
        isLoading={isLoading}
      />

      <AdminBookingDetailModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        booking={selectedBooking}
      />

      <AdminCreateBookingDrawer
        open={isCreateDrawerOpen}
        onOpenChange={setIsCreateDrawerOpen}
      />
    </div>
  )
}
