import React, { useState } from "react";
import Image from "next/image";
import {
  Image as ImageIcon, Check, X, CheckCircle2, XCircle, Clock,
  MapPin, Edit3, Save, X as XIcon, Plus, Trash2,
} from "lucide-react";
import { AdminServicePackageEntity } from "@/features/admin/modules/service/services/admin-services.service";
import { useUpdateAdminPackage } from "@/features/admin/modules/service/hooks/useAdminServices";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BaseButton } from "@/components/ui/base/base_button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface PackageOverviewTabProps {
  pkg: AdminServicePackageEntity;
}

export function PackageOverviewTab({ pkg }: PackageOverviewTabProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [name, setName] = useState(pkg.name);
  const [description, setDescription] = useState(pkg.policyDescription ?? "");
  const [iconUrl, setIconUrl] = useState(pkg.iconUrl ?? "");
  const [galleryInput, setGalleryInput] = useState("");
  const [galleryUrls, setGalleryUrls] = useState<string[]>(pkg.galleryUrls || []);
  const [maxHours, setMaxHours] = useState(pkg.maxHours);
  const [sortOrder, setSortOrder] = useState(pkg.sortOrder);

  const updateMutation = useUpdateAdminPackage();

  const handleSave = () => {
    updateMutation.mutate(
      { id: pkg.id, payload: { name, policyDescription: description, iconUrl, galleryUrls: galleryUrls.filter(Boolean), maxHours, sortOrder } },
      {
        onSuccess: () => {
          toast.success("Đã lưu thông tin gói dịch vụ!");
          setIsEditing(false);
        },
      }
    );
  };

  const handleCancel = () => {
    setName(pkg.name);
    setDescription(pkg.policyDescription ?? "");
    setIconUrl(pkg.iconUrl ?? "");
    setGalleryUrls(pkg.galleryUrls || []);
    setMaxHours(pkg.maxHours);
    setSortOrder(pkg.sortOrder);
    setIsEditing(false);
  };

  const addGallery = () => {
    if (!galleryInput.trim()) return;
    setGalleryUrls((prev) => [...prev, galleryInput.trim()]);
    setGalleryInput("");
  };

  const removeGallery = (idx: number) => {
    setGalleryUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  const allGallery = [
    ...(pkg.packageSubServices?.flatMap((pss) => pss.subService?.galleryUrls ?? []) ?? []),
    ...galleryUrls,
  ];

  return (
    <div className="space-y-8">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-foreground">Thông tin tổng quan</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Hình ảnh, mô tả và các thông số cơ bản của gói</p>
        </div>
        <BaseButton variant="outline" size="sm" onClick={() => router.push(`/admin/services/${pkg.id}/edit`)} className="gap-2 rounded-xl">
          <Edit3 className="w-4 h-4" aria-hidden="true" />
          Chỉnh sửa
        </BaseButton>
      </div>

      {/* Main info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Thumbnail */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">Ảnh đại diện</p>
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted/40 border-2 border-dashed border-border group">
            {iconUrl ? (
              <Image src={iconUrl} alt={pkg.name} fill className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center flex-col gap-2">
                <ImageIcon className="w-10 h-10 text-muted-foreground/30" aria-hidden="true" />
                <span className="text-xs text-muted-foreground">Chưa có ảnh</span>
              </div>
            )}
          </div>
          {isEditing && (
            <Input
              value={iconUrl}
              onChange={(e) => setIconUrl(e.target.value)}
              placeholder="Nhập URL ảnh đại diện..."
              className="text-xs rounded-xl"
            />
          )}
        </div>

        {/* Basic fields */}
        <div className="md:col-span-2 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Tên gói dịch vụ</label>
            {isEditing ? (
              <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl h-11" />
            ) : (
              <p className="text-base font-medium text-foreground bg-muted/20 px-4 py-3 rounded-xl border border-border/40">{pkg.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Mô tả / Chính sách</label>
            {isEditing ? (
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="rounded-xl resize-none"
                placeholder="Mô tả dịch vụ, chính sách áp dụng..."
              />
            ) : (
              <div className="space-y-2">
                <p className={`text-sm text-muted-foreground bg-muted/20 px-4 py-3 rounded-xl border border-border/40 min-h-[80px] whitespace-pre-wrap leading-relaxed transition-all duration-300 ${
                  descExpanded ? "" : "line-clamp-5"
                }`}>
                  {pkg.policyDescription || "Chưa có mô tả."}
                </p>
                {pkg.policyDescription && pkg.policyDescription.length > 150 && (
                  <button
                    type="button"
                    onClick={() => setDescExpanded(!descExpanded)}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1 mt-1"
                  >
                    {descExpanded ? "Thu gọn" : "Xem thêm..."}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Thời gian tối đa (giờ)</label>
              {isEditing ? (
                <Input type="number" min={1} max={24} value={maxHours} onChange={(e) => setMaxHours(+e.target.value)} className="rounded-xl h-11" />
              ) : (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-muted/20 border border-border/40">
                  <Clock className="w-4 h-4 text-primary" aria-hidden="true" />
                  <span className="font-semibold">{pkg.maxHours} giờ</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Thứ tự hiển thị</label>
              {isEditing ? (
                <Input type="number" min={0} value={sortOrder} onChange={(e) => setSortOrder(+e.target.value)} className="rounded-xl h-11" />
              ) : (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-muted/20 border border-border/40">
                  <span className="font-semibold">#{pkg.sortOrder}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <hr className="border-border/50" />

      {/* Khu vực phủ sóng */}
      {pkg.coverageAreas && pkg.coverageAreas.length > 0 && (
        <div>
          <h4 className="text-base font-bold text-foreground flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-primary" aria-hidden="true" />
            Khu vực phủ sóng ({pkg.coverageAreas.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {pkg.coverageAreas.map((area) => (
              <span key={area.id} className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-sm font-medium border border-primary/20">
                📍 {area.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <hr className="border-border/50" />

      {/* Gallery */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-base font-bold text-foreground flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" aria-hidden="true" />
            Thư viện ảnh
          </h4>
          {isEditing && (
            <div className="flex gap-2 w-full max-w-md">
              <Input
                value={galleryInput}
                onChange={(e) => setGalleryInput(e.target.value)}
                placeholder="Nhập URL ảnh..."
                className="rounded-xl text-xs h-9"
                onKeyDown={(e) => e.key === "Enter" && addGallery()}
              />
              <BaseButton variant="outline" size="sm" onClick={addGallery} className="rounded-xl gap-1 shrink-0">
                <Plus className="w-4 h-4" aria-hidden="true" />
                Thêm
              </BaseButton>
            </div>
          )}
        </div>

        {allGallery.length === 0 ? (
          <div className="flex items-center justify-center h-32 border border-dashed border-border rounded-2xl bg-muted/10">
            <p className="text-sm text-muted-foreground">Chưa có ảnh trong thư viện</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
            {allGallery.map((url, idx) => (
              <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-border/50 group shadow-sm">
                <Image src={url} alt={`Gallery ${idx + 1}`} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                {isEditing && galleryUrls.includes(url) && (
                  <button
                    onClick={() => removeGallery(galleryUrls.indexOf(url))}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" aria-hidden="true" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <hr className="border-border/50" />

      {/* Sub-services included/excluded tasks */}
      {pkg.packageSubServices && pkg.packageSubServices.length > 0 && (
        <div>
          <h4 className="text-base font-bold text-foreground mb-4">Tổng hợp công việc trong gói</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h5 className="text-sm font-semibold text-primary flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                Công việc bao gồm
              </h5>
              <ul className="space-y-2">
                {pkg.packageSubServices
                  .flatMap((pss) => pss.subService?.includedTasks ?? [])
                  .filter(Boolean)
                  .map((task, i) => (
                    <li key={i} className="flex items-start gap-2 p-2.5 rounded-xl bg-primary/5 border border-primary/10 text-sm">
                      <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{task}</span>
                    </li>
                  ))}
                {pkg.packageSubServices.flatMap((pss) => pss.subService?.includedTasks ?? []).filter(Boolean).length === 0 && (
                  <li className="text-sm text-muted-foreground italic p-4 bg-muted/20 rounded-xl border border-dashed border-border text-center">Chưa có dữ liệu</li>
                )}
              </ul>
            </div>

            <div>
              <h5 className="text-sm font-semibold text-destructive flex items-center gap-2 mb-3">
                <XCircle className="w-4 h-4" aria-hidden="true" />
                Không bao gồm
              </h5>
              <ul className="space-y-2">
                {pkg.packageSubServices
                  .flatMap((pss) => pss.subService?.excludedTasks ?? [])
                  .filter(Boolean)
                  .map((task, i) => (
                    <li key={i} className="flex items-start gap-2 p-2.5 rounded-xl bg-destructive/5 border border-destructive/10 text-sm">
                      <X className="w-4 h-4 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{task}</span>
                    </li>
                  ))}
                {pkg.packageSubServices.flatMap((pss) => pss.subService?.excludedTasks ?? []).filter(Boolean).length === 0 && (
                  <li className="text-sm text-muted-foreground italic p-4 bg-muted/20 rounded-xl border border-dashed border-border text-center">Chưa có dữ liệu</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
