"use client";

import React, { useState, useMemo, useCallback, useRef, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Package, DollarSign, ScrollText, Wrench,
  Loader2, ChevronRight, CheckCircle2, Info,
  Clock, Moon, PawPrint, Hammer, Timer, TrendingUp,
  Search, Plus, X, Check, Star, List, Settings2,
  AlertCircle, Image as ImageIcon, ExternalLink,
  ChevronDown, ChevronUp, Trash2, Smile, GripVertical,
  Zap, Layers, Shuffle,
} from "lucide-react";
import { ImageUpload } from "@/components/ui/image-upload";
import { MultipleImageUpload } from "@/components/ui/multiple-image-upload";
import { BaseButton } from "@/components/ui/base/base_button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  useCreateAdminPackage,
  useAdminServices,
  useCreateAdminService,
  useAddSubServicesToPackage,
} from "@/features/admin/modules/service/hooks/useAdminServices";
import { usePricingConfigs } from "@/features/admin/hooks/useAdminPricing";
import { CreateAdminPackageDto, AdminServiceEntity } from "@/features/admin/modules/service/services/admin-services.service";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// ─── Step config ──────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Thông tin cơ bản", icon: Package },
  { id: 2, label: "Cấu hình giá",     icon: DollarSign },
  { id: 3, label: "Dịch vụ con",      icon: Wrench },
  { id: 4, label: "Điều khoản",       icon: ScrollText },
  { id: 5, label: "Xem lại & Tạo",   icon: CheckCircle2 },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const vnd = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n);

function slugify(text: string) {
  return "PKG-" +
    text.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9\s]/g, "").trim().split(/\s+/).join("-").toUpperCase();
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface SelectedSubService {
  id: string;
  name: string;
  isRequired: boolean;
  isDefault: boolean;
  sortOrder: number;
}

interface CustomSurcharge {
  id: string;
  label: string;
  emoji: string;
  amount: number;
  hint: string;
}

interface QuickCreateSubService {
  name: string;
  shortDescription: string;
  description: string;
  durationHours: string;
  coverageArea: string;
  pricingConfigId: string;
  pricingType: string;
  // FIXED
  fixedPrice: string;
  // HOURLY
  hourlyRate: string;
  minHours: string;
  // CUSTOM
  pricingNote: string;
  thumbnailUrl: string;
  galleryUrls: string[];
  includedTasks: string[];
  excludedTasks: string[];
  isActive: boolean;
}

const defaultQuickCreate: QuickCreateSubService = {
  name: "", shortDescription: "", description: "",
  durationHours: "", coverageArea: "", pricingConfigId: "",
  pricingType: "FIXED",
  fixedPrice: "", hourlyRate: "", minHours: "", pricingNote: "",
  thumbnailUrl: "", galleryUrls: [],
  includedTasks: [], excludedTasks: [], isActive: true,
};

const DEFAULT_EMOJI_OPTIONS = ["🌙","🐾","⏱️","🔧","🚿","🪴","🚪","🏠","🧹","🧼","🧽","💡","🔑","🛋️","🪟","🪣","🧺","🚗","📦"];

// ─── TaskTagInput ─────────────────────────────────────────────────────────────

function TaskTagInput({
  value, onChange, placeholder, variant,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  variant: "included" | "excluded";
}) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const add = useCallback(() => {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput("");
  }, [input, value, onChange]);

  const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx));

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); }
    if (e.key === "Backspace" && !input && value.length > 0) remove(value.length - 1);
  };

  const isIncluded = variant === "included";

  return (
    <div className={cn(
      "rounded-2xl border-2 overflow-hidden transition-all",
      isIncluded ? "border-[#0E9F6E]/70 dark:border-[#0E9F6E]/50 bg-[rgba(14,159,110,0.12)] dark:bg-[rgba(14,159,110,0.12)]"
                 : "border-[#E11D48]/70 dark:border-[#E11D48]/50 bg-[rgba(225,29,72,0.12)] dark:bg-[rgba(225,29,72,0.12)]",
    )}>
      {/* Header */}
      <div className={cn(
        "flex items-center gap-2 px-4 py-3 border-b",
        isIncluded ? "border-[#0E9F6E]/50 bg-[rgba(14,159,110,0.12)] dark:bg-[rgba(14,159,110,0.12)]"
                   : "border-[#E11D48]/50 bg-[rgba(225,29,72,0.12)] dark:bg-[rgba(225,29,72,0.12)]",
      )}>
        <div className={cn(
          "w-5 h-5 rounded-full flex items-center justify-center shrink-0",
          isIncluded ? "bg-[#0E9F6E]" : "bg-[#E11D48]",
        )}>
          {isIncluded
            ? <Check className="w-3 h-3 text-white" aria-hidden="true" />
            : <X className="w-3 h-3 text-white" aria-hidden="true" />}
        </div>
        <span className={cn(
          "text-xs font-black uppercase tracking-widest",
          isIncluded ? "text-[#0E9F6E] dark:text-[#0E9F6E]" : "text-[#E11D48] dark:text-[#E11D48]",
        )}>
          {isIncluded ? "Công việc bao gồm" : "Không bao gồm"}
        </span>
        <span className={cn(
          "ml-auto text-xs font-bold rounded-full px-2 py-0.5",
          isIncluded ? "bg-[#0E9F6E] text-[#0E9F6E]" : "bg-[#E11D48] text-[#E11D48]",
        )}>
          {value.length} mục
        </span>
      </div>

      {/* Tags area */}
      <div
        className="min-h-[80px] p-3 flex flex-wrap gap-2 cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag, i) => (
          <span key={i} className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all group",
            isIncluded
              ? "bg-[#0E9F6E] text-[#0E9F6E] dark:text-[#0E9F6E] border border-[#0E9F6E]/50 hover:border-[#0E9F6E]"
              : "bg-[#E11D48] text-[#E11D48] dark:text-[#E11D48] border border-[#E11D48]/50 hover:border-[#E11D48]",
          )}>
            <GripVertical className="w-3 h-3 opacity-30" aria-hidden="true" />
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); remove(i); }}
              className={cn(
                "rounded-full w-4 h-4 flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity",
                isIncluded ? "hover:bg-[#0E9F6E]" : "hover:bg-[#E11D48]",
              )}
            >
              <X className="w-2.5 h-2.5" aria-hidden="true" />
            </button>
          </span>
        ))}

        {/* Inline input */}
        <div className="flex items-center gap-2 flex-1 min-w-[180px]">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={value.length === 0 ? placeholder : "Thêm mục..."}
            className="flex-1 bg-transparent outline-none text-xs text-[var(--c-ink)] placeholder:text-[var(--c-muted)] py-1"
          />
          {input.trim() && (
            <button
              type="button"
              onClick={add}
              className={cn(
                "text-xs font-bold px-2 py-1 rounded-lg transition-colors shrink-0",
                isIncluded ? "bg-[#0E9F6E] text-[#0E9F6E] hover:bg-[#0E9F6E]"
                           : "bg-[#E11D48] text-[#E11D48] hover:bg-[#E11D48]",
              )}
            >
              + Thêm
            </button>
          )}
        </div>
      </div>

      <div className={cn(
        "px-4 py-2 border-t text-[10px]",
        isIncluded ? "border-[#0E9F6E]/40 text-[#0E9F6E]" : "border-[#E11D48]/40 text-[#E11D48]",
      )}>
        Enter hoặc dấu phẩy để thêm · Backspace để xoá mục cuối
      </div>
    </div>
  );
}

