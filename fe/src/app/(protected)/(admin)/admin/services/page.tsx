"use client";

import * as React from "react";
import { Plus, Package, TrendingUp, Star, Grid3X3, List, MoreVertical, Edit, Eye, Trash2, Power, PowerOff } from "lucide-react";
import { useRouter } from "next/navigation";
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

  const { data: packages, isLoading } = useAdminPackages();
  const deleteMutation = useDeleteAdminPackage();
  const updateMutation = useUpdateAdminPackage();

  const filtered = React.useMemo(() => {
    if (!packages) return [];
    return packages.filter((pkg) => {
      const matchSearch = !debouncedSearch || pkg.name.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && pkg.isActive) ||
        (statusFilter === "inactive" && !pkg.isActive);
      return matchSearch && matchStatus;
    });
  }, [packages, debouncedSearch, statusFilter]);

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
            <div key={i} className="h-64 rounded-2xl bg-muted/40 animate-pulse" />
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
          { label: "Tổng gói dịch vụ", value: packages?.length ?? 0, icon: Package, color: "text-primary bg-primary/10" },
          { label: "Đang hoạt động", value: packages?.filter((p) => p.isActive).length ?? 0, icon: TrendingUp, color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30" },
          { label: "Đã tắt", value: packages?.filter((p) => !p.isActive).length ?? 0, icon: PowerOff, color: "text-rose-500 bg-rose-100 dark:bg-rose-900/30" },
          { label: "Tổng dịch vụ con", value: packages?.reduce((s, p) => s + (p.packageSubServices?.length ?? 0), 0) ?? 0, icon: Grid3X3, color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30" },
        ].map((stat) => (
          <div key={stat.label} className="bg-card border border-border/50 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
            <div className={`p-2.5 rounded-xl ${stat.color}`}>
              <stat.icon className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
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
                  ? "bg-primary text-white shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              placeholder="Tìm kiếm gói dịch vụ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 rounded-xl bg-background text-sm"
            />
          </div>
          <div className="flex rounded-xl overflow-hidden border border-border/50">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 transition-colors ${viewMode === "grid" ? "bg-primary text-white" : "bg-card text-muted-foreground hover:bg-muted"}`}
            >
              <Grid3X3 className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 transition-colors ${viewMode === "list" ? "bg-primary text-white" : "bg-card text-muted-foreground hover:bg-muted"}`}
            >
              <List className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Package Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-border rounded-2xl bg-muted/10">
          <Package className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <p className="text-lg font-semibold text-muted-foreground">Chưa có gói dịch vụ</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Tạo gói dịch vụ mới để hiển thị ở đây</p>
          <BaseButton variant="primary" className="mt-6" onClick={() => router.push("/admin/services/create")}>
            <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
            Tạo gói dịch vụ đầu tiên
          </BaseButton>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((pkg) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              onView={() => router.push(`/admin/services/${pkg.id}`)}
              onEdit={() => router.push(`/admin/services/${pkg.id}?tab=overview`)}
              onDelete={() => setDeletingId(pkg.id)}
              onToggle={() => toggleActive(pkg)}
              isToggling={updateMutation.isPending}
            />
          ))}
        </div>
      ) : (
        <div className="border border-border/50 rounded-2xl overflow-hidden bg-card shadow-sm divide-y divide-border/50">
          {filtered.map((pkg) => (
            <PackageListRow
              key={pkg.id}
              pkg={pkg}
              onView={() => router.push(`/admin/services/${pkg.id}`)}
              onDelete={() => setDeletingId(pkg.id)}
              onToggle={() => toggleActive(pkg)}
            />
          ))}
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Xác nhận xóa gói dịch vụ</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Bạn có chắc chắn muốn xóa gói này? Thao tác này không thể hoàn tác. Lưu ý: Không thể xóa nếu gói đang có đơn hàng chưa hoàn thành.
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

// ─── Sub-components ────────────────────────────────────────────────────────────

function PageHeader({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          Quản lý Gói Dịch vụ
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
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

  return (
    <div
      className="group bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer"
      onClick={onView}
    >
      {/* Thumbnail */}
      <div className="relative h-44 bg-gradient-to-br from-muted/60 to-muted/30 overflow-hidden">
        {pkg.iconUrl ? (
          <Image
            src={pkg.iconUrl}
            alt={pkg.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Package className="w-16 h-16 text-muted-foreground/20" aria-hidden="true" />
          </div>
        )}
        {/* Status badge */}
        <div className="absolute top-3 left-3">
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              pkg.isActive
                ? "bg-emerald-500/90 text-white"
                : "bg-slate-500/80 text-white"
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
            <DropdownMenuContent align="end" className="w-48 rounded-xl">
              <DropdownMenuItem onClick={onView} className="gap-2 rounded-lg">
                <Eye className="w-4 h-4" aria-hidden="true" /> Xem chi tiết
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit} className="gap-2 rounded-lg">
                <Edit className="w-4 h-4" aria-hidden="true" /> Chỉnh sửa
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onToggle} className="gap-2 rounded-lg" disabled={isToggling}>
                {pkg.isActive ? (
                  <><PowerOff className="w-4 h-4 text-amber-500" aria-hidden="true" /> Tắt gói</>
                ) : (
                  <><Power className="w-4 h-4 text-emerald-500" aria-hidden="true" /> Bật gói</>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="gap-2 rounded-lg text-destructive focus:text-destructive">
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
            <h3 className="font-bold text-foreground text-base leading-tight line-clamp-1">{pkg.name}</h3>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold shrink-0">
              {pkg.packageCode}
            </span>
          </div>
          {pkg.policyDescription && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{pkg.policyDescription}</p>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Package className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{subCount} dịch vụ con</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
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

        <div className="pt-2 border-t border-border/50 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Tối đa <span className="font-bold text-foreground">{pkg.maxHours} giờ</span>
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <Switch
              id={`pkg-toggle-${pkg.id}`}
              checked={pkg.isActive}
              onCheckedChange={onToggle}
              className="scale-90"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface PackageListRowProps {
  pkg: AdminServicePackageEntity;
  onView: () => void;
  onDelete: () => void;
  onToggle: () => void;
}

function PackageListRow({ pkg, onView, onDelete, onToggle }: PackageListRowProps) {
  const subCount = pkg.packageSubServices?.length ?? 0;

  return (
    <div
      className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={onView}
    >
      <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-muted/40 shrink-0">
        {pkg.iconUrl ? (
          <Image src={pkg.iconUrl} alt={pkg.name} fill className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Package className="w-6 h-6 text-muted-foreground/30" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground truncate">{pkg.name}</span>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold shrink-0">
            {pkg.packageCode}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
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
            <button className="w-8 h-8 rounded-lg border border-border/50 flex items-center justify-center hover:bg-muted transition-colors">
              <MoreVertical className="w-4 h-4" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 rounded-xl">
            <DropdownMenuItem onClick={onView} className="gap-2 rounded-lg">
              <Eye className="w-4 h-4" aria-hidden="true" /> Xem chi tiết
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="gap-2 rounded-lg text-destructive focus:text-destructive">
              <Trash2 className="w-4 h-4" aria-hidden="true" /> Xóa gói
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
