import { useState } from "react";
import Image from "next/image";
import {
  Package, Eye, CheckCircle2, XCircle, Check, X, Clock, DollarSign, MapPin,
  ChevronDown, Loader2, Pencil, Trash2, Shield, RefreshCw, Percent, FileText,
  Image as ImageIcon,
} from "lucide-react";
import { useDeleteAdminService } from "@/features/admin/modules/service/hooks/useAdminServices";
import { AdminServiceEntity } from "@/features/admin/modules/service/services/admin-services.service";
import { BaseButton } from "@/components/ui/base/base_button";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import BaseEmptyState from "@/components/ui/base/base_empty_state";
import { cn } from "@/lib/utils";

const vnd = (val: number | string | null | undefined) => {
  if (!val && val !== 0) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency", currency: "VND", maximumFractionDigits: 0,
  }).format(Number(val));
};

const PRICING_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  FIXED:  { label: "Cố định",   color: "bg-[rgba(14,159,110,0.12)] text-[#0E9F6E] dark:bg-[rgba(14,159,110,0.12)] dark:text-[#0E9F6E]" },
  HOURLY: { label: "Theo giờ",  color: "bg-[rgba(37,99,235,0.12)] text-[#2563EB] dark:bg-[rgba(37,99,235,0.12)] dark:text-[#2563EB]" },
  CUSTOM: { label: "Tuỳ chỉnh", color: "bg-[rgba(124,58,237,0.12)] text-[#7C3AED] dark:bg-[rgba(124,58,237,0.12)] dark:text-[#7C3AED]" },
};

// ─── Service Row ──────────────────────────────────────────────────────────────

