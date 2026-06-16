"use client"

import * as React from "react"
import { CheckCircle2, XCircle } from "lucide-react"

import { BaseTableList, Column, RowAction } from "@/components/ui/base/base_table_list"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type BookingData = {
  id: string
  code: string
  customerName: string
  serviceName: string
  status: "POSTED" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
  totalPrice: number
  scheduledStart: string
}

const mockData: BookingData[] = [
  {
    id: "1",
    code: "BK-12045",
    customerName: "Lê Minh Tâm",
    serviceName: "Dọn nhà chuyên sâu",
    status: "POSTED",
    totalPrice: 450000,
    scheduledStart: "2024-03-25T08:00:00Z",
  },
  {
    id: "2",
    code: "BK-12046",
    customerName: "Nguyễn Hoàng",
    serviceName: "Vệ sinh máy lạnh",
    status: "IN_PROGRESS",
    totalPrice: 200000,
    scheduledStart: "2024-03-24T09:00:00Z",
  },
  {
    id: "3",
    code: "BK-12047",
    customerName: "Trần Thị C",
    serviceName: "Dọn dẹp nhà cửa",
    status: "COMPLETED",
    totalPrice: 150000,
    scheduledStart: "2024-03-23T14:00:00Z",
  },
  {
    id: "4",
    code: "BK-12048",
    customerName: "Phạm D",
    serviceName: "Tổng vệ sinh",
    status: "CANCELLED",
    totalPrice: 1500000,
    scheduledStart: "2024-03-26T08:00:00Z",
  },
]

export default function AdminBookingsPage() {
  const [data] = React.useState<BookingData[]>(mockData)
  const [keyword, setKeyword] = React.useState("")

  const filteredData = React.useMemo(() => {
    if (!keyword) return data;
    return data.filter(item => item.code.toLowerCase().includes(keyword.toLowerCase()));
  }, [data, keyword]);

  const columns: Column<BookingData>[] = [
    {
      key: "code",
      title: "Mã Đơn",
      render: (row) => (
        <span className="font-mono text-xs uppercase tracking-wider text-primary font-bold">
          {row.code}
        </span>
      ),
    },
    {
      key: "customerName",
      title: "Khách hàng",
      render: (row) => (
        <span className="font-semibold">{row.customerName}</span>
      ),
    },
    {
      key: "serviceName",
      title: "Dịch vụ",
      render: (row) => (
        <span className="text-muted-foreground">{row.serviceName}</span>
      ),
    },
    {
      key: "scheduledStart",
      title: "Lịch hẹn",
      render: (row) => {
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

  const rowActions: RowAction<BookingData>[] = [
    {
      type: "view",
      label: "Xem chi tiết",
      onClick: (row) => console.log("View", row.id),
    },
    {
      label: "Gán Tasker",
      icon: CheckCircle2,
      onClick: (row) => console.log("Assign", row.id),
      hidden: (row) => row.status !== "POSTED",
      variant: "default",
    },
    {
      label: "Hủy đơn hộ",
      icon: XCircle,
      onClick: (row) => console.log("Cancel", row.id),
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
      </div>

      <BaseTableList
        columns={columns}
        data={filteredData}
        rowKey="id"
        keyword={keyword}
        onKeywordChange={setKeyword}
        placeholderSearch="Tìm kiếm mã đơn (VD: BK-12045)..."
        rowActions={rowActions}
        totalItems={filteredData.length}
      />
    </div>
  )
}
