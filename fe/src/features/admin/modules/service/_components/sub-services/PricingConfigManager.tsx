import { useState } from "react";
import { Pencil, PlusCircle, Save, DollarSign, Info } from "lucide-react";
import {
  useCreatePricingConfig, useUpdatePricingConfig,
} from "@/features/admin/hooks/useAdminPricing";
import {
  CreatePricingConfigDto, PricingConfigEntity,
} from "@/features/admin/services/admin-pricing.service";
import {
  AdminServiceEntity,
} from "@/features/admin/modules/service/services/admin-services.service";
import { useUpdateAdminService } from "@/features/admin/modules/service/hooks/useAdminServices";
import { BaseButton } from "@/components/ui/base/base_button";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { PricingFormFields, PricingFormData } from "./PricingConfigForm";

const vnd = (val: number | string | null | undefined) => {
  if (!val && val !== 0) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency", currency: "VND", maximumFractionDigits: 0,
  }).format(Number(val));
};

// ─── Pricing Config Manager (inside Detail Sheet) ────────────────────────────────────

type PricingMode = "view" | "edit" | "create";

const emptyPricingForm: CreatePricingConfigDto = {
  name: "", basePrice: 0, peakPrice: null,
  petFee: 0, waitingFee: 0, priceUnit: "VND",
  isActive: true,
};

