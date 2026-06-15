"use client"

import * as React from "react"
import { Wallet, History } from "lucide-react"

import { BaseTableList, Column, RowAction } from "@/components/ui/base/base_table_list"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type UserData = {
  id: string
  fullName: string
  phone: string
  email: string
  status: "ACTIVE" | "BLOCKED"
  walletBalance: number
  totalBookings: number
}

const mockData: UserData[] = [
  {
    id: "1",
    fullName: "Lê Minh Tâm",
    phone: "0909000111",
    email: "tam.le@example.com",
    status: "ACTIVE",
    walletBalance: 1500000,
    totalBookings: 12,
  },
  {
    id: "2",
    fullName: "Nguyễn Hoàng",
    phone: "0988777666",
    email: "hoang.nguyen@example.com",
    status: "ACTIVE",
    walletBalance: 0,
    totalBookings: 3,
  },
  {
    id: "3",
    fullName: "Trần Mỹ",
    phone: "0911222333",
    email: "my.tran@example.com",
    status: "BLOCKED",
    walletBalance: 50000,
    totalBookings: 1,
  },
]

export default function AdminUsersPage() {
  const [data] = React.useState<UserData[]>(mockData)
  const [keyword, setKeyword] = React.useState("")

  const filteredData = React.useMemo(() => {
    if (!keyword) return data;
    return data.filter(item => item.phone.includes(keyword) || item.fullName.toLowerCase().includes(keyword.toLowerCase()));
  }, [data, keyword]);

  const columns: Column<UserData>[] = [
    {
      key: "fullName",
      title: "Khách hàng",
      render: (row) => {
        return (
          <div className="flex flex-col">
            <span className="font-bold">{row.fullName}</span>
            <span className="text-xs text-muted-foreground">{row.email}</span>
          </div>
        )
      },
    },
    {
      key: "phone",
      title: "Số điện thoại",
      render: (row) => (
        <span className="font-mono text-sm">{row.phone}</span>
      ),
    },
    {
      key: "totalBookings",
      title: "Số lượng đơn",
      render: (row) => (
        <span className="font-bold text-primary">{row.totalBookings}</span>
      ),
    },
    {
      key: "walletBalance",
      title: "Ví điện tử",
      render: (row) => {
        const formatted = new Intl.NumberFormat("vi-VN", {
          style: "currency",
          currency: "VND",
        }).format(row.walletBalance)
        return <span className="font-semibold text-emerald-600">{formatted}</span>
      },
    },
    {
      key: "status",
      title: "Trạng thái",
      render: (row) => {
        return (
          <Badge className={cn(
            "px-2 py-0.5 rounded-md font-bold text-[10px] uppercase border-none",
            row.status === "ACTIVE" ? "bg-blue-500/10 text-blue-500" :
            "bg-red-500/10 text-red-500"
          )}>
            {row.status}
          </Badge>
        )
      },
    },
  ]

  const rowActions: RowAction<UserData>[] = [
    {
      label: "Lịch sử đặt lịch",
      icon: History,
      onClick: (row) => console.log("History", row.id),
      variant: "default",
    },
    {
      label: "Biến động ví",
      icon: Wallet,
      onClick: (row) => console.log("Wallet", row.id),
      variant: "default",
    },
    {
      type: "ban",
      label: "Khóa tài khoản",
      onClick: (row) => console.log("Ban", row.id),
      hidden: (row) => row.status !== "ACTIVE",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Quản lý Khách hàng
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Tra cứu thông tin, lịch sử đơn hàng và ví của khách hàng.
          </p>
        </div>
      </div>

      <BaseTableList
        columns={columns}
        data={filteredData}
        rowKey="id"
        keyword={keyword}
        onKeywordChange={setKeyword}
        placeholderSearch="Tìm kiếm khách hàng bằng SĐT hoặc Tên..."
        rowActions={rowActions}
        totalItems={filteredData.length}
      />
    </div>
  )
}
