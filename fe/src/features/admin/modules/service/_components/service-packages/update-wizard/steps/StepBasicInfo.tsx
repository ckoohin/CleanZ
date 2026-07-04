"use client";

import { Package, ChevronRight } from "lucide-react";
import { ImageUpload } from "@/components/ui/image-upload";
import { MultipleImageUpload } from "@/components/ui/multiple-image-upload";
import { BaseButton } from "@/components/ui/base/base_button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { SectionCard } from "../shared/SectionCard";
import { Field } from "../shared/FormField";

// ─── Step 1: Thông tin cơ bản ───────────────────────────────────────────────
export function StepBasicInfo({
  name, handleNameChange, packageCode, setPackageCode, iconUrl, setIconUrl,
  galleryUrls, setGalleryUrls, policyDescription, setPolicyDescription,
  sortOrder, setSortOrder, isActive, setIsActive, canProceedStep1, setStep,
}: {
  name: string;
  handleNameChange: (v: string) => void;
  packageCode: string;
  setPackageCode: (v: string) => void;
  iconUrl: string;
  setIconUrl: (v: string) => void;
  galleryUrls: string[];
  setGalleryUrls: (v: string[]) => void;
  policyDescription: string;
  setPolicyDescription: (v: string) => void;
  sortOrder: number;
  setSortOrder: (v: number) => void;
  isActive: boolean;
  setIsActive: (v: boolean) => void;
  canProceedStep1: boolean;
  setStep: (v: number) => void;
}) {
  return (
        <div className="space-y-5">
          <SectionCard icon={Package} title="Thông tin cơ bản" description="Tên, mã code và hình ảnh đại diện của gói">
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Tên gói dịch vụ" required hint="VD: Dọn dẹp nhà cửa, Tổng vệ sinh...">
                  <Input placeholder="Dọn dẹp nhà cửa" value={name}
                    onChange={e => handleNameChange(e.target.value)} className="h-11 rounded-xl" />
                </Field>
                <Field label="Mã gói (Package Code)" required hint="Tự động tạo, có thể chỉnh sửa">
                  <Input placeholder="PKG-DON-DEP-NHA" value={packageCode}
                    onChange={e => setPackageCode(e.target.value.toUpperCase())}
                    className="h-11 rounded-xl font-mono" />
                </Field>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold">Ảnh đại diện gói<span className="text-xs text-slate-800 font-bold ml-2">Thumbnail hiển thị trên card</span></Label>
                <ImageUpload value={iconUrl} onChange={setIconUrl} onRemove={() => setIconUrl("")} />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold">Ảnh gallery phụ<span className="text-xs text-slate-800 font-bold ml-2">Nhiều ảnh cho trang chi tiết</span></Label>
                <MultipleImageUpload value={galleryUrls.filter(Boolean)} onChange={setGalleryUrls} />
              </div>

              <Field label="Mô tả chính sách" hint="Mô tả ngắn hiển thị trong thẻ gói dịch vụ">
                <Textarea placeholder="Gói dọn dẹp nhà cửa chuyên nghiệp, phù hợp cho căn hộ dưới 80m²..."
                  value={policyDescription} onChange={e => setPolicyDescription(e.target.value)}
                  rows={3} className="rounded-xl text-sm resize-none" />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Thứ tự hiển thị" hint="Số nhỏ hơn = hiển thị trước">
                  <Input inputMode="numeric" value={sortOrder === 0 ? "" : String(sortOrder)}
                    onChange={e => { const d = e.target.value.replace(/\D/g, ""); setSortOrder(d ? Number(d) : 0); }}
                    className="h-11 rounded-xl" />
                </Field>
                <Field label="Trạng thái hoạt động">
                  <div className="flex items-center gap-3 h-11">
                    <Switch checked={isActive} onCheckedChange={setIsActive} />
                    <span className={cn("text-sm font-semibold", isActive ? "text-emerald-600" : "text-muted-foreground")}>
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
              Tiếp theo — Bảng giá & Thiết lập nâng cao <ChevronRight className="w-4 h-4" />
            </BaseButton>
          </div>
        </div>
  );
}
