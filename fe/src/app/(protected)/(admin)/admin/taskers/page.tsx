"use client"

import * as React from "react"
import { FileText, Ban, CheckCircle } from "lucide-react"

import { BaseTableList, Column, RowAction } from "@/components/ui/base/base_table_list"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type TaskerData = {
  id: string
  fullName: string
  phone: string
  docStatus: "PENDING" | "APPROVED" | "REJECTED"
  taskerStatus: "ACTIVE" | "SUSPENDED" | "TERMINATED"
  ratingAvg: number
  totalCompletedJobs: number
}

const mockData: TaskerData[] = [
  {
    id: "1",
    fullName: "Nguyễn Văn A",
    phone: "0901234567",
    docStatus: "APPROVED",
    taskerStatus: "ACTIVE",
    ratingAvg: 4.8,
    totalCompletedJobs: 156,
  },
  {
    id: "2",
    fullName: "Lê Thị B",
    phone: "0912345678",
    docStatus: "PENDING",
    taskerStatus: "ACTIVE",
    ratingAvg: 0,
    totalCompletedJobs: 0,
  },
  {
    id: "3",
    fullName: "Trần Văn C",
    phone: "0987654321",
    docStatus: "APPROVED",
    taskerStatus: "SUSPENDED",
    ratingAvg: 3.5,
    totalCompletedJobs: 45,
  },
]

export default function AdminTaskersPage() {
  const [data] = React.useState<TaskerData[]>(mockData)
  const [keyword, setKeyword] = React.useState("")

  const filteredData = React.useMemo(() => {
    if (!keyword) return data;
    return data.filter(item => item.phone.includes(keyword) || item.fullName.toLowerCase().includes(keyword.toLowerCase()));
  }, [data, keyword]);

  const columns: Column<TaskerData>[] = [
    {
      key: "fullName",
      title: "Họ và tên",
      render: (row) => (
        <span className="font-bold">{row.fullName}</span>
      ),
    },
    {
      key: "phone",
      title: "Số điện thoại",
      render: (row) => (
        <span className="font-mono text-sm">{row.phone}</span>
      ),
    },
    {
      key: "ratingAvg",
      title: "Đánh giá",
      render: (row) => {
        return (
          <div className="flex items-center gap-1">
            <span className="font-bold text-amber-500">{row.ratingAvg > 0 ? row.ratingAvg.toFixed(1) : "N/A"}</span>
            <span className="text-xs text-muted-foreground">({row.totalCompletedJobs} ca)</span>
          </div>
        )
      },
    },
    {
      key: "docStatus",
      title: "Hồ sơ (CMND)",
      render: (row) => {
        return (
          <Badge className={cn(
            "px-2 py-0.5 rounded-md font-bold text-[10px] uppercase border-none",
            row.docStatus === "APPROVED" ? "bg-emerald-500/10 text-emerald-500" :
            row.docStatus === "PENDING" ? "bg-amber-500/10 text-amber-500" :
            "bg-red-500/10 text-red-500"
          )}>
            {row.docStatus}
          </Badge>
        )
      },
    },
    {
      key: "taskerStatus",
      title: "Trạng thái",
      render: (row) => {
        return (
          <Badge className={cn(
            "px-2 py-0.5 rounded-md font-bold text-[10px] uppercase border-none",
            row.taskerStatus === "ACTIVE" ? "bg-blue-500/10 text-blue-500" :
            row.taskerStatus === "SUSPENDED" ? "bg-orange-500/10 text-orange-500" :
            "bg-red-500/10 text-red-500"
          )}>
            {row.taskerStatus}
          </Badge>
        )
      },
    },
  ]

  const rowActions: RowAction<TaskerData>[] = [
    {
      label: "Duyệt hồ sơ",
      icon: FileText,
      onClick: (row) => console.log("Review docs", row.id),
      variant: "default",
    },
    {
      type: "ban",
      label: "Đình chỉ tài khoản",
      onClick: (row) => console.log("Suspend", row.id),
      hidden: (row) => row.taskerStatus !== "ACTIVE",
    },
    {
      label: "Mở khóa tài khoản",
      icon: CheckCircle,
      onClick: (row) => console.log("Unsuspend", row.id),
      hidden: (row) => row.taskerStatus !== "SUSPENDED",
      variant: "default",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Quản lý Đối tác (Tasker)
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Xét duyệt hồ sơ và quản lý hoạt động của nhân viên dọn dẹp.
          </p>
        </div>
      </div>

      <BaseTableList
        columns={columns}
        data={filteredData}
        rowKey="id"
        keyword={keyword}
        onKeywordChange={setKeyword}
        placeholderSearch="Tìm kiếm theo tên hoặc SĐT..."
        rowActions={rowActions}
        totalItems={filteredData.length}
      />
    </div>
  )
}