// ─── UI atoms ─────────────────────────────────────────────────────────────────

function SectionCard({ icon: Icon, title, description, children }: {
  icon: React.ElementType; title: string; description?: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--c-card)] border border-[var(--c-line)]/50 rounded-2xl overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-[var(--c-line)]/40 bg-[var(--c-card-2)] flex items-center gap-3">
        <div className="p-2 bg-[var(--c-primary-soft)] rounded-xl">
          <Icon className="w-4 h-4 text-[var(--c-primary-strong)]" aria-hidden="true" />
        </div>
        <div>
          <h3 className="font-bold text-[var(--c-ink)] text-base">{title}</h3>
          {description && <p className="text-xs text-[var(--c-muted)] mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-bold">
        {label}{required && <span className="text-[#E11D48] ml-0.5">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-[var(--c-muted)]">{hint}</p>}
    </div>
  );
}

// ─── PricingTypeForm ──────────────────────────────────────────────────────────

function PricingTypeForm({
  pricingType, value, onChange,
}: {
  pricingType: string;
  value: QuickCreateSubService;
  onChange: (v: QuickCreateSubService) => void;
}) {
  const set = (k: keyof QuickCreateSubService, v: string) => onChange({ ...value, [k]: v });

  if (pricingType === "FIXED") {
    return (
      <div className="rounded-xl border border-[#0E9F6E]/60 bg-[rgba(14,159,110,0.12)] dark:bg-[rgba(14,159,110,0.12)] p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-4 h-4 text-[#0E9F6E]" aria-hidden="true" />
          <span className="text-sm font-black text-[#0E9F6E] dark:text-[#0E9F6E]">FIXED — Giá cố định</span>
        </div>
        <p className="text-xs text-[var(--c-muted)]">Khách hàng trả một mức giá cố định, không phụ thuộc vào thời gian thực tế.</p>
        <Field label="Giá cố định" required hint="Giá niêm yết hiển thị cho khách hàng">
          <div className="flex items-center gap-2">
            <Input
              inputMode="numeric" placeholder="VD: 150000"
              value={value.fixedPrice}
              onChange={(e) => set("fixedPrice", e.target.value.replace(/\D/g, ""))}
              className="h-10 rounded-xl flex-1"
            />
            <span className="text-sm font-bold text-[var(--c-muted)] shrink-0">₫</span>
          </div>
          {value.fixedPrice && Number(value.fixedPrice) > 0 && (
            <p className="text-xs font-bold text-[#0E9F6E] mt-1">{vnd(Number(value.fixedPrice))}</p>
          )}
        </Field>
      </div>
    );
  }

  if (pricingType === "HOURLY") {
    return (
      <div className="rounded-xl border border-[#2563EB]/60 bg-[rgba(37,99,235,0.12)] dark:bg-[rgba(37,99,235,0.12)] p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-4 h-4 text-[#2563EB]" aria-hidden="true" />
          <span className="text-sm font-black text-[#2563EB] dark:text-[#2563EB]">HOURLY — Tính theo giờ</span>
        </div>
        <p className="text-xs text-[var(--c-muted)]">Giá tính theo số giờ làm việc thực tế, nhân viên báo cáo giờ vào/ra.</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Giá mỗi giờ" required>
            <div className="flex items-center gap-2">
              <Input
                inputMode="numeric" placeholder="VD: 80000"
                value={value.hourlyRate}
                onChange={(e) => set("hourlyRate", e.target.value.replace(/\D/g, ""))}
                className="h-10 rounded-xl"
              />
              <span className="text-sm font-bold text-[var(--c-muted)] shrink-0">₫/h</span>
            </div>
            {value.hourlyRate && Number(value.hourlyRate) > 0 && (
              <p className="text-xs font-bold text-[#2563EB] mt-1">{vnd(Number(value.hourlyRate))}/giờ</p>
            )}
          </Field>
          <Field label="Số giờ tối thiểu" hint="Để 0 nếu không giới hạn">
            <div className="flex items-center gap-2">
              <Input
                inputMode="decimal" placeholder="VD: 2"
                value={value.minHours}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^\d*\.?\d*$/.test(v)) set("minHours", v);
                }}
                className="h-10 rounded-xl"
              />
              <span className="text-sm font-bold text-[var(--c-muted)] shrink-0">giờ</span>
            </div>
          </Field>
        </div>
        {value.hourlyRate && value.minHours && Number(value.hourlyRate) > 0 && Number(value.minHours) > 0 && (
          <div className="bg-[#2563EB] rounded-lg p-2.5 text-xs text-[#2563EB] dark:text-[#2563EB]">
            💡 Đơn tối thiểu: <strong>{vnd(Number(value.hourlyRate) * Number(value.minHours))}</strong>
            {" "}({value.minHours} giờ × {vnd(Number(value.hourlyRate))}/giờ)
          </div>
        )}
      </div>
    );
  }

  if (pricingType === "CUSTOM") {
    return (
      <div className="rounded-xl border border-[#7C3AED]/60 bg-[rgba(124,58,237,0.12)] dark:bg-[rgba(124,58,237,0.12)] p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Shuffle className="w-4 h-4 text-[#7C3AED]" aria-hidden="true" />
          <span className="text-sm font-black text-[#7C3AED] dark:text-[#7C3AED]">CUSTOM — Tuỳ chỉnh</span>
        </div>
        <p className="text-xs text-[var(--c-muted)]">
          Cấu trúc giá tùy chỉnh — VD: tính theo diện tích, số phòng, gói combo...
        </p>
        <Field label="Mô tả cấu trúc giá" hint="Nhân viên và khách hàng sẽ thấy mô tả này">
          <Textarea
            placeholder={"VD: Giá tính theo diện tích:\n• Dưới 50m²: 150.000đ\n• 50–80m²: 220.000đ\n• 80–120m²: 320.000đ\n• Trên 120m²: Liên hệ báo giá"}
            value={value.pricingNote}
            onChange={(e) => set("pricingNote", e.target.value)}
            rows={5}
            className="rounded-xl text-sm resize-none font-mono"
          />
        </Field>
      </div>
    );
  }

  return null;
}

// ─── SubServiceCard ───────────────────────────────────────────────────────────