function ServiceRow({ svc, onViewDetail, onEdit, onDelete, onToggle, isToggling }: {
  svc: AdminServiceEntity;
  onViewDetail: (svc: AdminServiceEntity) => void;
  onEdit: (svc: AdminServiceEntity) => void;
  onDelete: (svc: AdminServiceEntity) => void;
  onToggle: (svc: AdminServiceEntity) => void;
  isToggling: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const pt = PRICING_TYPE_LABELS[svc.pricingType] ?? { label: svc.pricingType, color: "bg-[var(--c-card-2)] text-[var(--c-muted)]" };
  const bp = svc.pricingConfig?.basePrice;
  const commission = svc.pricingConfig?.platformCommissionRate ?? 20;

  return (
    <div className={cn(
      "border rounded-2xl overflow-hidden bg-card transition-all duration-200",
      expanded ? "border-primary/40 shadow-lg" : "border-border/50 shadow-2xs hover:border-primary/25 hover:shadow-xs",
    )}>
      {/* Header row */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 p-4.5 justify-between">
        {/* Cột 1: Thumbnail & Thông tin cơ bản */}
        <div className="flex items-center gap-3.5 min-w-0 flex-1 cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-muted/40 shrink-0 border border-border/40">
            {svc.thumbnailUrl ? (
              <Image src={svc.thumbnailUrl} alt={svc.name} fill className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Package className="w-5 h-5 text-muted-foreground/30" aria-hidden="true" />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-foreground text-sm hover:text-primary transition-colors leading-snug">{svc.name}</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">{svc.subServiceCode}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={cn("px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase", pt.color)}>{pt.label}</span>
              <span className={cn(
                "px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase",
                svc.isActive
                  ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400"
                  : "bg-rose-500/10 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400",
              )}>{svc.isActive ? "Hoạt động" : "Tắt"}</span>
            </div>
          </div>
        </div>

        {/* Cột 2: Cấu hình giá & Hoa hồng */}
        <div className="flex flex-row md:flex-col md:items-start justify-between md:justify-center border-t md:border-t-0 border-border/20 pt-3 md:pt-0 min-w-[150px] cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <div>
            <span className="text-[10px] text-muted-foreground font-semibold block md:hidden">Giá cơ bản:</span>
            {bp ? (
              <span className="text-sm font-black text-primary flex items-center gap-0.5">{vnd(bp)}</span>
            ) : (
              <span className="text-xs text-muted-foreground italic font-semibold">Chưa thiết lập giá</span>
            )}
          </div>
          <div className="md:mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground font-bold">
            <Percent className="w-3 h-3 text-muted-foreground/70" />
            <span>Platform Commission: {commission}%</span>
          </div>
        </div>

        {/* Cột 3: Thời lượng & Khu vực */}
        <div className="flex flex-row md:flex-col md:items-start justify-between md:justify-center border-t md:border-t-0 border-border/20 pt-3 md:pt-0 min-w-[160px] cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
            <span>{svc.durationHours ? `${svc.durationHours} giờ` : "Chưa cấu hình giờ"}</span>
          </div>
          <div className="md:mt-1 flex items-center gap-1 text-xs text-muted-foreground truncate max-w-[150px]">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
            <span className="truncate">{svc.coverageArea || "Mặc định (Toàn hệ thống)"}</span>
          </div>
        </div>

        {/* Cột 4: Thao tác nhanh */}
        <div className="flex items-center justify-end gap-1 border-t md:border-t-0 border-border/20 pt-3 md:pt-0 shrink-0" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-1.5 mr-2 bg-muted/40 px-2 py-1 rounded-xl border border-border/30">
            <Switch
              checked={svc.isActive}
              onCheckedChange={() => onToggle(svc)}
              disabled={isToggling}
              className="scale-75"
            />
            <span className="text-[10px] text-muted-foreground font-bold select-none">{svc.isActive ? "Bật" : "Tắt"}</span>
          </div>

          <button type="button" title="Xem chi tiết" onClick={() => onViewDetail(svc)}
            className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors shrink-0">
            <Eye className="w-4 h-4" aria-hidden="true" />
          </button>
          <button type="button" title="Chỉnh sửa" onClick={() => onEdit(svc)}
            className="p-2 rounded-xl text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors shrink-0">
            <Pencil className="w-4 h-4" aria-hidden="true" />
          </button>
          <button type="button" title="Xóa" onClick={() => onDelete(svc)}
            className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0">
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => setExpanded(!expanded)}
            className="p-2 rounded-xl text-muted-foreground hover:bg-muted transition-colors shrink-0">
            <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", expanded && "rotate-180")} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-border/40 bg-muted/10 p-5 animate-in fade-in-0 slide-in-from-top-1 duration-200 space-y-5">
          {/* Hàng 1: Panel cấu hình giá & Mô tả ngắn */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* 1.1: Bảng giá chi tiết */}
            <div className="bg-card border border-border/40 rounded-2xl p-4.5 space-y-3.5 shadow-3xs">
              <p className="text-[10px] font-black text-primary uppercase tracking-wider flex items-center gap-1.5 border-b border-border/20 pb-2">
                <DollarSign className="w-3.5 h-3.5 text-primary" />
                Cấu hình giá chi tiết
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: "Giá gốc", value: bp ? vnd(bp) : "Chưa có", highlight: true, color: "text-primary text-sm font-black" },
                  { label: "Giá cao điểm", value: svc.pricingConfig?.peakPrice ? vnd(svc.pricingConfig.peakPrice) : "Chưa thiết lập", highlight: false, color: "text-amber-600 font-bold" },
                  { label: "Phí thú cưng", value: svc.pricingConfig?.petFee ? vnd(svc.pricingConfig.petFee) : "—", highlight: false, color: "text-foreground font-semibold" },
                  { label: "Phí chờ đợi", value: svc.pricingConfig?.waitingFee ? `${vnd(svc.pricingConfig.waitingFee)}/15p` : "—", highlight: false, color: "text-foreground font-semibold" },
                  { label: "Hoa hồng hệ thống", value: `${commission}%`, highlight: false, color: "text-foreground font-semibold" },
                  { label: "Đơn vị", value: svc.pricingConfig?.priceUnit || "VND", highlight: false, color: "text-muted-foreground font-semibold" },
                ].map(f => (
                  <div key={f.label} className="bg-muted/30 border border-border/20 rounded-xl p-2.5">
                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wide">{f.label}</p>
                    <p className={cn("mt-0.5 text-xs truncate", f.color)}>
                      {f.value}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-1 border-t border-border/10">
                <button type="button" onClick={() => onViewDetail(svc)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary text-white text-[10px] font-bold hover:bg-primary/95 transition-colors">
                  <Pencil className="w-3 h-3" /> Cấu hình giá
                </button>
                {svc.pricingConfig?.name && (
                  <span className="text-[10px] text-muted-foreground font-semibold flex items-center bg-muted/40 px-2.5 rounded-xl border border-border/30 max-w-[200px] truncate">
                    Bảng giá: {svc.pricingConfig.name}
                  </span>
                )}
              </div>
            </div>

            {/* 1.2: Mô tả */}
            <div className="space-y-4">
              {svc.shortDescription && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    Mô tả ngắn
                  </p>
                  <p className="text-xs text-foreground bg-card p-3 rounded-xl border border-border/40 leading-relaxed shadow-3xs">
                    {svc.shortDescription}
                  </p>
                </div>
              )}
              {svc.description && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    Mô tả chi tiết
                  </p>
                  <p className="text-xs text-muted-foreground bg-card p-3 rounded-xl border border-border/40 leading-relaxed whitespace-pre-wrap max-h-[120px] overflow-y-auto shadow-3xs">
                    {svc.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Grid 2 cột checklist đầu việc */}
          {((svc.includedTasks?.length ?? 0) > 0 || (svc.excludedTasks?.length ?? 0) > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-border/20 pt-4.5">
              {(svc.includedTasks?.length ?? 0) > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Công việc bao gồm ({svc.includedTasks?.length})
                  </p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {svc.includedTasks?.map((task, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-foreground font-medium bg-card px-3 py-2 rounded-xl border border-border/30 shadow-3xs">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{task}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(svc.excludedTasks?.length ?? 0) > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-rose-500 uppercase tracking-wider flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5 text-rose-400" />
                    Không bao gồm ({svc.excludedTasks?.length})
                  </p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {svc.excludedTasks?.map((task, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground font-medium bg-card px-3 py-2 rounded-xl border border-border/30 shadow-3xs">
                        <X className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                        <span>{task}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Album ảnh phụ */}
          {(svc.galleryUrls?.length ?? 0) > 0 && (
            <div className="border-t border-border/20 pt-4.5 space-y-3">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-muted-foreground/75" />
                Album ảnh dịch vụ ({svc.galleryUrls?.length})
              </p>
              <div className="flex flex-wrap gap-2.5">
                {svc.galleryUrls?.map((url, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-border/40 bg-card shadow-3xs">
                    <Image src={url} alt={`${svc.name} ${i + 1}`} fill className="object-cover hover:scale-105 transition-transform duration-300" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub Service Table (list + pagination + delete alert dialog) ─────────────

export function SubServiceTable({
  items, isLoading, filteredCount, page, pageSize, totalPages,
  onPageChange, onPageSizeChange, onViewDetail, onEdit, onToggle, isToggling,
}: {
  items: AdminServiceEntity[];
  isLoading: boolean;
  filteredCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onViewDetail: (svc: AdminServiceEntity) => void;
  onEdit: (svc: AdminServiceEntity) => void;
  onToggle: (svc: AdminServiceEntity) => void;
  isToggling: boolean;
}) {
  const [deleteSvc, setDeleteSvc] = useState<AdminServiceEntity | null>(null);
  const deleteMutation = useDeleteAdminService();

  const handleDelete = () => {
    if (!deleteSvc) return;
    deleteMutation.mutate(deleteSvc.id, { onSuccess: () => setDeleteSvc(null) });
  };

  return (
    <>
      <AlertDialog open={!!deleteSvc} onOpenChange={open => !open && setDeleteSvc(null)}>
        <AlertDialogContent className="cz-admin">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-[#E11D48]" aria-hidden="true" />Xóa dịch vụ con
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Xóa <strong>{deleteSvc?.name}</strong>? Thao tác không thể hoàn tác.</p>
              <div className="bg-[rgba(225,29,72,0.12)] dark:bg-[rgba(225,29,72,0.12)] border border-[#E11D48]/60 rounded-xl p-3 flex items-start gap-2">
                <Shield className="w-4 h-4 text-[#E11D48] shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-xs text-[#E11D48] dark:text-[#E11D48]">
                  Nếu dịch vụ đang có đơn hàng chưa hoàn thành, hệ thống sẽ từ chối xóa.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteMutation.isPending}
              className="bg-[#E11D48] text-white hover:bg-[#E11D48] gap-2">
              {deleteMutation.isPending
                ? <><RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />Đang xóa...</>
                : <><Trash2 className="w-4 h-4" aria-hidden="true" />Xóa dịch vụ</>}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 bg-card border border-border/40 rounded-2xl">
          <Loader2 className="w-8 h-8 text-primary animate-spin" aria-hidden="true" />
          <p className="text-sm text-muted-foreground font-semibold">Đang tải danh sách dịch vụ con...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="py-20 bg-card border border-border/40 border-dashed rounded-2xl">
          <BaseEmptyState title="Không tìm thấy dịch vụ con"
            description="Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm" icon={Package} />
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map(svc => (
            <ServiceRow key={svc.id} svc={svc}
              onViewDetail={onViewDetail} onEdit={onEdit}
              onDelete={setDeleteSvc} onToggle={onToggle}
              isToggling={isToggling} />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
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
                  {[5, 10, 20, 50].map((size) => (
                    <SelectItem key={size} value={String(size)} className="text-xs font-semibold rounded-lg">
                      {size} dịch vụ / trang
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <span>
              · Hiển thị {filteredCount === 0 ? 0 : (page - 1) * pageSize + 1} -{" "}
              {Math.min(page * pageSize, filteredCount)} trong tổng số{" "}
              <strong className="text-primary font-extrabold">{filteredCount}</strong> dịch vụ con
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <BaseButton
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => onPageChange(Math.max(page - 1, 1))}
              className="h-8.5 px-3 rounded-xl text-xs font-bold transition-all disabled:opacity-40"
            >
              ← Trước
            </BaseButton>

            {Array.from({ length: totalPages }).map((_, idx) => {
              const pNum = idx + 1;
              return (
                <button
                  key={pNum}
                  onClick={() => onPageChange(pNum)}
                  className={cn(
                    "w-8.5 h-8.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-center cursor-pointer select-none",
                    page === pNum
                      ? "bg-primary border-primary text-white shadow-xs font-black"
                      : "bg-card border-border/50 text-muted-foreground hover:bg-muted"
                  )}
                >
                  {pNum}
                </button>
              );
            })}

            <BaseButton
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => onPageChange(Math.min(page + 1, totalPages))}
              className="h-8.5 px-3 rounded-xl text-xs font-bold transition-all disabled:opacity-40"
            >
              Sau →
            </BaseButton>
          </div>
        </div>
      )}
    </>
  );
}
