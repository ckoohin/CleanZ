"use client"

import * as React from "react"
import { Plus } from "lucide-react"

import { BaseTableList, Column, RowAction } from "@/components/ui/base/base_table_list"
import { BaseButton } from "@/components/ui/base/base_button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type ServiceData = {
  id: string
  name: string
  code: string
  isActive: boolean
  basePrice: number
  priceUnit: string
  durationHours: number
}

const mockData: ServiceData[] = [
  {
    id: "1",
    name: "Dọn dẹp nhà cửa",
    code: "CLEAN_HOME",
    isActive: true,
    basePrice: 150000,
    priceUnit: "VND",
    durationHours: 2,
  },
  {
    id: "2",
    name: "Vệ sinh máy lạnh",
    code: "AC_CLEAN",
    isActive: true,
    basePrice: 200000,
    priceUnit: "VND",
    durationHours: 1,
  },
  {
    id: "3",
    name: "Tổng vệ sinh sau xây dựng",
    code: "DEEP_CLEAN",
    isActive: false,
    basePrice: 1500000,
    priceUnit: "VND",
    durationHours: 8,
  },
]

export default function AdminServicesPage() {
  const [data] = React.useState<ServiceData[]>(mockData)
  const [keyword, setKeyword] = React.useState("")

  const filteredData = React.useMemo(() => {
    if (!keyword) return data;
    return data.filter(item => item.name.toLowerCase().includes(keyword.toLowerCase()));
  }, [data, keyword]);

  const columns: Column<ServiceData>[] = [
    {
      key: "code",
      title: "Mã dịch vụ",
      render: (row) => (
        <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
          {row.code}
        </span>
      ),
    },
    {
      key: "name",
      title: "Tên dịch vụ",
      render: (row) => (
        <span className="font-bold">{row.name}</span>
      ),
    },
    {
      key: "basePrice",
      title: "Giá cơ bản",
      render: (row) => {
        const formatted = new Intl.NumberFormat("vi-VN", {
          style: "currency",
          currency: "VND",
        }).format(row.basePrice)
        return <span className="font-semibold">{formatted}</span>
      },
    },
    {
      key: "durationHours",
      title: "Thời lượng",
      render: (row) => (
        <span>{row.durationHours} giờ</span>
      ),
    },
    {
      key: "isActive",
      title: "Trạng thái",
      render: (row) => {
        return row.isActive ? (
          <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-none">
            Hoạt động
          </Badge>
        ) : (
          <Badge variant="secondary" className="bg-muted text-muted-foreground border-none">
            Tạm ngưng
          </Badge>
        )
      },
    },
  ]

  const rowActions: RowAction<ServiceData>[] = [
    {
      type: "edit",
      label: "Cập nhật",
      onClick: (row) => console.log("Edit", row.id),
    },
    {
      type: "delete",
      label: "Xóa dịch vụ",
      onClick: (row) => console.log("Delete", row.id),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Quản lý Dịch vụ
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Thiết lập danh mục và bảng giá dịch vụ dọn dẹp.
          </p>
        </div>
        <BaseButton variant="primary" className="rounded-xl shadow-lg shadow-primary/20 gap-2 h-11 px-6">
          <Plus className="w-4 h-4" />
          <span className="font-bold uppercase tracking-widest text-[10px]">Thêm Dịch vụ</span>
        </BaseButton>
      </div>

      <BaseTableList
        columns={columns}
        data={filteredData}
        rowKey="id"
        keyword={keyword}
        onKeywordChange={setKeyword}
        placeholderSearch="Tìm kiếm tên dịch vụ..."
        rowActions={rowActions}
        totalItems={filteredData.length}
      />
    </div>
  )
}
