"use client"

import * as React from "react"
import { CheckCircle2, XCircle, RefreshCw } from "lucide-react"

import { BaseTableList, Column, RowAction } from "@/components/ui/base/base_table_list"
import { PageHeader, AdminButton, StatusBadge, BadgeTone } from "@/components/admin"
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
        <span className="font-mono text-xs uppercase tracking-wider text-[var(--c-primary-strong)] font-bold">
          {row.bookingCode}
        </span>
      ),
    },
    {
      key: "customerName",
      title: "Khách hàng",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-[var(--c-ink)]">{row.customer?.fullName || 'N/A'}</span>
          <span className="text-[10px] text-[var(--c-muted)]">{row.customer?.phone}</span>
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
              <span className="font-semibold text-[#0E9F6E]">{row.tasker.fullName}</span>
              <span className="text-[10px] text-[var(--c-muted)]">{row.tasker.phone}</span>
            </>
          ) : (
            <span className="text-xs text-[var(--c-muted)] italic">Chưa nhận</span>
          )}
        </div>
      ),
    },
    {
      key: "scheduledStart",
      title: "Lịch hẹn",
      render: (row) => {
        if (!row.scheduledStart) return <span className="text-[var(--c-muted)]">N/A</span>
        const date = new Date(row.scheduledStart)
        return (
          <div className="flex flex-col">
            <span className="font-medium text-[var(--c-ink)]">{date.toLocaleDateString("vi-VN")}</span>
            <span className="text-xs text-[var(--c-muted)]">{date.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}</span>
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
        return <span className="font-bold text-[var(--c-ink)]">{formatted}</span>
      },
    },
    {
      key: "status",
      title: "Trạng thái",
      render: (row) => {
        const tone: BadgeTone =
          row.status === "COMPLETED" ? "success" :
          row.status === "POSTED" ? "warning" :
          row.status === "IN_PROGRESS" ? "info" :
          row.status === "CANCELLED" ? "danger" :
          "purple"
        return (
          <StatusBadge tone={tone} className="uppercase">
            {row.status}
          </StatusBadge>
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
      <PageHeader
        title="Quản lý Đơn hàng"
        description="Theo dõi và can thiệp vào các Booking trên hệ thống."
        actions={
          <>
            <AdminButton variant="secondary" onClick={handleExpireOverdue} icon={<RefreshCw className="w-4 h-4" />}>
              Kiểm tra đơn quá hạn
            </AdminButton>
            <AdminButton variant="primary" onClick={() => setIsCreateDrawerOpen(true)}>
              Tạo đơn hộ
            </AdminButton>
          </>
        }
      />

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
