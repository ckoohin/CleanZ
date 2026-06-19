"use client";

import React, { useState } from "react";
import { BaseTableList, type Column, type RowAction } from "@/components/ui/base/base_table_list";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminCustomers } from "../hooks/useAdminCustomer";
import type { CustomerListItem } from "../types/customer.types";
import { CustomerStatusToggle } from "./CustomerStatusToggle";
import { CustomerDetailDrawer } from "./CustomerDetailDrawer";
import { CustomerStatsBar } from "./CustomerStatsBar";
import { Eye, ShieldAlert, ListFilter, UserCheck } from "lucide-react";

export const CustomerListTable: React.FC = () => {
  const [filter, setFilter] = useState<{
    isActive: "ALL" | "ACTIVE" | "BLOCKED";
    keyword: string;
    page: number;
    limit: number;
  }>({
    isActive: "ALL",
    keyword: "",
    page: 1,
    limit: 10,
  });

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Map state to API filters
  const apiActiveParam =
    filter.isActive === "ACTIVE"
      ? true
      : filter.isActive === "BLOCKED"
      ? false
      : undefined;

  const { data: response, isLoading } = useAdminCustomers({
    keyword: filter.keyword || undefined,
    isActive: apiActiveParam,
    page: filter.page,
    limit: filter.limit,
  });

  // Stats: dùng query riêng không có filter để luôn có con số chính xác
  const { data: allData, isLoading: isStatsLoading } = useAdminCustomers({ page: 1, limit: 1 });
  const { data: activeData } = useAdminCustomers({ isActive: true, page: 1, limit: 1 });
  const { data: blockedData } = useAdminCustomers({ isActive: false, page: 1, limit: 1 });

  const displayData = response?.data || [];
  const totalItems = response?.meta?.total || 0;

  // Columns definition
  const columns: Column<CustomerListItem>[] = [
    {
      key: "fullName",
      title: "Họ và tên",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
            {row.avatarUrl ? (
              <img
                src={row.avatarUrl}
                alt={row.fullName}
                className="w-full h-full rounded-xl object-cover"
              />
            ) : (
              row.fullName?.[0]?.toUpperCase() || "C"
            )}
          </div>
          <div>
            <p className="font-bold text-sm text-foreground/90">{row.fullName || "Chưa cập nhật"}</p>
            <p className="text-xs text-muted-foreground">{row.phone || "Không có số điện thoại"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "email",
      title: "Email",
      render: (row) => (
        <span className="text-xs font-semibold text-foreground/70">{row.email}</span>
      ),
    },
    {
      key: "totalBookings",
      title: "Số đơn đặt",
      hideOnMobile: true,
      className: "text-center w-[120px]",
      render: (row) => (
        <span className="inline-flex items-center px-2 py-1 rounded-full bg-primary/5 text-primary text-xs font-bold">
          {row.totalBookings} đơn
        </span>
      ),
    },
    {
      key: "createdAt",
      title: "Ngày tham gia",
      hideOnMobile: true,
      render: (row) => (
        <span className="text-xs font-semibold text-muted-foreground">
          {row.createdAt ? new Date(row.createdAt).toLocaleDateString("vi-VN") : "N/A"}
        </span>
      ),
    },
    {
      key: "status",
      title: "Trạng thái",
      render: (row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <CustomerStatusToggle
            customerId={row.id}
            isActive={row.isActive}
            fullName={row.fullName}
          />
        </div>
      ),
    },
  ];

  // Row actions
  const rowActions: RowAction<CustomerListItem>[] = [
    {
      type: "view",
      label: "Xem chi tiết",
      icon: Eye,
      onClick: (row) => setSelectedCustomerId(row.id),
    },
  ];

  return (
    <>
      <CustomerStatsBar
        total={allData?.meta?.total || 0}
        active={activeData?.meta?.total || 0}
        blocked={blockedData?.meta?.total || 0}
        isLoading={isStatsLoading}
      />
      <BaseTableList
        columns={columns}
        data={displayData}
        rowKey="id"
        totalItems={totalItems}
        page={filter.page}
        limit={filter.limit}
        onPageChange={(page) => setFilter((prev) => ({ ...prev, page }))}
        onLimitChange={(limit) => setFilter((prev) => ({ ...prev, limit, page: 1 }))}
        keyword={filter.keyword}
        onKeywordChange={(keyword) => setFilter((prev) => ({ ...prev, keyword, page: 1 }))}
        placeholderSearch="Tìm theo tên, email, số điện thoại..."
        isLoading={isLoading}
        emptyTitle="Không tìm thấy khách hàng"
        emptyDescription="Không có khách hàng nào khớp với tìm kiếm hoặc bộ lọc của bạn."
        rowActions={rowActions}
        inlineActionCount={1}
        filters={
          <Select
            value={filter.isActive}
            onValueChange={(val) =>
              setFilter((prev) => ({
                ...prev,
                isActive: val as "ALL" | "ACTIVE" | "BLOCKED",
                page: 1,
              }))
            }
          >
            <SelectTrigger className="h-10 min-w-[170px] rounded-full border-border/40 bg-background text-sm font-medium focus:ring-0 focus:ring-offset-0 shadow-none">
              <SelectValue placeholder="Lọc trạng thái" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="ALL">
                <div className="flex items-center gap-2">
                  <ListFilter className="w-4 h-4 text-muted-foreground" />
                  Tất cả trạng thái
                </div>
              </SelectItem>
              <SelectItem value="ACTIVE">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-500" />
                  Đang hoạt động
                </div>
              </SelectItem>
              <SelectItem value="BLOCKED">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                  Đã bị khóa
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {selectedCustomerId && (
        <CustomerDetailDrawer
          customerId={selectedCustomerId}
          isOpen={!!selectedCustomerId}
          onClose={() => setSelectedCustomerId(null)}
        />
      )}
    </>
  );
};