function SubServiceCard({ svc, isSelected, onToggle }: {
  svc: AdminServiceEntity;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();

  return (
    <div className={cn(
      "rounded-xl border-2 transition-all duration-200 overflow-hidden",
      isSelected
        ? "border-[var(--c-primary)] bg-[var(--c-primary-soft)] shadow-sm shadow-primary/20"
        : "border-[var(--c-line)]/40 bg-[var(--c-card)] hover:border-[var(--c-primary)]/30",
    )}>
      {/* Main row */}
      <div className="flex items-center gap-3 p-3">
        {/* Checkbox */}
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
            isSelected ? "border-[var(--c-primary)] bg-[var(--c-primary)]" : "border-[var(--c-muted)]",
          )}
        >
          {isSelected && <Check className="w-3 h-3 text-white" aria-hidden="true" />}
        </button>

        {/* Thumbnail */}
        <button type="button" onClick={onToggle} className="relative h-11 w-11 rounded-xl overflow-hidden bg-[var(--c-card-2)] border border-[var(--c-line)]/40 shrink-0">
          {svc.thumbnailUrl
            ? <img src={svc.thumbnailUrl} alt={svc.name} className="w-full h-full object-cover" />
            : <div className="flex h-full items-center justify-center"><ImageIcon className="w-5 h-5 text-[var(--c-muted)]" /></div>}
        </button>

        {/* Info */}
        <button type="button" onClick={onToggle} className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm text-[var(--c-ink)] truncate">{svc.name}</span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)] font-bold shrink-0">
              {svc.subServiceCode}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            {svc.durationHours && (
              <span className="flex items-center gap-1 text-xs text-[var(--c-muted)]">
                <Clock className="w-3 h-3" aria-hidden="true" />{svc.durationHours}h
              </span>
            )}
            {svc.pricingConfig?.basePrice && (
              <span className="text-xs text-[var(--c-primary-strong)] font-bold">
                {vnd(Number(svc.pricingConfig.basePrice))}
              </span>
            )}
            <span className={cn(
              "text-[9px] font-bold px-1.5 py-0.5 rounded-full",
              svc.isActive ? "bg-[rgba(14,159,110,0.12)] text-[#0E9F6E]" : "bg-[rgba(225,29,72,0.12)] text-[#E11D48]",
            )}>
              {svc.isActive ? "Bật" : "Tắt"}
            </span>
          </div>
        </button>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Toggle expand info */}
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            className="p-1.5 rounded-lg hover:bg-[var(--c-card-2)] transition-colors text-[var(--c-muted)] hover:text-[var(--c-ink)]"
            title="Xem thông tin cơ bản"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" /> : <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />}
          </button>
          {/* Open detail page */}
          <button
            type="button"
            onClick={() => router.push(`/admin/services/${svc.id}`)}
            className="p-1.5 rounded-lg hover:bg-[rgba(37,99,235,0.12)] dark:hover:bg-[rgba(37,99,235,0.12)] transition-colors text-[var(--c-muted)] hover:text-[#2563EB]"
            title="Xem trang chi tiết"
          >
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Expanded info panel */}
      {expanded && (
        <div className="border-t border-[var(--c-line)]/30 bg-[var(--c-card-2)] px-4 py-3 space-y-2">
          {svc.shortDescription && (
            <p className="text-xs text-[var(--c-muted)] leading-relaxed">{svc.shortDescription}</p>
          )}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            {svc.coverageArea && (
              <span className="text-[var(--c-muted)]">🗺️ <strong>Khu vực:</strong> {svc.coverageArea}</span>
            )}
            {svc.pricingType && (
              <span className="text-[var(--c-muted)]">💱 <strong>Loại giá:</strong> {svc.pricingType}</span>
            )}
          </div>
          {((svc.includedTasks?.length ?? 0) > 0 || (svc.excludedTasks?.length ?? 0) > 0) && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              {(svc.includedTasks?.length ?? 0) > 0 && (
                <div>
                  <p className="text-[9px] font-black text-[#0E9F6E] uppercase tracking-wider mb-1">Bao gồm</p>
                  <ul className="space-y-0.5">
                    {(svc.includedTasks ?? []).slice(0, 3).map((t: string, i: number) => (
                      <li key={i} className="flex items-start gap-1 text-xs text-[#0E9F6E] dark:text-[#0E9F6E]">
                        <Check className="w-3 h-3 mt-0.5 shrink-0" aria-hidden="true" />{t}
                      </li>
                    ))}
                    {(svc.includedTasks?.length ?? 0) > 3 && (
                      <li className="text-xs text-[var(--c-muted)] italic">+{(svc.includedTasks?.length ?? 0) - 3} nữa...</li>
                    )}
                  </ul>
                </div>
              )}
              {(svc.excludedTasks?.length ?? 0) > 0 && (
                <div>
                  <p className="text-[9px] font-black text-[#E11D48] uppercase tracking-wider mb-1">Không gồm</p>
                  <ul className="space-y-0.5">
                    {(svc.excludedTasks ?? []).slice(0, 3).map((t: string, i: number) => (
                      <li key={i} className="flex items-start gap-1 text-xs text-[#E11D48] dark:text-[#E11D48]">
                        <X className="w-3 h-3 mt-0.5 shrink-0" aria-hidden="true" />{t}
                      </li>
                    ))}
                    {(svc.excludedTasks?.length ?? 0) > 3 && (
                      <li className="text-xs text-[var(--c-muted)] italic">+{(svc.excludedTasks?.length ?? 0) - 3} nữa...</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── CustomSurchargeRow ───────────────────────────────────────────────────────

function CustomSurchargeRow({
  item, onChange, onRemove,
}: {
  item: CustomSurcharge;
  onChange: (v: CustomSurcharge) => void;
  onRemove: () => void;
}) {
  const [showEmoji, setShowEmoji] = useState(false);

  return (
    <div className="flex items-center gap-3 bg-[var(--c-card)] border border-[var(--c-line)]/50 rounded-xl p-3 group">
      {/* Emoji picker trigger */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowEmoji(v => !v)}
          className="w-9 h-9 rounded-xl border border-[var(--c-line)]/50 hover:border-[var(--c-primary)]/50 bg-[var(--c-card-2)] flex items-center justify-center text-lg transition-all"
        >
          {item.emoji || "➕"}
        </button>
        {showEmoji && (
          <div className="absolute top-10 left-0 z-10 bg-[var(--c-card)] border border-[var(--c-line)] rounded-xl p-2 shadow-xl grid grid-cols-6 gap-1 w-44">
            {DEFAULT_EMOJI_OPTIONS.map(e => (
              <button
                key={e} type="button"
                onClick={() => { onChange({ ...item, emoji: e }); setShowEmoji(false); }}
                className="w-7 h-7 flex items-center justify-center text-base hover:bg-[var(--c-card-2)] rounded-lg"
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 grid grid-cols-2 gap-2">
        <Input
          placeholder="Tên phụ phí..."
          value={item.label}
          onChange={(e) => onChange({ ...item, label: e.target.value })}
          className="h-9 rounded-xl text-sm"
        />
        <Input
          placeholder="Ghi chú ngắn..."
          value={item.hint}
          onChange={(e) => onChange({ ...item, hint: e.target.value })}
          className="h-9 rounded-xl text-sm"
        />
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <Input
          inputMode="numeric" placeholder="0"
          value={item.amount ? String(item.amount) : ""}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, "");
            onChange({ ...item, amount: d ? Number(d) : 0 });
          }}
          className="h-9 rounded-xl text-sm w-28 text-right"
        />
        <span className="text-xs text-[var(--c-muted)] font-semibold">₫</span>
        <button
          type="button"
          onClick={onRemove}
          className="p-1.5 rounded-lg text-[var(--c-muted)] hover:text-[#E11D48] hover:bg-[rgba(225,29,72,0.12)] transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// ─── QuickCreateForm ──────────────────────────────────────────────────────────

function QuickCreateForm({
  value, onChange, pricingConfigs,
}: {
  value: QuickCreateSubService;
  onChange: (v: QuickCreateSubService) => void;
  pricingConfigs: { id: string; name: string; basePrice?: number }[];
}) {
  const set = (k: keyof QuickCreateSubService, v: QuickCreateSubService[keyof QuickCreateSubService]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="space-y-5">
      {/* Tên + Thời lượng */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Tên dịch vụ con" required>
          <Input placeholder="VD: Dọn dẹp căn hộ 1 phòng ngủ" value={value.name}
            onChange={(e) => set("name", e.target.value)} className="h-10 rounded-xl" />
        </Field>
        <Field label="Thời lượng" hint="Giờ">
          <Select value={value.durationHours} onValueChange={(v) => set("durationHours", v)}>
            <SelectTrigger className="h-10 rounded-xl">
              <SelectValue placeholder="Chọn thời lượng..." />
            </SelectTrigger>
            <SelectContent className="cz-admin">
              {["0.5","1","1.5","2","2.5","3","4","5","6","8"].map(h => (
                <SelectItem key={h} value={h}>{h} giờ</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label="Mô tả ngắn" hint="Hiển thị trong danh sách, tối đa 120 ký tự">
        <Input placeholder="Dịch vụ dọn dẹp tiêu chuẩn cho căn hộ nhỏ..."
          value={value.shortDescription} onChange={(e) => set("shortDescription", e.target.value)}
          className="h-10 rounded-xl" maxLength={120} />
      </Field>

      <Field label="Mô tả chi tiết">
        <Textarea placeholder="Mô tả đầy đủ về công việc, yêu cầu, lưu ý..." rows={3}
          value={value.description} onChange={(e) => set("description", e.target.value)}
          className="rounded-xl text-sm resize-none" />
      </Field>

      {/* Khu vực */}
      <Field label="Khu vực phục vụ">
        <Select value={value.coverageArea} onValueChange={(v) => set("coverageArea", v)}>
          <SelectTrigger className="h-10 rounded-xl">
            <SelectValue placeholder="Chọn khu vực..." />
          </SelectTrigger>
          <SelectContent className="cz-admin">
            {["Toàn quốc","Hà Nội","TP. Hồ Chí Minh","Đà Nẵng","Hải Phòng","Cần Thơ"].map(a => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {/* Loại tính giá */}
      <div className="space-y-3">
        <Field label="Loại tính giá">
          <div className="grid grid-cols-3 gap-2">
            {[
              { v: "FIXED",  label: "Cố định",   icon: Zap,     desc: "Một mức giá" },
              { v: "HOURLY", label: "Theo giờ",   icon: Clock,   desc: "Tính mỗi giờ" },
              { v: "CUSTOM", label: "Tuỳ chỉnh",  icon: Shuffle, desc: "Tự định nghĩa" },
            ].map(opt => (
              <button
                key={opt.v}
                type="button"
                onClick={() => set("pricingType", opt.v)}
                className={cn(
                  "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center",
                  value.pricingType === opt.v
                    ? "border-[var(--c-primary)] bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)]"
                    : "border-[var(--c-line)]/40 hover:border-[var(--c-primary)]/30 text-[var(--c-muted)] hover:text-[var(--c-ink)]",
                )}
              >
                <opt.icon className="w-4 h-4" aria-hidden="true" />
                <span className="text-xs font-bold">{opt.label}</span>
                <span className="text-[10px] opacity-70">{opt.desc}</span>
              </button>
            ))}
          </div>
        </Field>

        {/* Dynamic pricing form */}
        <PricingTypeForm pricingType={value.pricingType} value={value} onChange={onChange} />
      </div>

      {/* Bảng giá liên kết */}
      <Field label="Bảng giá liên kết" hint="Tùy chọn — dùng bảng giá đã cấu hình sẵn">
        <Select value={value.pricingConfigId} onValueChange={(v) => set("pricingConfigId", v)}>
          <SelectTrigger className="h-10 rounded-xl">
            <SelectValue placeholder="Chọn bảng giá có sẵn..." />
          </SelectTrigger>
          <SelectContent className="cz-admin">
            <SelectItem value="none">-- Không liên kết --</SelectItem>
            {pricingConfigs.map(c => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}{c.basePrice ? ` (${vnd(c.basePrice)})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {/* Thumbnail + Gallery */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className="text-sm font-bold">
            Ảnh đại diện
            <span className="text-xs text-[var(--c-muted)] font-normal ml-2">Thumbnail card</span>
          </Label>
          <ImageUpload
            value={value.thumbnailUrl}
            onChange={(url) => set("thumbnailUrl", url)}
            onRemove={() => set("thumbnailUrl", "")}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-bold">
            Ảnh gallery
            <span className="text-xs text-[var(--c-muted)] font-normal ml-2">Nhiều ảnh trang chi tiết</span>
          </Label>
          <MultipleImageUpload
            value={(value.galleryUrls ?? []).filter(Boolean)}
            onChange={(urls) => set("galleryUrls", urls ?? [])}
          />
        </div>
      </div>

      {/* Tasks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TaskTagInput
          value={value.includedTasks}
          onChange={(v) => set("includedTasks", v)}
          placeholder="VD: Lau sàn, quét nhà, lau bếp..."
          variant="included"
        />
        <TaskTagInput
          value={value.excludedTasks}
          onChange={(v) => set("excludedTasks", v)}
          placeholder="VD: Không giặt thảm, không leo cao..."
          variant="excluded"
        />
      </div>

      {/* Active toggle */}
      <div className="flex items-center gap-3 p-3 bg-[var(--c-card-2)] rounded-xl border border-[var(--c-line)]/40">
        <Switch checked={value.isActive} onCheckedChange={(v) => set("isActive", v)} />
        <span className={cn("text-sm font-semibold", value.isActive ? "text-[#0E9F6E]" : "text-[var(--c-muted)]")}>
          {value.isActive ? "Kích hoạt ngay sau khi tạo" : "Lưu nháp"}
        </span>
      </div>
    </div>
  );
}

// ─── StepIndicator ────────────────────────────────────────────────────────────

function StepIndicator({ current, onStepClick }: { current: number; onStepClick: (id: number) => void }) {
  return (
    <div className="flex items-center gap-0 flex-wrap">
      {STEPS.map((step, idx) => {
        const isCompleted = step.id < current;
        const isCurrent = step.id === current;
        return (
          <React.Fragment key={step.id}>
            <button
              type="button"
              onClick={() => onStepClick(step.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl transition-all",
                isCurrent
                  ? "bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)] cursor-default"
                  : isCompleted
                    ? "text-[#0E9F6E] hover:bg-[rgba(14,159,110,0.12)] dark:hover:bg-[rgba(14,159,110,0.12)] cursor-pointer"
                    : "text-[var(--c-muted)] hover:bg-[var(--c-card-2)] cursor-pointer",
              )}
            >
              {isCompleted
                ? <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                : <step.icon className="w-4 h-4" aria-hidden="true" />}
              <span className={cn("text-xs font-bold hidden sm:block", isCurrent ? "text-[var(--c-primary-strong)]" : "")}>
                {step.label}
              </span>
            </button>
            {idx < STEPS.length - 1 && (
              <ChevronRight className="w-3 h-3 text-[var(--c-muted)] shrink-0" aria-hidden="true" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-2.5 px-4 border-b border-[var(--c-line)]/30 last:border-0">
      <span className="text-sm text-[var(--c-muted)]">{label}</span>
      <span className="text-sm font-semibold text-[var(--c-ink)] text-right">{value || "—"}</span>
    </div>
  );
}

// ─── SurchargeField ───────────────────────────────────────────────────────────

function SurchargeField({ icon: Icon, label, hint, value, onChange, suffix = "VND", iconColor = "text-[var(--c-primary-strong)]" }: {
  icon: React.ElementType; label: string; hint: string;
  value: number; onChange: (v: number) => void; suffix?: string; iconColor?: string;
}) {
  return (
    <div className="flex flex-col gap-2 bg-[var(--c-card-2)] border border-[var(--c-line)]/40 rounded-xl p-4">
      <div className="flex items-center gap-2">
        <Icon className={cn("w-4 h-4 shrink-0", iconColor)} aria-hidden="true" />
        <span className="text-sm font-bold text-[var(--c-ink)]">{label}</span>
      </div>
      <p className="text-xs text-[var(--c-muted)]">{hint}</p>
      <div className="flex items-center gap-2 mt-1">
        <Input
          inputMode="numeric"
          value={value === 0 ? "" : String(value)}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, "");
            onChange(d ? Number(d) : 0);
          }}
          className="h-9 rounded-xl text-sm flex-1" />
        <span className="text-xs text-[var(--c-muted)] font-semibold shrink-0">{suffix}</span>
      </div>
      {value > 0 && <p className="text-xs font-bold text-[var(--c-primary-strong)]">{vnd(value)}</p>}
    </div>
  );
}

// ─── Main wizard ───────────────────────────────────────────────────────────────

export default function CreatePackagePage() {
  const router = useRouter();
  const createPackage = useCreateAdminPackage();
  const createService = useCreateAdminService();
  const addSubServices = useAddSubServicesToPackage();

  const { data: servicesData } = useAdminServices({ limit: 100 });
  const { data: pricingData } = usePricingConfigs({ limit: 100 });
  const allSubServices = servicesData?.items ?? [];
  const pricingConfigs = pricingData?.items ?? [];

  const [step, setStep] = useState(1);

  // ── STEP 1 ──
  const [name, setName] = useState("");
  const [packageCode, setPackageCode] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [policyDescription, setPolicyDescription] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);

  // ── STEP 2 ──
  const [maxHours, setMaxHours] = useState(4);
  const [peakRatePercent, setPeakRatePercent] = useState(20);
  const [nightSurcharge, setNightSurcharge] = useState(30000);
  const [petSurcharge, setPetSurcharge] = useState(50000);
  const [waitingSurcharge, setWaitingSurcharge] = useState(15000);
  const [toolFee, setToolFee] = useState(0);
  const [customSurcharges, setCustomSurcharges] = useState<CustomSurcharge[]>([]);
  const [newSurchargeOpen, setNewSurchargeOpen] = useState(false);

  const addCustomSurcharge = () => {
    setCustomSurcharges(prev => [...prev, {
      id: crypto.randomUUID(),
      label: "", emoji: "💡", amount: 0, hint: "",
    }]);
    setNewSurchargeOpen(false);
  };

  const updateCustomSurcharge = (id: string, v: CustomSurcharge) =>
    setCustomSurcharges(prev => prev.map(s => s.id === id ? v : s));

  const removeCustomSurcharge = (id: string) =>
    setCustomSurcharges(prev => prev.filter(s => s.id !== id));

  // ── STEP 3 ──
  const [searchSvc, setSearchSvc] = useState("");
  const [selectedSubServices, setSelectedSubServices] = useState<SelectedSubService[]>([]);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickCreate, setQuickCreate] = useState<QuickCreateSubService>(defaultQuickCreate);

  // ── STEP 4 ──
  const [termsAndConditions, setTermsAndConditions] = useState("");

  // ── Derived ──
  const canProceedStep1 = name.trim().length >= 2 && packageCode.trim().length >= 3;

  const filteredSvcs = useMemo(() =>
    allSubServices.filter(s =>
      s.name.toLowerCase().includes(searchSvc.toLowerCase()) ||
      s.subServiceCode?.toLowerCase().includes(searchSvc.toLowerCase())
    ),
    [allSubServices, searchSvc]
  );

  const handleNameChange = (v: string) => {
    setName(v);
    if (v) setPackageCode(slugify(v));
  };

  const toggleSelect = (svc: AdminServiceEntity) => {
    const exists = selectedSubServices.find(s => s.id === svc.id);
    if (exists) {
      setSelectedSubServices(prev => prev.filter(s => s.id !== svc.id));
    } else {
      setSelectedSubServices(prev => [...prev, {
        id: svc.id, name: svc.name,
        isRequired: false, isDefault: true, sortOrder: prev.length,
      }]);
    }
  };

  const updateSelected = (id: string, patch: Partial<SelectedSubService>) =>
    setSelectedSubServices(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));

  const removeSelected = (id: string) =>
    setSelectedSubServices(prev => prev.filter(s => s.id !== id));

  // ── Submit ──
  const handleSubmit = async () => {
    if (!name.trim() || !packageCode.trim()) {
      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc!");
      return;
    }
    try {
      const payload: CreateAdminPackageDto = {
        name: name.trim(),
        packageCode: packageCode.trim().toUpperCase(),
        iconUrl: iconUrl || undefined,
        sortOrder, isActive, maxHours,
        nightSurcharge, petSurcharge, waitingSurcharge, toolFee, peakRatePercent,
        termsAndConditions: termsAndConditions.trim() || undefined,
        policyDescription: policyDescription.trim() || undefined,
      };
      const pkg = await createPackage.mutateAsync(payload);

      let newSvcId: string | null = null;
      if (quickCreate.name.trim()) {
        const newSvc = await createService.mutateAsync({
          name: quickCreate.name.trim(),
          shortDescription: quickCreate.shortDescription || undefined,
          description: quickCreate.description || undefined,
          durationHours: quickCreate.durationHours ? Number(quickCreate.durationHours) : undefined,
          coverageArea: quickCreate.coverageArea || undefined,
          pricingConfigId: quickCreate.pricingConfigId && quickCreate.pricingConfigId !== "none"
            ? quickCreate.pricingConfigId : undefined,
          pricingType: quickCreate.pricingType || undefined,
          thumbnailUrl: quickCreate.thumbnailUrl || undefined,
          galleryUrls: (quickCreate.galleryUrls ?? []).length ? quickCreate.galleryUrls : undefined,
          includedTasks: quickCreate.includedTasks.length ? quickCreate.includedTasks : undefined,
          excludedTasks: quickCreate.excludedTasks.length ? quickCreate.excludedTasks : undefined,
          isActive: quickCreate.isActive,
        });
        newSvcId = newSvc.id;
      }

      const allToLink = [
        ...selectedSubServices,
        ...(newSvcId ? [{ id: newSvcId, name: quickCreate.name, isRequired: false, isDefault: true, sortOrder: selectedSubServices.length }] : []),
      ];
      if (allToLink.length > 0) {
        await addSubServices.mutateAsync({
          packageId: pkg.id,
          subServices: allToLink.map(s => ({
            id: s.id, isRequired: s.isRequired, isDefault: s.isDefault, sortOrder: s.sortOrder,
          })),
        });
      }
      router.push(`/admin/services/${pkg.id}`);
    } catch {
      // handled by mutations
    }
  };

  const isSubmitting = createPackage.isPending || createService.isPending || addSubServices.isPending;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto pb-24">

      {/* Header */}
      <div className="flex items-center gap-4">
        <BaseButton variant="outline" size="icon"
          onClick={() => router.push("/admin/services")}
          className="rounded-full h-10 w-10 shrink-0">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        </BaseButton>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[var(--c-muted)] font-medium">Quản lý Gói Dịch vụ</p>
          <h1 className="text-2xl font-black text-[var(--c-ink)] leading-tight">Tạo gói dịch vụ mới</h1>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="bg-[var(--c-card)] border border-[var(--c-line)]/50 rounded-2xl px-4 py-3 flex items-center justify-between flex-wrap gap-2">
        <StepIndicator current={step} onStepClick={setStep} />
        <span className="text-xs text-[var(--c-muted)] font-semibold">Bước {step} / {STEPS.length}</span>
      </div>

      {/* ═══════════ STEP 1: Thông tin cơ bản ═══════════ */}
      {step === 1 && (
        <div className="space-y-5">
          <SectionCard icon={Package} title="Thông tin cơ bản" description="Tên, mã code và hình ảnh đại diện của gói">
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Tên gói dịch vụ" required hint="VD: Dọn dẹp nhà cửa, Tổng vệ sinh...">
                  <Input placeholder="Dọn dẹp nhà cửa" value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="h-11 rounded-xl" />
                </Field>
                <Field label="Mã gói (Package Code)" required hint="Tự động tạo, có thể chỉnh sửa">
                  <Input placeholder="PKG-DON-DEP-NHA" value={packageCode}
                    onChange={(e) => setPackageCode(e.target.value.toUpperCase())}
                    className="h-11 rounded-xl font-mono" />
                </Field>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold">
                  Ảnh đại diện gói
                  <span className="text-xs text-[var(--c-muted)] font-normal ml-2">Thumbnail hiển thị trên card</span>
                </Label>
                <ImageUpload value={iconUrl} onChange={setIconUrl} onRemove={() => setIconUrl("")} />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold">
                  Ảnh gallery phụ
                  <span className="text-xs text-[var(--c-muted)] font-normal ml-2">Nhiều ảnh cho trang chi tiết</span>
                </Label>
                <MultipleImageUpload value={galleryUrls.filter(Boolean)} onChange={setGalleryUrls} />
              </div>

              <Field label="Mô tả chính sách" hint="Mô tả ngắn hiển thị trong thẻ gói dịch vụ">
                <Textarea placeholder="Gói dọn dẹp nhà cửa chuyên nghiệp, phù hợp cho căn hộ dưới 80m²..."
                  value={policyDescription} onChange={(e) => setPolicyDescription(e.target.value)}
                  rows={3} className="rounded-xl text-sm resize-none" />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Thứ tự hiển thị" hint="Số nhỏ hơn = hiển thị trước">
                  <Input
                    inputMode="numeric"
                    value={sortOrder === 0 ? "" : String(sortOrder)}
                    onChange={(e) => {
                      const d = e.target.value.replace(/\D/g, "");
                      setSortOrder(d ? Number(d) : 0);
                    }}
                    className="h-11 rounded-xl" />
                </Field>
                <Field label="Trạng thái khi tạo">
                  <div className="flex items-center gap-3 h-11">
                    <Switch checked={isActive} onCheckedChange={setIsActive} />
                    <span className={cn("text-sm font-semibold", isActive ? "text-[#0E9F6E]" : "text-[var(--c-muted)]")}>
                      {isActive ? "Kích hoạt ngay" : "Lưu nháp"}
                    </span>
                  </div>
                </Field>
              </div>
            </div>
          </SectionCard>

          <div className="flex justify-end">
            <BaseButton variant="primary" disabled={!canProceedStep1} onClick={() => setStep(2)}
              className="h-11 px-8 rounded-xl font-bold gap-2">
              Tiếp theo — Cấu hình giá <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </BaseButton>
          </div>
        </div>
      )}

      {/* ═══════════ STEP 2: Cấu hình giá ═══════════ */}
      {step === 2 && (
        <div className="space-y-5">
          <SectionCard icon={Clock} title="Cấu hình thời gian & Giờ cao điểm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Số giờ tối đa" required hint="Thời lượng tối đa cho một đơn hàng">
                <div className="flex items-center gap-3">
                  <Input
                    inputMode="decimal"
                    value={String(maxHours)}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (/^\d*\.?\d*$/.test(v)) {
                        const n = parseFloat(v);
                        setMaxHours(isNaN(n) ? 1 : Math.min(24, Math.max(1, n)));
                      }
                    }}
                    className="h-11 rounded-xl flex-1" />
                  <span className="text-sm text-[var(--c-muted)] font-semibold">giờ</span>
                </div>
              </Field>
              <Field label="% Phụ phí giờ cao điểm" required hint="Tỷ lệ phần trăm tăng thêm so với giá gốc">
                <div className="flex items-center gap-3">
                  <Input
                    inputMode="numeric"
                    value={peakRatePercent === 0 ? "" : String(peakRatePercent)}
                    onChange={(e) => {
                      const d = e.target.value.replace(/\D/g, "");
                      setPeakRatePercent(d ? Math.min(200, Number(d)) : 0);
                    }}
                    className="h-11 rounded-xl flex-1" />
                  <span className="text-sm text-[var(--c-muted)] font-semibold">%</span>
                </div>
                {peakRatePercent > 0 && (
                  <p className="text-xs text-[#D97706] font-semibold mt-1">
                    → Giá 100.000đ + {peakRatePercent}% = {vnd(100000 * (1 + peakRatePercent / 100))}
                  </p>
                )}
              </Field>
            </div>
          </SectionCard>

          <SectionCard icon={DollarSign} title="Bảng phụ phí" description="Cấu hình toàn bộ phụ phí cho tất cả dịch vụ trong gói">
            <div className="space-y-4">
              {/* 4 fixed surcharges */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SurchargeField icon={Moon} label="Phụ thu Đêm / Sáng sớm"
                  hint="22:00–06:00. Tính cộng thêm vào tổng tiền."
                  value={nightSurcharge} onChange={setNightSurcharge} iconColor="text-[#2563EB]" />
                <SurchargeField icon={PawPrint} label="Phụ thu Thú cưng"
                  hint="Có chó/mèo tại địa chỉ. Gồm dọn lông, khử mùi."
                  value={petSurcharge} onChange={setPetSurcharge} iconColor="text-[#D97706]" />
                <SurchargeField icon={Timer} label="Phụ thu Chờ đợi (mỗi 15p)"
                  hint="Tính thêm khi nhân viên phải chờ vào cửa, thang máy..."
                  value={waitingSurcharge} onChange={setWaitingSurcharge} iconColor="text-[#E11D48]" />
                <SurchargeField icon={Hammer} label="Phí Công cụ mang theo"
                  hint="Đơn yêu cầu máy hút bụi, máy phun khử khuẩn chuyên biệt."
                  value={toolFee} onChange={setToolFee} iconColor="text-[var(--c-muted)]" />
              </div>

              {/* Custom surcharges */}
              {customSurcharges.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-[var(--c-muted)] uppercase tracking-wider">Phụ phí tuỳ chỉnh</p>
                  {customSurcharges.map(cs => (
                    <CustomSurchargeRow
                      key={cs.id}
                      item={cs}
                      onChange={(v) => updateCustomSurcharge(cs.id, v)}
                      onRemove={() => removeCustomSurcharge(cs.id)}
                    />
                  ))}
                </div>
              )}

              {/* Add custom button */}
              <button
                type="button"
                onClick={addCustomSurcharge}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-[var(--c-line)]/40 rounded-xl hover:border-[var(--c-primary)]/40 hover:bg-[var(--c-primary-soft)] transition-all text-[var(--c-muted)] hover:text-[var(--c-primary-strong)] text-sm font-semibold"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                Thêm loại phụ phí tùy chỉnh
              </button>

              {/* Preview bar */}
              <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3 bg-[var(--c-primary-soft)] border border-[var(--c-primary)]/20 rounded-xl p-4">
                {[
                  { label: "Cao điểm", value: `+${peakRatePercent}%`, icon: TrendingUp, color: "text-[#D97706]" },
                  { label: "Ban đêm", value: vnd(nightSurcharge), icon: Moon, color: "text-[#2563EB]" },
                  { label: "Thú cưng", value: vnd(petSurcharge), icon: PawPrint, color: "text-[#D97706]" },
                  { label: "Chờ 15p", value: vnd(waitingSurcharge), icon: Timer, color: "text-[#E11D48]" },
                  ...customSurcharges.filter(cs => cs.label && cs.amount > 0).map(cs => ({
                    label: cs.label, value: vnd(cs.amount), icon: Star, color: "text-[#7C3AED]",
                  })),
                ].map(item => (
                  <div key={item.label} className="text-center">
                    <item.icon className={cn("w-4 h-4 mx-auto mb-1", item.color)} aria-hidden="true" />
                    <p className={cn("text-sm font-black", item.color)}>{item.value}</p>
                    <p className="text-[10px] text-[var(--c-muted)]">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>

          <div className="flex justify-between">
            <BaseButton variant="outline" onClick={() => setStep(1)} className="h-11 px-6 rounded-xl font-bold">← Quay lại</BaseButton>
            <BaseButton variant="primary" onClick={() => setStep(3)} className="h-11 px-8 rounded-xl font-bold gap-2">
              Tiếp theo — Dịch vụ con <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </BaseButton>
          </div>
        </div>
      )}

      {/* ═══════════ STEP 3: Dịch vụ con ═══════════ */}
      {step === 3 && (
        <div className="space-y-5">
          {/* Browse & Select */}
          <SectionCard icon={List} title="Chọn dịch vụ con ăn theo"
            description={`Chọn từ ${allSubServices.length} dịch vụ con hiện có · Đã chọn: ${selectedSubServices.length}`}>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--c-muted)]" aria-hidden="true" />
                <Input
                  placeholder="Tìm kiếm dịch vụ con..."
                  value={searchSvc}
                  onChange={(e) => setSearchSvc(e.target.value)}
                  className="h-10 rounded-xl pl-9 text-sm"
                />
              </div>

              {filteredSvcs.length === 0 ? (
                <div className="py-10 text-center text-[var(--c-muted)] text-sm">
                  <Package className="w-8 h-8 mx-auto mb-3 opacity-30" aria-hidden="true" />
                  Không tìm thấy dịch vụ con nào
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                  {filteredSvcs.map(svc => (
                    <SubServiceCard
                      key={svc.id}
                      svc={svc}
                      isSelected={!!selectedSubServices.find(s => s.id === svc.id)}
                      onToggle={() => toggleSelect(svc)}
                    />
                  ))}
                </div>
              )}
            </div>
          </SectionCard>

          {/* Selected sub-services config */}
          {selectedSubServices.length > 0 && (
            <SectionCard icon={Settings2} title="Cấu hình dịch vụ đã chọn"
              description="Thiết lập vai trò cho từng dịch vụ con trong gói">
              <div className="space-y-3">
                {selectedSubServices.map((s, idx) => (
                  <div key={s.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border border-[var(--c-line)]/40 rounded-xl bg-[var(--c-card-2)]">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-[var(--c-ink)]">{s.name}</p>
                      <p className="text-xs text-[var(--c-muted)]">Vị trí #{idx + 1}</p>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Switch checked={s.isRequired} onCheckedChange={(v) => updateSelected(s.id, { isRequired: v })} />
                        <span className="text-xs font-semibold text-[var(--c-ink)]">Bắt buộc</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Switch checked={s.isDefault} onCheckedChange={(v) => updateSelected(s.id, { isDefault: v })} />
                        <span className="text-xs font-semibold text-[var(--c-ink)]">Mặc định</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => removeSelected(s.id)}
                        className="p-1.5 rounded-lg hover:bg-[rgba(225,29,72,0.12)] text-[var(--c-muted)] hover:text-[#E11D48] transition-colors"
                      >
                        <X className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Quick Create */}
          <SectionCard icon={Plus} title="Tạo nhanh dịch vụ con mới"
            description="Tạo và gắn ngay một dịch vụ con mới vào gói này">
            {!showQuickCreate ? (
              <button
                type="button"
                onClick={() => setShowQuickCreate(true)}
                className="w-full flex items-center justify-center gap-3 py-8 border-2 border-dashed border-[var(--c-line)]/40 rounded-xl hover:border-[var(--c-primary)]/40 hover:bg-[var(--c-primary-soft)] transition-all text-[var(--c-muted)] hover:text-[var(--c-primary-strong)]"
              >
                <Plus className="w-5 h-5" aria-hidden="true" />
                <span className="font-semibold">Thêm dịch vụ con mới</span>
              </button>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-bold text-[var(--c-ink)]">Điền thông tin dịch vụ con</p>
                  <button
                    type="button"
                    onClick={() => { setShowQuickCreate(false); setQuickCreate(defaultQuickCreate); }}
                    className="p-1.5 rounded-lg hover:bg-[var(--c-card-2)] text-[var(--c-muted)] hover:text-[var(--c-ink)] transition-colors"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
                <QuickCreateForm
                  value={quickCreate}
                  onChange={setQuickCreate}
                  pricingConfigs={pricingConfigs.map(c => ({
                    id: c.id,
                    name: c.name,
                    basePrice: c.basePrice ? Number(c.basePrice) : undefined,
                  }))}
                />
                <div className="flex items-start gap-3 p-3 bg-[rgba(37,99,235,0.12)] dark:bg-[rgba(37,99,235,0.12)] border border-[#2563EB]/60 rounded-xl">
                  <Info className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-xs text-[#2563EB] dark:text-[#2563EB]">
                    Dịch vụ này sẽ được tạo và tự động liên kết vào gói sau khi bấm <strong>Tạo gói dịch vụ</strong>.
                  </p>
                </div>
              </div>
            )}
          </SectionCard>

          <div className="flex justify-between">
            <BaseButton variant="outline" onClick={() => setStep(2)} className="h-11 px-6 rounded-xl font-bold">← Quay lại</BaseButton>
            <BaseButton variant="primary" onClick={() => setStep(4)} className="h-11 px-8 rounded-xl font-bold gap-2">
              Tiếp theo — Điều khoản <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </BaseButton>
          </div>
        </div>
      )}

      {/* ═══════════ STEP 4: Điều khoản ═══════════ */}
      {step === 4 && (
        <div className="space-y-5">
          <SectionCard icon={ScrollText} title="Điều khoản & Quy định"
            description="Hiển thị cho khách hàng trước khi đặt dịch vụ">
            <div className="space-y-4">
              <Field label="Điều khoản sử dụng" hint="Mỗi dòng = 1 điều khoản">
                <Textarea
                  placeholder={"1. Khách hàng cần có mặt hoặc người đại diện.\n2. Không áp dụng cho không gian hơn 100m².\n3. Vui lòng cất đồ vật giá trị trước khi nhân viên đến.\n4. Thú cưng phải nhốt trong phòng riêng.\n5. Nhân viên có quyền từ chối nếu môi trường mất an toàn."}
                  value={termsAndConditions}
                  onChange={(e) => setTermsAndConditions(e.target.value)}
                  rows={10}
                  className="rounded-xl text-sm resize-none font-mono"
                />
              </Field>
              {termsAndConditions && (
                <div className="bg-[var(--c-card-2)] border border-[var(--c-line)]/40 rounded-xl p-4">
                  <p className="text-xs font-black text-[var(--c-muted)] uppercase tracking-widest mb-3">Xem trước</p>
                  <div className="space-y-1.5">
                    {termsAndConditions.split("\n").filter(Boolean).map((line, i) => (
                      <p key={i} className="text-sm">{line}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          <div className="flex items-start gap-3 p-4 bg-[rgba(217,119,6,0.14)] dark:bg-[rgba(217,119,6,0.14)] border border-[#D97706]/60 rounded-2xl">
            <Info className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-sm text-[#D97706] dark:text-[#D97706]">
              Điều khoản có thể để trống và cập nhật sau trong tab <strong>Điều khoản</strong>.
            </p>
          </div>

          <div className="flex justify-between">
            <BaseButton variant="outline" onClick={() => setStep(3)} className="h-11 px-6 rounded-xl font-bold">← Quay lại</BaseButton>
            <BaseButton variant="primary" onClick={() => setStep(5)} className="h-11 px-8 rounded-xl font-bold gap-2">
              Xem lại & Hoàn tất <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </BaseButton>
          </div>
        </div>
      )}

      {/* ═══════════ STEP 5: Xem lại ═══════════ */}
      {step === 5 && (
        <div className="space-y-5">
          <SectionCard icon={Package} title="Xem lại — Thông tin gói">
            <div className="divide-y divide-[var(--c-line)]/30">
              <ReviewRow label="Tên gói" value={name} />
              <ReviewRow label="Mã gói" value={<code className="text-[var(--c-primary-strong)] text-xs bg-[var(--c-primary-soft)] px-2 py-0.5 rounded font-mono">{packageCode}</code>} />
              <ReviewRow label="Trạng thái" value={
                <Badge className={isActive ? "bg-[rgba(14,159,110,0.12)] text-[#0E9F6E]" : "bg-[var(--c-card-2)] text-[var(--c-muted)]"}>
                  {isActive ? "Kích hoạt ngay" : "Lưu nháp"}
                </Badge>
              } />
              {policyDescription && <ReviewRow label="Mô tả" value={policyDescription} />}
              {iconUrl && <ReviewRow label="Ảnh đại diện" value="✓ Đã thêm" />}
            </div>
          </SectionCard>

          <SectionCard icon={DollarSign} title="Xem lại — Cấu hình giá & Phụ phí">
            <div className="divide-y divide-[var(--c-line)]/30">
              <ReviewRow label="Giờ tối đa" value={`${maxHours} giờ`} />
              <ReviewRow label="Giờ cao điểm" value={`+${peakRatePercent}%`} />
              <ReviewRow label="Phụ thu ban đêm" value={vnd(nightSurcharge)} />
              <ReviewRow label="Phụ thu thú cưng" value={vnd(petSurcharge)} />
              <ReviewRow label="Phụ thu chờ đợi (15p)" value={vnd(waitingSurcharge)} />
              <ReviewRow label="Phí công cụ" value={toolFee > 0 ? vnd(toolFee) : "Miễn phí"} />
              {customSurcharges.filter(cs => cs.label).map(cs => (
                <ReviewRow key={cs.id} label={`${cs.emoji} ${cs.label}`} value={vnd(cs.amount)} />
              ))}
            </div>
          </SectionCard>

          {(selectedSubServices.length > 0 || quickCreate.name.trim()) && (
            <SectionCard icon={Wrench} title="Xem lại — Dịch vụ con">
              <div className="divide-y divide-[var(--c-line)]/30">
                {selectedSubServices.map(s => (
                  <ReviewRow key={s.id} label={s.name} value={
                    <div className="flex gap-1">
                      {s.isRequired && <Badge className="text-[9px] bg-[rgba(225,29,72,0.12)] text-[#E11D48]">Bắt buộc</Badge>}
                      {s.isDefault && <Badge className="text-[9px] bg-[rgba(37,99,235,0.12)] text-[#2563EB]">Mặc định</Badge>}
                    </div>
                  } />
                ))}
                {quickCreate.name.trim() && (
                  <ReviewRow label={`🆕 ${quickCreate.name}`} value={
                    <Badge className="text-[9px] bg-[rgba(14,159,110,0.12)] text-[#0E9F6E]">Sẽ tạo mới</Badge>
                  } />
                )}
              </div>
            </SectionCard>
          )}

          {termsAndConditions && (
            <SectionCard icon={ScrollText} title="Xem lại — Điều khoản">
              <div className="text-sm text-[var(--c-muted)] space-y-1">
                {termsAndConditions.split("\n").slice(0, 3).filter(Boolean).map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
                {termsAndConditions.split("\n").filter(Boolean).length > 3 && (
                  <p className="text-[var(--c-primary-strong)] font-semibold">
                    +{termsAndConditions.split("\n").filter(Boolean).length - 3} điều khoản khác...
                  </p>
                )}
              </div>
            </SectionCard>
          )}

          <div className="flex justify-between gap-3">
            <BaseButton variant="outline" onClick={() => setStep(4)} className="h-11 px-6 rounded-xl font-bold">← Quay lại</BaseButton>
            <BaseButton variant="primary" onClick={handleSubmit} disabled={isSubmitting}
              className="h-11 px-8 rounded-xl font-bold gap-2 flex-1 md:flex-none">
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />Đang tạo...</>
              ) : (
                <><CheckCircle2 className="w-4 h-4" aria-hidden="true" />Tạo gói dịch vụ</>
              )}
            </BaseButton>
          </div>
        </div>
      )}
    </div>
  );
}
