import { useState } from "react";
import { Pencil, Save, AlertTriangle } from "lucide-react";
import { useUpdateAdminService } from "@/features/admin/modules/service/hooks/useAdminServices";
import {
  AdminServiceEntity, UpdateAdminServiceDto,
} from "@/features/admin/modules/service/services/admin-services.service";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BaseButton } from "@/components/ui/base/base_button";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// ─── Edit Sheet ───────────────────────────────────────────────────────────────

export function EditServiceSheet({ svc, open, onClose }: {
  svc: AdminServiceEntity | null;
  open: boolean;
  onClose: () => void;
}) {
  const updateMutation = useUpdateAdminService();
  // Lazy initializer — form được reset bằng key={svc?.id} ở nơi render
  const [form, setForm] = useState<UpdateAdminServiceDto>(() => ({
    name: svc?.name ?? "",
    shortDescription: svc?.shortDescription ?? "",
    description: svc?.description ?? "",
    coverageArea: svc?.coverageArea ?? "",
    durationHours: svc?.durationHours ?? undefined,
    pricingType: svc?.pricingType,
    isActive: svc?.isActive ?? true,
  }));

  if (!svc) return null;

  const set = <K extends keyof UpdateAdminServiceDto>(k: K, v: UpdateAdminServiceDto[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="cz-admin w-full sm:max-w-[520px] p-0 overflow-y-auto flex flex-col">
        <SheetHeader className="px-6 py-5 border-b border-(--c-line)/50 bg-(--c-card) sticky top-0 z-10">
          <SheetTitle className="text-xl font-black flex items-center gap-2">
            <Pencil className="w-5 h-5 text-(--c-primary-strong)" aria-hidden="true" />
            Chỉnh sửa dịch vụ con
          </SheetTitle>
          <SheetDescription>
            <span className="font-mono text-xs text-(--c-primary-strong)">{svc.subServiceCode}</span> · {svc.name}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-(--c-ink)">Tên dịch vụ *</label>
            <Input value={form.name ?? ""} onChange={e => set("name", e.target.value)} className="h-10 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-(--c-ink)">Mô tả ngắn</label>
            <Textarea value={form.shortDescription ?? ""} onChange={e => set("shortDescription", e.target.value)}
              rows={2} className="rounded-xl resize-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-(--c-ink)">Mô tả đầy đủ</label>
            <Textarea value={form.description ?? ""} onChange={e => set("description", e.target.value)}
              rows={4} className="rounded-xl resize-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-(--c-ink)">Khu vực phục vụ</label>
            <Input value={form.coverageArea ?? ""} onChange={e => set("coverageArea", e.target.value)}
              placeholder="VD: Hà Nội, TP.HCM..." className="h-10 rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-(--c-ink)">Thời lượng (giờ)</label>
              <Input type="number" min={0} step={0.5}
                value={form.durationHours ?? ""}
                onChange={e => set("durationHours", e.target.value ? Number(e.target.value) : undefined)}
                className="h-10 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-(--c-ink)">Loại tính giá</label>
              <Select value={form.pricingType ?? "FIXED"} onValueChange={v => set("pricingType", v)}>
                <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="cz-admin">
                  <SelectItem value="FIXED">Cố định</SelectItem>
                  <SelectItem value="HOURLY">Theo giờ</SelectItem>
                  <SelectItem value="CUSTOM">Tuỳ chỉnh</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-(--c-card-2) border border-(--c-line)/40 rounded-xl">
            <Switch checked={form.isActive ?? true} onCheckedChange={v => set("isActive", v)} />
            <div>
              <p className={cn("text-sm font-bold", form.isActive ? "text-[#0E9F6E]" : "text-(--c-muted)")}>
                {form.isActive ? "Đang hoạt động" : "Tắt"}
              </p>
              <p className="text-xs text-(--c-muted)">
                {form.isActive ? "Dịch vụ hiển thị cho khách hàng" : "Dịch vụ đang bị ẩn"}
              </p>
            </div>
          </div>
          <div className="bg-[rgba(217,119,6,0.14)] dark:bg-[rgba(217,119,6,0.14)] border border-[#D97706]/60 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-xs text-[#D97706] dark:text-[#D97706]">
              Thay đổi tên/mô tả sẽ ảnh hưởng đến tất cả gói dịch vụ liên kết.
            </p>
          </div>
        </div>
        <div className="border-t border-(--c-line)/40 px-6 py-4 flex gap-3 justify-end bg-(--c-card)">
          <BaseButton variant="outline" onClick={onClose} className="rounded-xl">Hủy</BaseButton>
          <BaseButton variant="primary" onClick={() => updateMutation.mutate({ id: svc.id, payload: form }, { onSuccess: onClose })}
            disabled={updateMutation.isPending || !form.name?.trim()} className="rounded-xl gap-2">
            <Save className="w-4 h-4" aria-hidden="true" />
            {updateMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
          </BaseButton>
        </div>
      </SheetContent>
    </Sheet>
  );
}
