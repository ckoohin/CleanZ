"use client";

import * as React from "react";
import {
  Plus,
  Package,
  TrendingUp,
  Star,
  Grid3X3,
  List,
  MoreVertical,
  Edit,
  Eye,
  Trash2,
  Power,
  PowerOff,
  MapPin,
  Moon,
  PawPrint,
  Timer,
  Briefcase,
  Zap,
  Settings,
  SlidersHorizontal,
  RotateCcw,
  DollarSign,
  Clock,
  Ruler,
  ClipboardList,
  Wrench,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";
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
import { BaseButton } from "@/components/ui/base/base_button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAdminPackages,
  useDeleteAdminPackage,
  useUpdateAdminPackage,
} from "@/features/admin/modules/service/hooks/useAdminServices";
import { AdminServicePackageEntity } from "@/features/admin/modules/service/services/admin-services.service";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);
  React.useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const vnd = (val: number | string | null | undefined) => {
  if (!val && val !== 0) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(val));
};

export default function AdminServicesPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = React.useState("");
  const debouncedSearch = useDebounce(searchTerm, 400);
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  // Advanced Filters States
  const [isFiltersExpanded, setIsFiltersExpanded] = React.useState(false);
  const [pricingModeFilter, setPricingModeFilter] = React.useState<"all" | "HOURLY" | "AREA_HOURLY" | "FIXED">("all");
  const [maxHoursFilter, setMaxHoursFilter] = React.useState<"all" | "short" | "medium" | "long">("all");
  const [hasSubServicesFilter, setHasSubServicesFilter] = React.useState<"all" | "yes" | "no">("all");
  const [selectedSurcharges, setSelectedSurcharges] = React.useState<string[]>([]);

  // Pagination states
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(6);

  const { data: packages, isLoading } = useAdminPackages();
  const deleteMutation = useDeleteAdminPackage();
  const updateMutation = useUpdateAdminPackage();

  const isAnyFilterActive = React.useMemo(() => {
    return pricingModeFilter !== "all" || maxHoursFilter !== "all" || hasSubServicesFilter !== "all" || selectedSurcharges.length > 0;
  }, [pricingModeFilter, maxHoursFilter, hasSubServicesFilter, selectedSurcharges]);

  const handleResetFilters = React.useCallback(() => {
    setPricingModeFilter("all");
    setMaxHoursFilter("all");
    setHasSubServicesFilter("all");
    setSelectedSurcharges([]);
  }, []);

  // Reset page when filters change
  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, pageSize, pricingModeFilter, maxHoursFilter, hasSubServicesFilter, selectedSurcharges]);

  const filtered = React.useMemo(() => {
    if (!packages) return [];
    return packages.filter((pkg) => {
      // 1. Tìm kiếm song song theo Tên hoặc Mã gói
      const matchSearch =
        !debouncedSearch ||
        pkg.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        pkg.packageCode.toLowerCase().includes(debouncedSearch.toLowerCase());

      // 2. Trạng thái hoạt động
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && pkg.isActive) ||
        (statusFilter === "inactive" && !pkg.isActive);

      // 3. Chế độ tính giá
      const matchPricingMode = pricingModeFilter === "all" || pkg.pricingMode === pricingModeFilter;

      // 4. Thời lượng tối đa
      let matchMaxHours = true;
      if (maxHoursFilter === "short") {
        matchMaxHours = pkg.maxHours <= 4;
      } else if (maxHoursFilter === "medium") {
        matchMaxHours = pkg.maxHours > 4 && pkg.maxHours <= 8;
      } else if (maxHoursFilter === "long") {
        matchMaxHours = pkg.maxHours > 8;
      }

      // 5. Số lượng dịch vụ con
      let matchSubServices = true;
      const subCount = pkg.packageSubServices?.length ?? 0;
      if (hasSubServicesFilter === "yes") {
        matchSubServices = subCount > 0;
      } else if (hasSubServicesFilter === "no") {
        matchSubServices = subCount === 0;
      }

      // 6. Phụ phí áp dụng (gói dịch vụ phải có các phụ phí được tích chọn)
      let matchSurcharges = true;
      if (selectedSurcharges.includes("night") && !(pkg.nightSurcharge > 0)) matchSurcharges = false;
      if (selectedSurcharges.includes("pet") && !(pkg.petSurcharge > 0)) matchSurcharges = false;
      if (selectedSurcharges.includes("tool") && !(pkg.toolFee > 0)) matchSurcharges = false;
      if (selectedSurcharges.includes("peak") && !(pkg.peakRatePercent > 0)) matchSurcharges = false;

      return matchSearch && matchStatus && matchPricingMode && matchMaxHours && matchSubServices && matchSurcharges;
    });
  }, [packages, debouncedSearch, statusFilter, pricingModeFilter, maxHoursFilter, hasSubServicesFilter, selectedSurcharges]);

  const totalPages = Math.ceil(filtered.length / pageSize);

  const paginatedPackages = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const handleDelete = () => {
    if (!deletingId) return;
    deleteMutation.mutate(deletingId, {
      onSuccess: () => setDeletingId(null),
    });
  };

  const toggleActive = (pkg: AdminServicePackageEntity) => {
    updateMutation.mutate({ id: pkg.id, payload: { isActive: !pkg.isActive } });
  };

  const statusBtns = [
    { key: "all", label: "Tất cả" },
    { key: "active", label: "Đang bật" },
    { key: "inactive", label: "Đã tắt" },
  ] as const;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader onAdd={() => router.push("/admin/services/create-package")} />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-[var(--c-card-2)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader onAdd={() => router.push("/admin/services/create-package")} />

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Tổng gói dịch vụ", value: packages?.length ?? 0, icon: Package, color: "text-[var(--c-primary-strong)] bg-[var(--c-primary-soft)]" },
          { label: "Đang hoạt động", value: packages?.filter((p) => p.isActive).length ?? 0, icon: TrendingUp, color: "text-[#0E9F6E] bg-[rgba(14,159,110,0.12)] dark:bg-[rgba(14,159,110,0.12)]" },
          { label: "Đã tắt", value: packages?.filter((p) => !p.isActive).length ?? 0, icon: PowerOff, color: "text-[#E11D48] bg-[rgba(225,29,72,0.12)] dark:bg-[rgba(225,29,72,0.12)]" },
          { label: "Tổng dịch vụ con", value: packages?.reduce((s, p) => s + (p.packageSubServices?.length ?? 0), 0) ?? 0, icon: Grid3X3, color: "text-[#2563EB] bg-[rgba(37,99,235,0.12)] dark:bg-[rgba(37,99,235,0.12)]" },
        ].map((stat) => (
          <div key={stat.label} className="bg-[var(--c-card)] border border-[var(--c-line)]/50 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
            <div className={`p-2.5 rounded-xl ${stat.color}`}>
              <stat.icon className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm text-[var(--c-muted)] font-medium">{stat.label}</p>
              <p className="text-2xl font-bold text-[var(--c-ink)]">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {statusBtns.map((btn) => (
            <button
              key={btn.key}
              onClick={() => setStatusFilter(btn.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === btn.key
                  ? "bg-[var(--c-primary)] text-white shadow-sm"
                  : "bg-[var(--c-card-2)] text-[var(--c-muted)] hover:bg-[var(--c-card-2)]"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--c-muted)]" aria-hidden="true" />
            <Input
              placeholder="Tìm theo tên hoặc mã..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 rounded-xl bg-[var(--c-card)] text-sm"
            />
          </div>
          <div className="flex rounded-xl overflow-hidden border border-[var(--c-line)]/50">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 transition-colors ${viewMode === "grid" ? "bg-[var(--c-primary)] text-white" : "bg-[var(--c-card)] text-[var(--c-muted)] hover:bg-[var(--c-card-2)]"}`}
            >
              <Grid3X3 className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 transition-colors ${viewMode === "list" ? "bg-[var(--c-primary)] text-white" : "bg-[var(--c-card)] text-[var(--c-muted)] hover:bg-[var(--c-card-2)]"}`}
            >
              <List className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Advanced Filters Panel */}
      {isFiltersExpanded && (
        <div className="bg-card border border-border/40 rounded-2xl p-5 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-top-2 duration-200">
          {/* Lọc 1: Chế độ tính giá */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">Chế độ tính giá</label>
            <Select value={pricingModeFilter} onValueChange={(val) => setPricingModeFilter(val as "all" | "HOURLY" | "AREA_HOURLY" | "FIXED")}>
              <SelectTrigger className="h-9 rounded-xl text-xs bg-background">
                <SelectValue placeholder="Chọn chế độ tính giá" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="text-xs font-semibold rounded-lg">Tất cả chế độ</SelectItem>
                <SelectItem value="HOURLY" className="text-xs font-semibold rounded-lg">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span>Theo giờ</span>
                  </span>
                </SelectItem>
                <SelectItem value="AREA_HOURLY" className="text-xs font-semibold rounded-lg">
                  <span className="flex items-center gap-1.5">
                    <Ruler className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span>Theo m² & Giờ</span>
                  </span>
                </SelectItem>
                <SelectItem value="FIXED" className="text-xs font-semibold rounded-lg">
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span>Giá cố định</span>
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Lọc 2: Thời lượng tối đa */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">Thời lượng tối đa</label>
            <Select value={maxHoursFilter} onValueChange={(val) => setMaxHoursFilter(val as "all" | "short" | "medium" | "long")}>
              <SelectTrigger className="h-9 rounded-xl text-xs bg-background">
                <SelectValue placeholder="Chọn thời lượng" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="text-xs font-semibold rounded-lg">Tất cả thời lượng</SelectItem>
                <SelectItem value="short" className="text-xs font-semibold rounded-lg">Dưới 4 giờ / ca</SelectItem>
                <SelectItem value="medium" className="text-xs font-semibold rounded-lg">Từ 4h - 8h / ca</SelectItem>
                <SelectItem value="long" className="text-xs font-semibold rounded-lg">Trên 8 giờ / ca</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Lọc 3: Số lượng dịch vụ con */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">Dịch vụ con</label>
            <Select value={hasSubServicesFilter} onValueChange={(val) => setHasSubServicesFilter(val as "all" | "yes" | "no")}>
              <SelectTrigger className="h-9 rounded-xl text-xs bg-background">
                <SelectValue placeholder="Chọn trạng thái" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="text-xs font-semibold rounded-lg">Tất cả</SelectItem>
                <SelectItem value="yes" className="text-xs font-semibold rounded-lg">Có dịch vụ con</SelectItem>
                <SelectItem value="no" className="text-xs font-semibold rounded-lg">Chưa có dịch vụ con</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Lọc 4: Phụ phí áp dụng */}
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">Phụ phí áp dụng</label>
            <div className="flex flex-wrap gap-1 pt-0.5">
              {[
                { id: "night", label: "Giờ đêm", icon: Moon, activeColor: "bg-amber-500/10 text-amber-600 border-amber-500/30", inactiveColor: "bg-muted/30 text-muted-foreground border-border/40 hover:bg-muted" },
                { id: "pet", label: "Thú cưng", icon: PawPrint, activeColor: "bg-orange-500/10 text-orange-600 border-orange-500/30", inactiveColor: "bg-muted/30 text-muted-foreground border-border/40 hover:bg-muted" },
                { id: "tool", label: "Dụng cụ", icon: Wrench, activeColor: "bg-blue-500/10 text-blue-600 border-blue-500/30", inactiveColor: "bg-muted/30 text-muted-foreground border-border/40 hover:bg-muted" },
                { id: "peak", label: "Cao điểm", icon: Zap, activeColor: "bg-rose-500/10 text-rose-600 border-rose-500/30", inactiveColor: "bg-muted/30 text-muted-foreground border-border/40 hover:bg-muted" },
              ].map((item) => {
                const isActive = selectedSurcharges.includes(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedSurcharges((prev) =>
                        isActive ? prev.filter((id) => id !== item.id) : [...prev, item.id]
                      );
                    }}
                    className={cn(
                      "px-2 py-1 rounded-xl text-[10px] font-bold border transition-all flex items-center gap-1 cursor-pointer select-none",
                      isActive ? item.activeColor : item.inactiveColor
                    )}
                  >
                    <item.icon className="w-3 h-3 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Package Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-[var(--c-line)] rounded-2xl bg-[var(--c-card-2)]">
          <Package className="w-16 h-16 text-[var(--c-muted)] mb-4" />
          <p className="text-lg font-semibold text-[var(--c-muted)]">Chưa có gói dịch vụ</p>
          <p className="text-sm text-[var(--c-muted)] mt-1">Tạo gói dịch vụ mới để hiển thị ở đây</p>
          <BaseButton variant="primary" className="mt-6" onClick={() => router.push("/admin/services/create")}>
            <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
            Tạo gói dịch vụ đầu tiên
          </BaseButton>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {paginatedPackages.map((pkg) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              onView={() => router.push(`/admin/services/${pkg.id}`)}
              onEdit={() => router.push(`/admin/services/${pkg.id}/edit`)}
              onDelete={() => setDeletingId(pkg.id)}
              onToggle={() => toggleActive(pkg)}
              isToggling={updateMutation.isPending}
            />
          ))}
        </div>
      ) : (
        <div className="border border-[var(--c-line)]/50 rounded-2xl overflow-hidden bg-[var(--c-card)] shadow-sm divide-y divide-[var(--c-line)]/50">
          {filtered.map((pkg) => (
            <PackageListRow
              key={pkg.id}
              pkg={pkg}
              onView={() => router.push(`/admin/services/${pkg.id}`)}
              onEdit={() => router.push(`/admin/services/${pkg.id}/edit`)}
              onDelete={() => setDeletingId(pkg.id)}
              onToggle={() => toggleActive(pkg)}
              isToggling={updateMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/40 mt-6 bg-card/40 border border-border/30 p-4 rounded-2xl shadow-2xs">
        <div className="flex items-center gap-2.5 text-xs text-muted-foreground font-semibold flex-wrap">
          <div className="flex items-center gap-1.5 bg-muted/40 px-3 py-1 rounded-xl border border-border/30">
            <span>Giới hạn (Limit):</span>
            <Select
              value={String(pageSize)}
              onValueChange={(val) => setPageSize(Number(val))}
            >
              <SelectTrigger className="h-6 w-[100px] bg-transparent border-0 font-black text-primary p-0 shadow-none focus:ring-0 select-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {[2, 4, 6, 12, 24].map((size) => (
                  <SelectItem key={size} value={String(size)} className="text-xs font-semibold rounded-lg">
                    {size} gói / trang
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <span>
            · Hiển thị {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1} -{" "}
            {Math.min(page * pageSize, filtered.length)} trong tổng số{" "}
            <strong className="text-primary font-extrabold">{filtered.length}</strong> gói
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <BaseButton
            variant="outline"
            size="sm"
            disabled={page === 1 || totalPages <= 1}
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            className="h-8.5 px-3 rounded-xl text-xs font-bold transition-all disabled:opacity-40"
          >
            ← Trước
          </BaseButton>
          
          {totalPages <= 1 ? (
            <button
              disabled
              className="w-8.5 h-8.5 rounded-xl text-xs font-bold bg-primary border-primary text-white shadow-xs flex items-center justify-center border"
            >
              1
            </button>
          ) : (
            Array.from({ length: totalPages }).map((_, idx) => {
              const pNum = idx + 1;
              return (
                <button
                  key={pNum}
                  onClick={() => setPage(pNum)}
                  className={cn(
                    "w-8.5 h-8.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center border",
                    page === pNum
                      ? "bg-primary border-primary text-white shadow-sm shadow-primary/20 scale-105"
                      : "bg-card border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {pNum}
                </button>
              );
            })
          )}

          <BaseButton
            variant="outline"
            size="sm"
            disabled={page === totalPages || totalPages <= 1}
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            className="h-8.5 px-3 rounded-xl text-xs font-bold transition-all disabled:opacity-40"
          >
            Sau →
          </BaseButton>
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent className="cz-admin rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Xác nhận xóa gói dịch vụ</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Bạn có chắc chắn muốn xóa gói này? Thao tác này không thể hoàn tác. Lưu ý: Không thể xóa nếu gói đang có đơn hàng chưa hoàn thành.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="h-11 rounded-xl font-bold">Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction
              className="h-11 rounded-xl font-bold bg-[#E11D48] text-white hover:bg-[#E11D48]"
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

// ─── Sub-components ────────────────────────────────────────────────────────────

function PageHeader({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--c-ink)]">
          Quản lý Gói Dịch vụ
        </h1>
        <p className="text-[var(--c-muted)] text-sm mt-1">
          Thiết lập, quản lý bảng giá và thống kê cho từng gói dịch vụ.
        </p>
      </div>
      <BaseButton
        variant="primary"
        onClick={onAdd}
        className="rounded-xl shadow-lg shadow-primary/20 gap-2 h-11 px-6"
      >
        <Plus className="w-4 h-4" aria-hidden="true" />
        <span className="font-bold uppercase tracking-widest text-[10px]">Tạo gói mới</span>
      </BaseButton>
    </div>
  );
}

interface PackageCardProps {
  pkg: AdminServicePackageEntity;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  isToggling: boolean;
}

function PackageCard({ pkg, onView, onEdit, onDelete, onToggle, isToggling }: PackageCardProps) {
  const subCount = pkg.packageSubServices?.length ?? 0;
  const areaCount = pkg.coverageAreaIds?.length ?? pkg.coverageAreas?.length ?? 0;

  let pricingModeText = "Chưa thiết lập";
  if (pkg.pricingMode === "HOURLY") pricingModeText = "Theo giờ";
  else if (pkg.pricingMode === "AREA_HOURLY") pricingModeText = "Theo m² & Giờ";
  else if (pkg.pricingMode === "FIXED") pricingModeText = "Giá cố định";

  return (
    <div
      className="group bg-[var(--c-card)] border border-[var(--c-line)]/50 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:border-[var(--c-primary)]/30 transition-all duration-300 cursor-pointer"
      onClick={onView}
    >
      {/* Thumbnail */}
      <div className="relative h-44 bg-gradient-to-br from-[var(--c-card-2)] to-[var(--c-card-2)] overflow-hidden">
        {pkg.iconUrl ? (
          <Image
            src={pkg.iconUrl}
            alt={pkg.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Package className="w-16 h-16 text-[var(--c-muted)]" aria-hidden="true" />
          </div>
        )}
        {/* Status badge */}
        <div className="absolute top-3 left-3">
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              pkg.isActive
                ? "bg-[#0E9F6E] text-white"
                : "bg-[var(--c-muted)] text-white"
            }`}
          >
            {pkg.isActive ? "Đang bật" : "Đã tắt"}
          </span>
        </div>
        {/* Action menu */}
        <div className="absolute top-3 right-3" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-colors">
                <MoreVertical className="w-4 h-4" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="cz-admin w-48 rounded-xl">
              <DropdownMenuItem onClick={onView} className="gap-2 rounded-lg">
                <Eye className="w-4 h-4" aria-hidden="true" /> Xem chi tiết
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit} className="gap-2 rounded-lg">
                <Edit className="w-4 h-4" aria-hidden="true" /> Chỉnh sửa
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onToggle} className="gap-2 rounded-lg" disabled={isToggling}>
                {pkg.isActive ? (
                  <><PowerOff className="w-4 h-4 text-[#D97706]" aria-hidden="true" /> Tắt gói</>
                ) : (
                  <><Power className="w-4 h-4 text-[#0E9F6E]" aria-hidden="true" /> Bật gói</>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="gap-2 rounded-lg text-[#E11D48] focus:text-[#E11D48]">
                <Trash2 className="w-4 h-4" aria-hidden="true" /> Xóa gói
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 space-y-3">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-[var(--c-ink)] text-base leading-tight line-clamp-1">{pkg.name}</h3>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)] font-semibold shrink-0">
              {pkg.packageCode}
            </span>
          </div>
          {pkg.policyDescription && (
            <p className="text-xs text-[var(--c-muted)] mt-1 line-clamp-2">{pkg.policyDescription}</p>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 text-xs text-[var(--c-muted)]">
            <Package className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{subCount} dịch vụ con</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-[var(--c-muted)]">
            <Star className="w-3.5 h-3.5 fill-[#D97706] text-[#D97706]" aria-hidden="true" />
            <span>4.8</span>
          </div>
          {pkg.nightSurcharge > 0 && (
            <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
              🌙 Phụ thu đêm
            </Badge>
          )}
          {pkg.petSurcharge > 0 && (
            <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
              🐾 Thú cưng
            </Badge>
          )}
        </div>

        <div className="pt-2 border-t border-[var(--c-line)]/50 flex items-center justify-between">
          <div className="text-xs text-[var(--c-muted)]">
            Tối đa <span className="font-bold text-[var(--c-ink)]">{pkg.maxHours} giờ</span>
          </div>
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <Switch
              id={`pkg-toggle-${pkg.id}`}
              checked={pkg.isActive}
              onCheckedChange={onToggle}
              disabled={isToggling}
              className="scale-90"
            />
            <span className="text-[10px] text-muted-foreground font-semibold select-none">{pkg.isActive ? "Bật" : "Tắt"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PackageListRowProps {
  pkg: AdminServicePackageEntity;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  isToggling: boolean;
}

function PackageListRow({ pkg, onView, onEdit, onDelete, onToggle, isToggling }: PackageListRowProps) {
  const subCount = pkg.packageSubServices?.length ?? 0;
  const areaCount = pkg.coverageAreaIds?.length ?? pkg.coverageAreas?.length ?? 0;

  let pricingModeText = "Chưa thiết lập";
  if (pkg.pricingMode === "HOURLY") pricingModeText = "Theo giờ";
  else if (pkg.pricingMode === "AREA_HOURLY") pricingModeText = "Theo m² & Giờ";
  else if (pkg.pricingMode === "FIXED") pricingModeText = "Giá cố định";

  return (
    <div
      className="flex items-center gap-4 px-5 py-4 hover:bg-[var(--c-card-2)] transition-colors cursor-pointer"
      onClick={onView}
    >
      <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-[var(--c-card-2)] shrink-0">
        {pkg.iconUrl ? (
          <Image src={pkg.iconUrl} alt={pkg.name} fill className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Package className="w-6 h-6 text-[var(--c-muted)]" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[var(--c-ink)] truncate">{pkg.name}</span>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)] font-semibold shrink-0">
            {pkg.packageCode}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-[var(--c-muted)]">
          <span>{subCount} dịch vụ con</span>
          <span>•</span>
          <span>Tối đa {pkg.maxHours}h</span>
          {pkg.nightSurcharge > 0 && <><span>•</span><span>🌙 Phụ thu đêm</span></>}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
        <Switch checked={pkg.isActive} onCheckedChange={onToggle} className="scale-90" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-8 h-8 rounded-lg border border-[var(--c-line)]/50 flex items-center justify-center hover:bg-[var(--c-card-2)] transition-colors">
              <MoreVertical className="w-4 h-4" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="cz-admin w-44 rounded-xl">
            <DropdownMenuItem onClick={onView} className="gap-2 rounded-lg">
              <Eye className="w-4 h-4" aria-hidden="true" /> Xem chi tiết
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="gap-2 rounded-lg text-[#E11D48] focus:text-[#E11D48]">
              <Trash2 className="w-4 h-4" aria-hidden="true" /> Xóa gói
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
