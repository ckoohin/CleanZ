"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

import { BaseTableList, Column, RowAction } from "@/components/ui/base/base_table_list";
import { BaseButton } from "@/components/ui/base/base_button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import Image from "next/image";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FilterGroup } from "@/components/ui/filter-group";
import { SearchableSelect } from "@/components/ui/searchable-select";

import {
  useAdminServices,
  useDeleteAdminService,
  useUpdateAdminService,
} from "@/features/admin/modules/service/hooks/useAdminServices";
import { AdminServiceEntity } from "@/features/admin/modules/service/services/admin-services.service";
import { useAdminCategories } from "@/features/admin/hooks/useAdminCategories";

// Custom useDebounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);
  React.useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function AdminServicesPage() {
  const router = useRouter();
  
  // State for List
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(10);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");

  // State for Delete
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  // Queries & Mutations
  const { data: response, isLoading } = useAdminServices({
    page,
    limit,
    search: debouncedSearchTerm || undefined,
    isActive: statusFilter === "all" ? undefined : statusFilter === "active",
    categoryId: categoryFilter === "all" ? undefined : categoryFilter,
  });

  const { data: categories } = useAdminCategories();

  const categoryOptions = React.useMemo(() => {
    const opts = [{ value: "all", label: "Tất cả danh mục" }];
    if (categories) {
      categories.forEach((cat) => {
        opts.push({ value: cat.id, label: cat.name });
      });
    }
    return opts;
  }, [categories]);

  const statusOptions = [
    { value: "all", label: "Tất cả trạng thái" },
    { value: "active", label: "Đang hoạt động" },
    { value: "inactive", label: "Đã tắt" },
  ];

  const handleClearAll = () => {
    setCategoryFilter("all");
    setStatusFilter("all");
  };

  const deleteMutation = useDeleteAdminService();
  const updateMutation = useUpdateAdminService();

  const services = response?.items || [];
  const totalItems = response?.total || 0;

  const handleDelete = () => {
    if (!deletingId) return;
    deleteMutation.mutate(deletingId, {
      onSuccess: () => {
        setDeletingId(null);
        // If last item on page, go back 1 page
        if (services.length === 1 && page > 1) {
          setPage(page - 1);
        }
      },
    });
  };

  const columns: Column<AdminServiceEntity>[] = [
    {
      key: "name",
      title: "Tên dịch vụ",
      render: (row) => (
        <div className="flex items-start gap-4">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border/50 bg-muted/30">
            {row.thumbnailUrl ? (
              <Image
                src={row.thumbnailUrl}
                alt={row.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground/30 text-xs font-medium">
                No IMG
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base block text-foreground/90">{row.name}</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold">{row.serviceCode}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {row.description && (
                <span className="text-[13px] text-muted-foreground line-clamp-1">
                  {row.description}
                </span>
              )}
              {(row.includedTasks && row.includedTasks.length > 0) && (
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-semibold">
                  📦 {row.includedTasks.length} tác vụ
                </Badge>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "baseDurationHours",
      title: "Thời lượng",
      render: (row) => (
        <span className="font-medium text-slate-700 dark:text-slate-300">
          {row.baseDurationHours ? `${row.baseDurationHours} giờ` : "N/A"}
        </span>
      ),
    },
    {
      key: "createdAt",
      title: "Ngày tạo",
      hideOnMobile: true,
      render: (row) => (
        <span className="text-muted-foreground">
          {format(new Date(row.createdAt), "dd/MM/yyyy")}
        </span>
      ),
    },
    {
      key: "isActive",
      title: "Trạng thái",
      render: (row) => {
        return (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Switch
              checked={row.isActive}
              onCheckedChange={(checked) => {
                updateMutation.mutate({ id: row.id, payload: { isActive: checked } });
              }}
              disabled={updateMutation.isPending}
            />
            <span className={`text-xs font-medium ${row.isActive ? 'text-emerald-600' : 'text-muted-foreground'}`}>
              {row.isActive ? "Bật" : "Tắt"}
            </span>
          </div>
        );
      },
    },
  ];

  const rowActions: RowAction<AdminServiceEntity>[] = [
    {
      type: "view",
      label: "Xem chi tiết",
      onClick: (row) => router.push(`/admin/services/${row.id}`),
    },
    {
      type: "edit",
      label: "Chỉnh sửa",
      onClick: (row) => router.push(`/admin/services/${row.id}/edit`),
    },
    {
      type: "delete",
      label: "Xóa dịch vụ",
      onClick: (row) => setDeletingId(row.id),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Quản lý Dịch vụ
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Thiết lập danh mục và quản lý thông tin các dịch vụ cung cấp.
          </p>
        </div>
        <BaseButton
          variant="primary"
          onClick={() => router.push("/admin/services/create")}
          className="rounded-xl shadow-lg shadow-primary/20 gap-2 h-11 px-6"
        >
          <Plus className="w-4 h-4" />
          <span className="font-bold uppercase tracking-widest text-[10px]">Thêm Dịch vụ</span>
        </BaseButton>
      </div>

      <BaseTableList
        columns={columns}
        data={services}
        rowKey="id"
        totalItems={totalItems}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={setLimit}
        keyword={searchTerm}
        onKeywordChange={setSearchTerm}
        placeholderSearch="Tìm kiếm theo tên dịch vụ..."
        filters={
          <FilterGroup
            showClearBtn={categoryFilter !== "all" || statusFilter !== "all"}
            onClearAll={handleClearAll}
          >
            <SearchableSelect
              value={categoryFilter}
              onValueChange={setCategoryFilter}
              options={categoryOptions}
              placeholder="Chọn danh mục"
            />
            <SearchableSelect
              value={statusFilter}
              onValueChange={setStatusFilter}
              options={statusOptions}
              placeholder="Chọn trạng thái"
            />
          </FilterGroup>
        }
        rowActions={rowActions}
        isLoading={isLoading}
      />

      {/* Xóa Modal */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Xác nhận xóa dịch vụ</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Bạn có chắc chắn muốn xóa dịch vụ này? Hành động này không thể hoàn tác. 
              Lưu ý: Không thể xóa nếu dịch vụ đang có đơn hàng đang hoạt động.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="h-11 rounded-xl font-bold">Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction
              className="h-11 rounded-xl font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Đang xóa..." : "Xóa vĩnh viễn"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
