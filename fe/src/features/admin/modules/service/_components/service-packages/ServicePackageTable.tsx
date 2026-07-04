import { useState } from "react";
import Image from "next/image";
import {
  Package, Star, MoreVertical, Edit, Eye, Trash2, Power, PowerOff,
  MapPin, Moon, PawPrint, Briefcase, Zap, Settings, Wrench, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BaseButton } from "@/components/ui/base/base_button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  useDeleteAdminPackage,
} from "@/features/admin/modules/service/hooks/useAdminServices";
import { AdminServicePackageEntity } from "@/features/admin/modules/service/services/admin-services.service";

const vnd = (val: number | string | null | undefined) => {
  if (!val && val !== 0) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(val));
};

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
      className="group bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer flex flex-col justify-between"
      onClick={onView}
    >
      <div>
        {/* Thumbnail */}
        <div className="relative h-44 bg-linear-to-br from-muted/60 to-muted/30 overflow-hidden">
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
                  ? "bg-emerald-500/90 text-white animate-pulse"
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
              <h3 className="font-bold text-foreground text-base leading-tight group-hover:text-primary transition-colors line-clamp-1">{pkg.name}</h3>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold shrink-0 uppercase">
                {pkg.packageCode}
              </span>
            </div>
            {pkg.policyDescription ? (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{pkg.policyDescription}</p>
            ) : (
              <p className="text-xs text-muted-foreground/50 italic mt-1">Chưa cập nhật mô tả chính sách.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 py-1.5 border-y border-border/30">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Settings className="w-3.5 h-3.5 text-primary/70 shrink-0" />
              <span className="truncate">{pricingModeText}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Briefcase className="w-3.5 h-3.5 text-primary/70 shrink-0" />
              <span>{subCount} dịch vụ con</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 text-primary/70 shrink-0" />
              <span>{areaCount} quận/huyện</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
              <span>4.8 (Thống kê)</span>
            </div>
          </div>

          {/* Phụ phí */}
          <div className="space-y-1">
            <div className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">Cấu hình phụ phí</div>
            <div className="flex flex-wrap gap-1">
              {pkg.nightSurcharge > 0 && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 bg-amber-500/5 border-amber-500/20 text-amber-600 font-bold flex items-center gap-1">
                  <Moon className="w-3 h-3 text-amber-600 shrink-0" />
                  <span>Phụ thu đêm: {vnd(pkg.nightSurcharge)}</span>
                </Badge>
              )}
              {pkg.petSurcharge > 0 && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 bg-orange-500/5 border-orange-500/20 text-orange-600 font-bold flex items-center gap-1">
                  <PawPrint className="w-3 h-3 text-orange-600 shrink-0" />
                  <span>Thú cưng: {vnd(pkg.petSurcharge)}</span>
                </Badge>
              )}
              {pkg.toolFee > 0 && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 bg-blue-500/5 border-blue-500/20 text-blue-600 font-bold flex items-center gap-1">
                  <Wrench className="w-3 h-3 text-blue-600 shrink-0" />
                  <span>Dụng cụ: {vnd(pkg.toolFee)}</span>
                </Badge>
              )}
              {pkg.peakRatePercent > 0 && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 bg-rose-500/5 border-rose-500/20 text-rose-600 font-bold flex items-center gap-1">
                  <Zap className="w-3 h-3 text-rose-600 shrink-0" />
                  <span>Cao điểm: +{pkg.peakRatePercent}%</span>
                </Badge>
              )}
              {pkg.nightSurcharge === 0 && pkg.petSurcharge === 0 && pkg.toolFee === 0 && pkg.peakRatePercent === 0 && (
                <span className="text-[10px] text-muted-foreground/60 italic font-semibold">Miễn phụ phí</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 pt-0">
        <div className="pt-2 border-t border-border/50 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Thời lượng: <span className="font-bold text-foreground">Tối đa {pkg.maxHours}h</span>
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
      className="group bg-card border border-border/40 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5 hover:shadow-md hover:border-primary/30 transition-all duration-300 cursor-pointer"
      onClick={onView}
    >
      {/* Cột 1: Thumbnail & Thông tin cơ bản */}
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-muted/40 shrink-0 border border-border/30">
          {pkg.iconUrl ? (
            <Image src={pkg.iconUrl} alt={pkg.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Package className="w-7 h-7 text-muted-foreground/30" aria-hidden="true" />
            </div>
          )}
          {/* Badge STT */}
          <div className="absolute bottom-0 right-0 bg-primary/95 text-white text-[8px] font-black px-1.5 py-0.5 rounded-tl-lg">
            #{pkg.sortOrder}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-foreground text-base group-hover:text-primary transition-colors leading-snug">{pkg.name}</span>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary font-bold tracking-wider shrink-0 uppercase">
              {pkg.packageCode}
            </span>
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0",
              pkg.isActive ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-500/10 text-slate-600"
            )}>
              {pkg.isActive ? "Đang bật" : "Đã tắt"}
            </span>
          </div>
          {pkg.policyDescription ? (
            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1 leading-relaxed max-w-xl">{pkg.policyDescription}</p>
          ) : (
            <p className="text-xs text-muted-foreground/50 italic mt-1.5">Chưa cập nhật mô tả chính sách.</p>
          )}
        </div>
      </div>

      {/* Cột 2: Cấu hình vận hành */}
      <div className="flex items-center gap-6 shrink-0 flex-wrap lg:flex-nowrap border-t lg:border-t-0 lg:border-l border-border/30 pt-3 lg:pt-0 lg:pl-6">
        <div className="space-y-1.5 min-w-[120px]">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
            <Settings className="w-3.5 h-3.5 text-primary/70 shrink-0" />
            <span>{pricingModeText}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Briefcase className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
            <span>{subCount} dịch vụ con</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
            <span>{areaCount} quận/huyện</span>
          </div>
        </div>

        {/* Cột 3: Phụ phí (nếu có) */}
        <div className="flex flex-col gap-1 min-w-[140px]">
          <div className="text-[10px] text-muted-foreground font-black uppercase tracking-wider mb-0.5">Phụ phí & Cấu hình</div>
          <div className="flex flex-wrap gap-1.5 max-w-[180px]">
            {pkg.nightSurcharge > 0 ? (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 rounded bg-amber-500/5 border-amber-500/20 text-amber-600 font-bold flex items-center gap-0.5">
                <Moon className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                <span>+{vnd(pkg.nightSurcharge).replace(" ₫", "")}</span>
              </Badge>
            ) : null}
            {pkg.petSurcharge > 0 ? (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 rounded bg-orange-500/5 border-orange-500/20 text-orange-600 font-bold flex items-center gap-0.5">
                <PawPrint className="w-2.5 h-2.5 text-orange-600 shrink-0" />
                <span>+{vnd(pkg.petSurcharge).replace(" ₫", "")}</span>
              </Badge>
            ) : null}
            {pkg.toolFee > 0 ? (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 rounded bg-blue-500/5 border-blue-500/20 text-blue-600 font-bold flex items-center gap-0.5">
                <Wrench className="w-2.5 h-2.5 text-blue-600 shrink-0" />
                <span>+{vnd(pkg.toolFee).replace(" ₫", "")}</span>
              </Badge>
            ) : null}
            {pkg.peakRatePercent > 0 ? (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 rounded bg-rose-500/5 border-rose-500/20 text-rose-600 font-bold flex items-center gap-0.5">
                <Zap className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                <span>+{pkg.peakRatePercent}%</span>
              </Badge>
            ) : null}
            {pkg.nightSurcharge === 0 && pkg.petSurcharge === 0 && pkg.toolFee === 0 && pkg.peakRatePercent === 0 ? (
              <span className="text-[10px] text-muted-foreground/60 italic font-semibold">Miễn phụ phí</span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Cột 4: Nút hành động */}
      <div className="flex items-center gap-3 shrink-0 justify-end border-t lg:border-t-0 lg:border-l border-border/30 pt-3 lg:pt-0 lg:pl-6 w-full lg:w-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1.5">
          <Switch checked={pkg.isActive} onCheckedChange={onToggle} disabled={isToggling} className="scale-90" />
          <span className="text-[10px] text-muted-foreground font-semibold select-none">{pkg.isActive ? "Bật" : "Tắt"}</span>
        </div>
        <div className="flex items-center gap-1.5 ml-2">
          <button
            type="button"
            onClick={onView}
            className="w-8 h-8 rounded-lg bg-muted/60 text-muted-foreground hover:text-primary hover:bg-primary/10 flex items-center justify-center transition-all"
            title="Xem chi tiết"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="w-8 h-8 rounded-lg bg-muted/60 text-muted-foreground hover:text-amber-600 hover:bg-amber-50 flex items-center justify-center transition-all"
            title="Chỉnh sửa"
          >
            <Edit className="w-4 h-4" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-8 h-8 rounded-lg border border-border/50 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-all">
                <MoreVertical className="w-4 h-4" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 rounded-xl">
              <DropdownMenuItem onClick={onView} className="gap-2 rounded-lg">
                <Eye className="w-4 h-4" aria-hidden="true" /> Xem chi tiết
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit} className="gap-2 rounded-lg">
                <Edit className="w-4 h-4" aria-hidden="true" /> Chỉnh sửa
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="gap-2 rounded-lg text-destructive focus:text-destructive">
                <Trash2 className="w-4 h-4" aria-hidden="true" /> Xóa gói
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

// ─── Service Package Table (grid/list + pagination + delete alert dialog) ────

export function ServicePackageTable({
  items, totalFilteredCount, viewMode, page, pageSize, totalPages,
  onPageChange, onPageSizeChange, onView, onEdit, onToggle, isToggling, onCreateFirst,
}: {
  items: AdminServicePackageEntity[];
  totalFilteredCount: number;
  viewMode: "grid" | "list";
  page: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onView: (pkg: AdminServicePackageEntity) => void;
  onEdit: (pkg: AdminServicePackageEntity) => void;
  onToggle: (pkg: AdminServicePackageEntity) => void;
  isToggling: boolean;
  onCreateFirst: () => void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deleteMutation = useDeleteAdminPackage();

  const handleDelete = () => {
    if (!deletingId) return;
    deleteMutation.mutate(deletingId, {
      onSuccess: () => setDeletingId(null),
    });
  };

  return (
    <>
      {/* Package Grid */}
      {totalFilteredCount === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-(--c-line) rounded-2xl bg-(--c-card-2)">
          <Package className="w-16 h-16 text-(--c-muted) mb-4" />
          <p className="text-lg font-semibold text-(--c-muted)">Chưa có gói dịch vụ</p>
          <p className="text-sm text-(--c-muted) mt-1">Tạo gói dịch vụ mới để hiển thị ở đây</p>
          <BaseButton variant="primary" className="mt-6" onClick={onCreateFirst}>
            <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
            Tạo gói dịch vụ đầu tiên
          </BaseButton>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {items.map((pkg) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              onView={() => onView(pkg)}
              onEdit={() => onEdit(pkg)}
              onDelete={() => setDeletingId(pkg.id)}
              onToggle={() => onToggle(pkg)}
              isToggling={isToggling}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((pkg) => (
            <PackageListRow
              key={pkg.id}
              pkg={pkg}
              onView={() => onView(pkg)}
              onEdit={() => onEdit(pkg)}
              onDelete={() => setDeletingId(pkg.id)}
              onToggle={() => onToggle(pkg)}
              isToggling={isToggling}
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
              onValueChange={(val) => onPageSizeChange(Number(val))}
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
            · Hiển thị {totalFilteredCount === 0 ? 0 : (page - 1) * pageSize + 1} -{" "}
            {Math.min(page * pageSize, totalFilteredCount)} trong tổng số{" "}
            <strong className="text-primary font-extrabold">{totalFilteredCount}</strong> gói
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <BaseButton
            variant="outline"
            size="sm"
            disabled={page === 1 || totalPages <= 1}
            onClick={() => onPageChange(Math.max(page - 1, 1))}
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
                  onClick={() => onPageChange(pNum)}
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
            onClick={() => onPageChange(Math.min(page + 1, totalPages))}
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
    </>
  );
}