export function PricingConfigManager({ svc }: { svc: AdminServiceEntity }) {
  const [mode, setMode] = useState<PricingMode>("view");
  const [editForm, setEditForm] = useState<PricingFormData>({ ...emptyPricingForm });

  const updateSvc  = useUpdateAdminService();
  const createCfg  = useCreatePricingConfig();
  const updateCfg  = useUpdatePricingConfig();

  const cfg = svc.pricingConfig;

  // Seed helpers — gọi khi user click, không dùng useEffect
  const startEdit = () => {
    if (!cfg) return;
    setEditForm({
      id: cfg.id, name: cfg.name,
      basePrice: Number(cfg.basePrice ?? 0),
      peakPrice: cfg.peakPrice ? Number(cfg.peakPrice) : null,
      petFee: cfg.petFee ? Number(cfg.petFee) : 0,
      waitingFee: cfg.waitingFee ? Number(cfg.waitingFee) : 0,
      priceUnit: "VND", isActive: true,
    });
    setMode("edit");
  };

  const startCreate = () => {
    setEditForm({ ...emptyPricingForm });
    setMode("create");
  };

  const set = <K extends keyof PricingFormData>(k: K, v: PricingFormData[K]) =>
    setEditForm(prev => ({ ...prev, [k]: v }));

  const handleSaveEdit = () => {
    if (!editForm.id) return;
    updateCfg.mutate(
      { id: editForm.id, payload: editForm },
      { onSuccess: () => setMode("view") },
    );
  };

  const handleCreate = () => {
    createCfg.mutate(editForm, {
      onSuccess: (newCfg: PricingConfigEntity) => {
        updateSvc.mutate(
          { id: svc.id, payload: { pricingConfigId: newCfg.id } },
          { onSuccess: () => { toast.success("Đã tạo và liên kết bảng giá!"); setMode("view"); } },
        );
      },
    });
  };

  const isSaving = createCfg.isPending || updateCfg.isPending || updateSvc.isPending;

  // ── VIEW mode ──
  if (mode === "view") {
    return (
      <div className="space-y-4">
        {cfg ? (
          <>
            {/* Current config display */}
            <div className="bg-linear-to-br from-(--c-primary-soft) to-(--c-primary-soft) border border-(--c-primary)/20 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-black text-(--c-ink) text-base">{cfg.name}</p>
                  <p className="text-xs text-(--c-muted) mt-0.5">ID: <span className="font-mono">{cfg.id}</span></p>
                </div>
                <span className="text-[9px] font-bold px-2 py-1 rounded-full bg-[rgba(14,159,110,0.12)] text-[#0E9F6E]">
                  Đang liên kết
                </span>
              </div>

              {/* Price grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: "Giá gốc",      value: vnd(cfg.basePrice),                              highlight: true  },
                  { label: "Giá cao điểm", value: cfg.peakPrice ? vnd(cfg.peakPrice) : "—",       highlight: false },
                  { label: "Phí thú cưng", value: cfg.petFee    ? vnd(cfg.petFee)    : "—",       highlight: false },
                  { label: "Phí chờ đợi",  value: cfg.waitingFee ? vnd(cfg.waitingFee) : "—",    highlight: false },
                ].map(f => (
                  <div key={f.label} className="bg-(--c-card) border border-(--c-line)/30 rounded-xl p-3">
                    <p className="text-[9px] text-(--c-muted) font-bold uppercase tracking-wide">{f.label}</p>
                    <p className={cn("text-sm font-black mt-0.5", f.highlight ? "text-(--c-primary-strong) text-base" : "text-(--c-ink)")}>
                      {f.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions — chỉ edit/create, không share config */}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={startEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-(--c-primary) text-white text-xs font-bold hover:bg-(--c-primary) transition-colors">
                <Pencil className="w-3.5 h-3.5" aria-hidden="true" />Chỉnh sửa giá
              </button>
              <button type="button" onClick={startCreate}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-(--c-line)/50 text-xs font-semibold text-(--c-muted) hover:text-[#0E9F6E] hover:border-[#0E9F6E] transition-colors">
                <PlusCircle className="w-3.5 h-3.5" aria-hidden="true" />Tạo lại bảng giá mới
              </button>
            </div>

            {/* Note */}
            <div className="flex items-start gap-2 p-3 bg-[rgba(37,99,235,0.12)] dark:bg-[rgba(37,99,235,0.12)] border border-[#2563EB]/50 rounded-xl">
              <Info className="w-3.5 h-3.5 text-[#2563EB] shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-[10px] text-[#2563EB] dark:text-[#2563EB]">
                Bảng giá này dành riêng cho <strong>{svc.name}</strong>. Giá của gói dịch vụ sẽ được tính dựa trên giá gốc của từng dịch vụ con cộng với phụ phí gói.
              </p>
            </div>
          </>
        ) : (
          /* No config yet */
          <div className="py-8 text-center border-2 border-dashed border-(--c-line)/50 rounded-2xl">
            <DollarSign className="w-10 h-10 mx-auto mb-3 text-(--c-muted)" aria-hidden="true" />
            <p className="text-sm font-semibold text-(--c-muted)">Chưa thiết lập giá</p>
            <p className="text-xs text-(--c-muted) mt-1 mb-4">Tạo bảng giá riêng cho <strong>{svc.name}</strong></p>
            <button type="button" onClick={() => setMode("create")}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-(--c-primary) text-white text-xs font-bold hover:bg-(--c-primary) transition-colors mx-auto">
              <PlusCircle className="w-3.5 h-3.5" aria-hidden="true" />Tạo bảng giá
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── EDIT mode ──
  if (mode === "edit") {
    return (
      <div className="space-y-4 bg-[rgba(37,99,235,0.12)] dark:bg-[rgba(37,99,235,0.12)] border border-[#2563EB]/60 rounded-2xl p-5">
        <p className="text-sm font-black text-[#2563EB] dark:text-[#2563EB] flex items-center gap-2">
          <Pencil className="w-4 h-4" aria-hidden="true" />Chỉnh sửa bảng giá
        </p>
        <PricingFormFields form={editForm} onChange={set} />
        <div className="flex gap-2 justify-end">
          <BaseButton variant="outline" size="sm" onClick={() => setMode("view")} disabled={isSaving} className="rounded-xl">Hủy</BaseButton>
          <BaseButton variant="primary" size="sm" onClick={handleSaveEdit}
            disabled={isSaving || !editForm.name?.trim()} className="rounded-xl gap-2">
            <Save className="w-3.5 h-3.5" aria-hidden="true" />
            {isSaving ? "Đang lưu..." : "Lưu bảng giá"}
          </BaseButton>
        </div>
      </div>
    );
  }

  // ── CREATE mode ──
  if (mode === "create") {
    return (
      <div className="space-y-4 bg-[rgba(14,159,110,0.12)] dark:bg-[rgba(14,159,110,0.12)] border border-[#0E9F6E]/60 rounded-2xl p-5">
        <p className="text-sm font-black text-[#0E9F6E] dark:text-[#0E9F6E] flex items-center gap-2">
          <PlusCircle className="w-4 h-4" aria-hidden="true" />Tạo bảng giá mới và liên kết
        </p>
        <PricingFormFields form={editForm} onChange={set} />
        <div className="flex gap-2 justify-end">
          <BaseButton variant="outline" size="sm" onClick={() => setMode("view")} disabled={isSaving} className="rounded-xl">Hủy</BaseButton>
          <BaseButton variant="primary" size="sm" onClick={handleCreate}
            disabled={isSaving || !editForm.name?.trim() || !editForm.basePrice} className="rounded-xl gap-2">
            <PlusCircle className="w-3.5 h-3.5" aria-hidden="true" />
            {isSaving ? "Đang tạo..." : "Tạo & Liên kết"}
          </BaseButton>
        </div>
      </div>
    );
  }

  return null;
}
