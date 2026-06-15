"use client"

import * as React from "react"
import { CheckCircle2, XCircle, CreditCard } from "lucide-react"

import { BaseTableList, Column, RowAction } from "@/components/ui/base/base_table_list"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type WithdrawalData = {
  id: string
  taskerName: string
  taskerPhone: string
  amount: number
  status: "PENDING" | "APPROVED" | "PROCESSED" | "REJECTED"
  requestDate: string
  bankInfo: string
}

const mockData: WithdrawalData[] = [
  {
    id: "W-001",
    taskerName: "Nguyễn Văn A",
    taskerPhone: "0901234567",
    amount: 1500000,
    status: "PENDING",
    requestDate: "2024-03-25T08:00:00Z",
    bankInfo: "Vietcombank - 0123456789 - NGUYEN VAN A",
  },
  {
    id: "W-002",
    taskerName: "Lê Thị B",
    taskerPhone: "0912345678",
    amount: 500000,
    status: "PROCESSED",
    requestDate: "2024-03-23T09:00:00Z",
    bankInfo: "Techcombank - 9876543210 - LE THI B",
  },
  {
    id: "W-003",
    taskerName: "Trần Văn C",
    taskerPhone: "0987654321",
    amount: 2000000,
    status: "REJECTED",
    requestDate: "2024-03-24T14:00:00Z",
    bankInfo: "MB Bank - 111222333 - TRAN VAN C",
  },
]

export default function AdminFinancesPage() {
  const [data] = React.useState<WithdrawalData[]>(mockData)
  const [keyword, setKeyword] = React.useState("")

  const filteredData = React.useMemo(() => {
    if (!keyword) return data;
    return data.filter(item => item.taskerName.toLowerCase().includes(keyword.toLowerCase()));
  }, [data, keyword]);

  const columns: Column<WithdrawalData>[] = [
    {
      key: "taskerName",
      title: "Tasker",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-bold">{row.taskerName}</span>
          <span className="text-xs text-muted-foreground">{row.taskerPhone}</span>
        </div>
      ),
    },
    {
      key: "amount",
      title: "Số tiền rút",
      render: (row) => {
        const formatted = new Intl.NumberFormat("vi-VN", {
          style: "currency",
          currency: "VND",
        }).format(row.amount)
        return <span className="font-bold text-amber-600">{formatted}</span>
      },
    },
    {
      key: "bankInfo",
      title: "Thông tin Ngân hàng",
      render: (row) => (
        <span className="text-sm">{row.bankInfo}</span>
      ),
    },
    {
      key: "requestDate",
      title: "Ngày yêu cầu",
      render: (row) => {
        const date = new Date(row.requestDate)
        return (
          <div className="flex flex-col">
            <span className="font-medium">{date.toLocaleDateString("vi-VN")}</span>
            <span className="text-xs text-muted-foreground">{date.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        )
      },
    },
    {
      key: "status",
      title: "Trạng thái",
      render: (row) => {
        return (
          <Badge className={cn(
            "px-2 py-0.5 rounded-md font-bold text-[10px] uppercase border-none",
            row.status === "PROCESSED" ? "bg-emerald-500/10 text-emerald-500" :
            row.status === "APPROVED" ? "bg-blue-500/10 text-blue-500" :
            row.status === "PENDING" ? "bg-amber-500/10 text-amber-500" :
            "bg-red-500/10 text-red-500"
          )}>
            {row.status}
          </Badge>
        )
      },
    },
  ]

  const rowActions: RowAction<WithdrawalData>[] = [
    {
      label: "Phê duyệt lệnh",
      icon: CheckCircle2,
      onClick: (row) => console.log("Approve", row.id),
      hidden: (row) => row.status !== "PENDING",
      variant: "default",
    },
    {
      label: "Từ chối lệnh",
      icon: XCircle,
      onClick: (row) => console.log("Reject", row.id),
      hidden: (row) => row.status !== "PENDING",
      variant: "destructive",
    },
    {
      label: "Xác nhận đã chuyển khoản",
      icon: CreditCard,
      onClick: (row) => console.log("Processed", row.id),
      hidden: (row) => row.status !== "APPROVED",
      variant: "default",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Tài chính & Yêu cầu Rút tiền
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Quản lý yêu cầu rút tiền từ Ví điện tử của Tasker.
          </p>
        </div>
      </div>

      <BaseTableList
        columns={columns}
        data={filteredData}
        rowKey="id"
        keyword={keyword}
        onKeywordChange={setKeyword}
        placeholderSearch="Tìm kiếm tên Tasker..."
        rowActions={rowActions}
        totalItems={filteredData.length}
      />
    </div>
  )
}
