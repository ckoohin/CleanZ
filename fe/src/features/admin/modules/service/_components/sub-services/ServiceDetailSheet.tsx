import React, { useState } from "react";
import Image from "next/image";
import {
  Package, Pencil, CheckCircle2, XCircle, Check, X, FileText, Image as ImageIcon,
} from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { AdminServiceEntity } from "@/features/admin/modules/service/services/admin-services.service";
import { cn } from "@/lib/utils";
import { PricingConfigManager } from "./PricingConfigManager";

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

// ─── InfoRow ──────────────────────────────────────────────────────────────────

function InfoRow({ label, value, highlight = false }: {
  label: string; value: React.ReactNode; highlight?: boolean;
}) {
  return (
    <div className="flex justify-between items-start gap-3 py-2.5 px-4 border-b border-(--c-line)/30 last:border-0">
      <span className="text-xs text-(--c-muted) shrink-0 pt-0.5">{label}</span>
      <span className={cn("text-sm font-semibold text-right", highlight ? "text-(--c-primary-strong)" : "text-(--c-ink)")}>
        {value}
      </span>
    </div>
  );
}

// ─── Detail Sheet ─────────────────────────────────────────────────────────────

export function ServiceDetailSheet({ svc, open, onClose, onEdit }: {
  svc: AdminServiceEntity | null;
  open: boolean;
  onClose: () => void;
  onEdit: (svc: AdminServiceEntity) => void;
}) {
  // ⚠️ hooks phải đầu component, trước early return
  const [tab, setTab] = useState<"info" | "pricing">("info");

  if (!svc) return null;
  const pt = PRICING_TYPE_LABELS[svc.pricingType] ?? { label: svc.pricingType, color: "bg-[var(--c-card-2)] text-[var(--c-muted)]" };

  const tabs = [
    { key: "info" as const,    label: "Thông tin" },
    { key: "pricing" as const, label: "Cấu hình giá" },
  ];

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="cz-admin w-full sm:max-w-[560px] p-0 overflow-y-auto flex flex-col">
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b border-(--c-line)/50 bg-(--c-card) sticky top-0 z-10">
          <div className="flex items-start gap-4">
            <div className="relative h-14 w-14 rounded-xl overflow-hidden bg-(--c-card-2) shrink-0 border border-(--c-line)/40">
              {svc.thumbnailUrl ? (
                <Image src={svc.thumbnailUrl} alt={svc.name} fill className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Package className="w-6 h-6 text-(--c-muted)" aria-hidden="true" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg font-black text-(--c-ink) leading-tight">{svc.name}</SheetTitle>
              <SheetDescription className="mt-1.5">
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-(--c-primary-soft) text-(--c-primary-strong) font-bold">
                    {svc.subServiceCode}
                  </span>
                  <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold uppercase", pt.color)}>
                    {pt.label}
                  </span>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                    svc.isActive ? "bg-[rgba(14,159,110,0.12)] text-[#0E9F6E]" : "bg-[rgba(225,29,72,0.12)] text-[#E11D48]",
                  )}>
                    {svc.isActive ? "Hoạt động" : "Tắt"}
                  </span>
                </div>
              </SheetDescription>
            </div>
            <button type="button" onClick={() => { onClose(); onEdit(svc); }}
              className="p-2 rounded-xl text-(--c-muted) hover:text-(--c-primary-strong) hover:bg-(--c-primary-soft) transition-colors shrink-0">
              <Pencil className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 mt-3 bg-(--c-card-2) p-1 rounded-xl">
            {tabs.map(t => (
              <button key={t.key} type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all",
                  tab === t.key
                    ? "bg-(--c-card) text-(--c-primary-strong) shadow-sm"
                    : "text-(--c-muted) hover:text-(--c-ink)",
                )}>
                {t.label}
              </button>
            ))}
          </div>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto pb-8">

          {/* ── TAB: INFO ── */}
          {tab === "info" && (
            <>
              {/* Price summary */}
              <div className="grid grid-cols-2 gap-3 p-4 border-b border-(--c-line)/40">
                {[
                  { label: "Giá gốc",      value: svc.pricingConfig?.basePrice ? vnd(svc.pricingConfig.basePrice) : "Chưa thiết lập", color: "text-[var(--c-primary-strong)]" },
                  { label: "Giá cao điểm", value: svc.pricingConfig?.peakPrice ? vnd(svc.pricingConfig.peakPrice) : "—",               color: "text-[#D97706]" },
                  { label: "Phí thú cưng", value: svc.pricingConfig?.petFee ? vnd(svc.pricingConfig.petFee) : "—",                     color: "text-[var(--c-ink)]" },
                  { label: "Phí chờ đợi",  value: svc.pricingConfig?.waitingFee ? vnd(svc.pricingConfig.waitingFee) : "—",             color: "text-[var(--c-ink)]" },
                ].map(s => (
                  <div key={s.label} className="bg-(--c-card-2) rounded-xl p-3 border border-(--c-line)/30">
                    <p className="text-[9px] text-(--c-muted) font-bold uppercase tracking-wide">{s.label}</p>
                    <p className={cn("text-sm font-black mt-0.5", s.color)}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Core fields */}
              <div className="divide-y divide-(--c-line)/30 mt-1">
                <InfoRow label="Mã dịch vụ" value={<span className="font-mono text-xs">{svc.subServiceCode}</span>} />
                <InfoRow label="Loại tính giá" value={svc.pricingType} />
                {svc.durationHours != null && (
                  <InfoRow label="Thời lượng" value={`${svc.durationHours} giờ`} highlight />
                )}
                {svc.coverageArea && (
                  <InfoRow label="Khu vực phục vụ" value={svc.coverageArea} />
                )}
                {svc.pricingConfig?.name && (
                  <InfoRow label="Bảng giá liên kết" value={svc.pricingConfig.name} />
                )}
              </div>

              {/* Descriptions */}
              {(svc.shortDescription || svc.description) && (
                <div className="px-4 pt-5 pb-3 border-t border-(--c-line)/40 space-y-4">
                  {svc.shortDescription && (
                    <div>
                      <p className="text-[10px] font-black text-(--c-muted) uppercase tracking-wider mb-2 flex items-center gap-1">
                        <FileText className="w-3 h-3" aria-hidden="true" />Mô tả ngắn
                      </p>
                      <p className="text-sm leading-relaxed text-(--c-ink) bg-(--c-card-2) p-3 rounded-xl border border-(--c-line)/30">
                        {svc.shortDescription}
                      </p>
                    </div>
                  )}
                  {svc.description && (
                    <div>
                      <p className="text-[10px] font-black text-(--c-muted) uppercase tracking-wider mb-2 flex items-center gap-1">
                        <FileText className="w-3 h-3" aria-hidden="true" />Mô tả đầy đủ
                      </p>
                      <p className="text-sm leading-relaxed text-(--c-muted) bg-(--c-card-2) p-3 rounded-xl border border-(--c-line)/30 whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {svc.description}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Tasks */}
              {((svc.includedTasks?.length ?? 0) > 0 || (svc.excludedTasks?.length ?? 0) > 0) && (
                <div className="px-4 pt-4 pb-3 border-t border-(--c-line)/40">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {(svc.includedTasks?.length ?? 0) > 0 && (
                      <div>
                        <p className="text-[10px] font-black text-[#0E9F6E] uppercase tracking-wider mb-3 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                          Bao gồm ({svc.includedTasks?.length})
                        </p>
                        <ul className="space-y-2">
                          {svc.includedTasks?.map((task, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <Check className="w-3.5 h-3.5 text-[#0E9F6E] shrink-0 mt-0.5" aria-hidden="true" />
                              <span>{task}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {(svc.excludedTasks?.length ?? 0) > 0 && (
                      <div>
                        <p className="text-[10px] font-black text-[#E11D48] uppercase tracking-wider mb-3 flex items-center gap-1">
                          <XCircle className="w-3 h-3" aria-hidden="true" />
                          Không gồm ({svc.excludedTasks?.length})
                        </p>
                        <ul className="space-y-2">
                          {svc.excludedTasks?.map((task, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-(--c-muted)">
                              <X className="w-3.5 h-3.5 text-[#E11D48] shrink-0 mt-0.5" aria-hidden="true" />
                              <span>{task}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Gallery */}
              {(svc.galleryUrls?.length ?? 0) > 0 && (
                <div className="px-4 pt-4 pb-3 border-t border-(--c-line)/40">
                  <p className="text-[10px] font-black text-(--c-muted) uppercase tracking-wider mb-3 flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" aria-hidden="true" />
                    Ảnh dịch vụ ({svc.galleryUrls?.length})
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {svc.galleryUrls?.map((url, i) => (
                      <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-(--c-line)/40">
                        <Image src={url} alt={`${svc.name} ${i + 1}`} fill className="object-cover hover:scale-105 transition-transform" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── TAB: PRICING ── */}
          {tab === "pricing" && (
            <div className="p-5">
              <PricingConfigManager svc={svc} />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
