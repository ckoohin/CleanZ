"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Star, Clock, MapPin, Shield, Check, X, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, Layers, DollarSign, Eye, Package, Sparkles,
  Phone, MessageCircle, Heart, Share2, Award, Zap, Users, Loader2,
} from "lucide-react";
import { AdminServicePackageEntity } from "@/features/admin/modules/service/services/admin-services.service";
import { usePricingTiers } from "@/features/admin/hooks/useAdminPricing";
import { PricingTierEntity } from "@/features/admin/services/admin-pricing.service";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const vnd = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n);

// ─── Props ────────────────────────────────────────────────────────────────────

interface PackageCustomerPreviewTabProps {
  pkg: AdminServicePackageEntity;
}

// ─── Sub components ───────────────────────────────────────────────────────────

function PreviewBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("px-3 py-1 rounded-full text-xs font-bold border", className)}>
      {children}
    </span>
  );
}

function StarRating({ rating = 4.8, count = 124 }: { rating?: number; count?: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <Star key={i} className={cn("w-4 h-4", i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
        ))}
      </div>
      <span className="text-sm font-bold text-foreground">{rating}</span>
      <span className="text-sm text-muted-foreground">({count} đánh giá)</span>
    </div>
  );
}

function ReviewCard({ name, rating, date, comment, avatar }: {
  name: string; rating: number; date: string; comment: string; avatar: string;
}) {
  return (
    <div className="bg-muted/20 border border-border/40 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/40 to-primary flex items-center justify-center text-white font-bold text-sm shrink-0">
          {avatar}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">{name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="flex items-center gap-0.5">
              {[1,2,3,4,5].map(i => (
                <Star key={i} className={cn("w-3 h-3", i <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">{date}</span>
          </div>
        </div>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{comment}</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PackageCustomerPreviewTab({ pkg }: PackageCustomerPreviewTabProps) {
  const [selectedTierIdx, setSelectedTierIdx] = useState(0);
  const [termsExpanded, setTermsExpanded] = useState(false);
  const [activeImgIdx, setActiveImgIdx] = useState(0);

  const { data: pricingTiers, isLoading: tiersLoading } = usePricingTiers(pkg.id);
  const tiers = pricingTiers ?? [];
  const subServices = pkg.packageSubServices ?? [];
  const coverageAreas = pkg.coverageAreas ?? [];
  const allGallery = [
    ...(pkg.iconUrl ? [pkg.iconUrl] : []),
    ...(subServices.flatMap(pss => pss.subService?.galleryUrls ?? [])),
  ].slice(0, 8);
  const rawTerms = pkg.termsAndConditions ?? "";
  const parts = rawTerms.split(/---\s*PREMIUM\s*---/i);
  const terms = (parts[0] ?? "").split("\n").filter(Boolean);
  const premiumTerms = (parts[1] ?? "").split("\n").filter(Boolean);
  const includedTasks = subServices.flatMap(pss => pss.subService?.includedTasks ?? []).filter(Boolean);
  const excludedTasks = subServices.flatMap(pss => pss.subService?.excludedTasks ?? []).filter(Boolean);

  const selectedTier = tiers[selectedTierIdx];
  const pricingModeLabel =
    pkg.pricingMode === "HOURLY" ? "Tính theo giờ" :
    pkg.pricingMode === "AREA_HOURLY" ? "Tính theo diện tích × giờ" : "Giá cố định";

  // Mock reviews
  const MOCK_REVIEWS = [
    { name: "Nguyễn Thị Lan", rating: 5, date: "2 ngày trước", comment: "Nhân viên làm việc rất cẩn thận, nhà sạch bóng, không bỏ sót góc nào. Sẽ đặt lại!", avatar: "L" },
    { name: "Trần Văn Minh", rating: 5, date: "1 tuần trước", comment: "Giá hợp lý, đúng giờ, thái độ chuyên nghiệp. Rất hài lòng với dịch vụ.", avatar: "M" },
    { name: "Phạm Thu Hương", rating: 4, date: "2 tuần trước", comment: "Dịch vụ tốt, chỉ tiếc là đến hơi muộn 15 phút. Nhìn chung vẫn rất ổn.", avatar: "H" },
  ];

  return (
    <div className="space-y-6">
      {/* Preview banner */}
      <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60">
        <Eye className="w-5 h-5 text-amber-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-amber-700 dark:text-amber-400">Chế độ xem trước — Giao diện khách hàng</p>
          <p className="text-xs text-amber-600/80 dark:text-amber-400/70">Đây là cách gói dịch vụ hiển thị với khách hàng trên app/web. Dữ liệu thực tế từ hệ thống.</p>
        </div>
        <Badge className="bg-amber-500 text-white border-0 shrink-0 text-xs">Preview</Badge>
      </div>

      {/* ── CUSTOMER PREVIEW CARD ── */}
      <div className="bg-background border border-border rounded-3xl overflow-hidden shadow-lg">

        {/* Hero Section */}
        <div className="relative">
          {/* Main image */}
          <div className="relative h-64 md:h-80 w-full bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden">
            {allGallery[activeImgIdx] ? (
              <Image src={allGallery[activeImgIdx]} alt={pkg.name} fill className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Package className="w-24 h-24 text-muted-foreground/20" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {/* Floating badges */}
            <div className="absolute top-4 left-4 flex flex-wrap gap-2">
              {pkg.isActive ? (
                <PreviewBadge className="bg-emerald-500 text-white border-emerald-600">✓ Đang hoạt động</PreviewBadge>
              ) : (
                <PreviewBadge className="bg-gray-500 text-white border-gray-600">Tạm ngưng</PreviewBadge>
              )}
              <PreviewBadge className="bg-black/50 text-white border-white/20 backdrop-blur-sm">
                {pricingModeLabel}
              </PreviewBadge>
            </div>

            {/* Action icons top right */}
            <div className="absolute top-4 right-4 flex gap-2">
              <button className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition">
                <Heart className="w-4 h-4" />
              </button>
              <button className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition">
                <Share2 className="w-4 h-4" />
              </button>
            </div>

            {/* Title overlay */}
            <div className="absolute bottom-4 left-4 right-4">
              <h2 className="text-2xl font-black text-white leading-tight drop-shadow-lg">{pkg.name}</h2>
              <div className="flex items-center gap-3 mt-2">
                <StarRating />
                <span className="text-white/70 text-xs">•</span>
                <span className="text-white/80 text-xs font-semibold">{subServices.length} dịch vụ</span>
              </div>
            </div>
          </div>

          {/* Gallery thumbnails */}
          {allGallery.length > 1 && (
            <div className="flex gap-2 p-3 bg-muted/30 overflow-x-auto">
              {allGallery.map((url, idx) => (
                <button key={idx} onClick={() => setActiveImgIdx(idx)}
                  className={cn("relative w-16 h-12 rounded-xl overflow-hidden border-2 shrink-0 transition-all",
                    activeImgIdx === idx ? "border-primary shadow-md" : "border-transparent opacity-70 hover:opacity-100")}>
                  <Image src={url} alt={`Gallery ${idx + 1}`} fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5 md:p-7 space-y-8">

          {/* Key info row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Clock, label: "Tối đa", value: `${pkg.maxHours} giờ`, color: "text-blue-500" },
              { icon: Users, label: "Taskers", value: "200+", color: "text-violet-500" },
              { icon: Award, label: "Đảm bảo", value: "100%", color: "text-emerald-500" },
              { icon: Zap, label: "Phản hồi", value: "< 5 phút", color: "text-amber-500" },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="flex flex-col items-center gap-1.5 p-3.5 rounded-2xl bg-muted/30 border border-border/40 text-center">
                <Icon className={cn("w-5 h-5", color)} />
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className="text-sm font-black">{value}</span>
              </div>
            ))}
          </div>

          {/* Description */}
          {pkg.policyDescription && (
            <div className="space-y-2">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Về dịch vụ này
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {pkg.policyDescription}
              </p>
            </div>
          )}

          {/* Pricing Tiers */}
          {(tiersLoading || tiers.length > 0) && (
            <div className="space-y-4">
              <h3 className="text-base font-bold flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                Chọn gói phù hợp
              </h3>
              {tiersLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="w-full h-20 rounded-2xl border border-border/40 animate-pulse bg-muted/10 flex items-center justify-between p-4">
                      <div className="flex items-center gap-3 w-2/3">
                        <div className="w-5 h-5 rounded-full bg-muted/30 shrink-0" />
                        <div className="space-y-2 w-full">
                          <div className="h-4 bg-muted/30 rounded w-1/3" />
                          <div className="h-3 bg-muted/20 rounded w-2/3" />
                        </div>
                      </div>
                      <div className="w-20 h-6 bg-muted/30 rounded" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {tiers.map((tier: PricingTierEntity, idx: number) => {
                  const isSelected = selectedTierIdx === idx;
                  const price = tier.pricePerHour ?? tier.fixedPrice ?? tier.pricePerM2;
                  return (
                    <button key={tier.id} type="button" onClick={() => setSelectedTierIdx(idx)}
                      className={cn(
                        "w-full text-left p-4 rounded-2xl border-2 transition-all",
                        isSelected
                          ? "border-primary bg-primary/5 shadow-sm shadow-primary/20"
                          : "border-border/50 hover:border-primary/40"
                      )}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                            isSelected ? "border-primary bg-primary" : "border-muted-foreground/30")}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div>
                            <p className="font-bold text-sm">{tier.name}</p>
                            {tier.description && <p className="text-xs text-muted-foreground mt-0.5">{tier.description}</p>}
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                              {tier.minHours && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{tier.minHours}–{tier.maxHours ?? "∞"}h</span>}
                              {tier.areaMinM2 && <span className="flex items-center gap-1"><Layers className="w-3 h-3" />{tier.areaMinM2}–{tier.areaMaxM2 ?? "∞"} m²</span>}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          {price != null && (
                            <>
                              <p className="text-lg font-black text-primary">{vnd(Number(price))}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {tier.pricePerHour ? "/giờ" : tier.pricePerM2 ? "/m²" : "cố định"}
                              </p>
                            </>
                          )}
                          {isSelected && <Badge className="mt-1 text-[10px] bg-primary/10 text-primary border-primary/20">Đang chọn</Badge>}
                        </div>
                      </div>
                    </button>
                  );
                })}
                </div>
              )}

              {/* CTA */}
              <div className="flex gap-3 pt-2">
                <button className="flex-1 py-3.5 rounded-2xl bg-primary text-primary-foreground font-black text-sm shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all flex items-center justify-center gap-2">
                  <Phone className="w-4 h-4" />
                  Đặt ngay {selectedTier && `— ${vnd(Number(selectedTier.pricePerHour ?? selectedTier.fixedPrice ?? selectedTier.pricePerM2 ?? 0))}`}
                </button>
                <button className="w-12 h-12 rounded-2xl border-2 border-border hover:border-primary/40 flex items-center justify-center text-muted-foreground hover:text-primary transition-all shrink-0">
                  <MessageCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Sub-services */}
          {subServices.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                Dịch vụ trong gói ({subServices.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {subServices.map(pss => {
                  const svc = pss.subService;
                  if (!svc) return null;
                  return (
                    <div key={pss.id}
                      className={cn("flex gap-3 p-4 rounded-2xl border-2 transition-all",
                        pss.isDefault ? "border-primary/30 bg-primary/5" : "border-border/40")}>
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-muted/40 shrink-0 border border-border/30">
                        {svc.thumbnailUrl ? (
                          <Image src={svc.thumbnailUrl} alt={svc.name} fill className="object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Package className="w-6 h-6 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-sm leading-tight">{svc.name}</p>
                          {pss.isRequired && <Badge className="text-[9px] bg-destructive/10 text-destructive border-destructive/20 h-4 px-1">Bắt buộc</Badge>}
                          {pss.isDefault && <Badge className="text-[9px] bg-primary/10 text-primary border-primary/20 h-4 px-1">Mặc định</Badge>}
                        </div>
                        {svc.shortDescription && (
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{svc.shortDescription}</p>
                        )}
                        {svc.durationHours && (
                          <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> ~{svc.durationHours} giờ
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Included / Excluded tasks */}
          {(includedTasks.length > 0 || excludedTasks.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {includedTasks.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold flex items-center gap-2 text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />
                    Bao gồm trong dịch vụ
                  </h3>
                  <ul className="space-y-2">
                    {includedTasks.map((task, i) => (
                      <li key={i} className="flex items-center gap-2.5 text-sm">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                        {task}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {excludedTasks.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold flex items-center gap-2 text-rose-500">
                    <XCircle className="w-4 h-4" />
                    Không bao gồm
                  </h3>
                  <ul className="space-y-2">
                    {excludedTasks.map((task, i) => (
                      <li key={i} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                        <X className="w-4 h-4 text-rose-400 shrink-0" />
                        {task}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Coverage areas */}
          {coverageAreas.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Khu vực phục vụ ({coverageAreas.length} quận/huyện)
              </h3>
              <div className="flex flex-wrap gap-2">
                {coverageAreas.map(area => (
                  <span key={area.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium bg-muted/40 border border-border/50 hover:bg-muted transition-colors">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    {area.name}
                    {Number(area.transportFee) === 0 && (
                      <span className="text-[10px] text-emerald-600 font-bold">Miễn phí</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Surcharges info */}
          {(pkg.nightSurcharge || pkg.petSurcharge || pkg.waitingSurcharge || pkg.peakRatePercent) && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Phụ phí có thể áp dụng</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {pkg.nightSurcharge && Number(pkg.nightSurcharge) > 0 && (
                  <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200/40 text-center">
                    <p className="text-xs text-indigo-600 font-semibold">🌙 Giờ đêm</p>
                    <p className="text-sm font-black text-indigo-700 mt-1">+{vnd(Number(pkg.nightSurcharge))}</p>
                  </div>
                )}
                {pkg.petSurcharge && Number(pkg.petSurcharge) > 0 && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200/40 text-center">
                    <p className="text-xs text-amber-600 font-semibold">🐾 Thú cưng</p>
                    <p className="text-sm font-black text-amber-700 mt-1">+{vnd(Number(pkg.petSurcharge))}</p>
                  </div>
                )}
                {pkg.waitingSurcharge && Number(pkg.waitingSurcharge) > 0 && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200/40 text-center">
                    <p className="text-xs text-rose-600 font-semibold">⏳ Chờ đợi</p>
                    <p className="text-sm font-black text-rose-700 mt-1">+{vnd(Number(pkg.waitingSurcharge))}</p>
                  </div>
                )}
                {pkg.peakRatePercent && Number(pkg.peakRatePercent) > 0 && (
                  <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200/40 text-center">
                    <p className="text-xs text-orange-600 font-semibold">⚡ Cao điểm</p>
                    <p className="text-sm font-black text-orange-700 mt-1">+{pkg.peakRatePercent}%</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Terms */}
          {terms.length > 0 && (
            <div className="space-y-3">
              <button type="button" onClick={() => setTermsExpanded(v => !v)}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/40 hover:bg-muted/50 transition-all">
                <span className="text-sm font-bold flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  Điều khoản & Chính sách ({terms.length} điều khoản)
                </span>
                {termsExpanded
                  ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>
              {termsExpanded && (
                <div className="space-y-2 px-1">
                  {terms.map((term, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/20 border border-border/30">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-sm text-foreground/80 leading-relaxed">{term}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Premium Commitments Section */}
          {premiumTerms.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/20 dark:bg-amber-950/10 p-5 space-y-3">
              <h4 className="text-sm font-extrabold text-amber-800 dark:text-amber-500 flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                Đặc quyền dịch vụ Premium
              </h4>
              <p className="text-xs text-amber-700/90 dark:text-amber-400/90 leading-relaxed">
                Khi đặt gói Premium, quý khách sẽ được áp dụng các quy chuẩn phục vụ đặc biệt sau:
              </p>
              <div className="space-y-2.5 mt-2">
                {premiumTerms.map((term, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-900 dark:text-amber-300 font-extrabold leading-normal">{term}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                Đánh giá từ khách hàng
              </h3>
              <div className="flex items-center gap-2">
                <div className="text-3xl font-black text-foreground">4.8</div>
                <div>
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5].map(i => <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
                  </div>
                  <p className="text-xs text-muted-foreground">124 đánh giá</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {MOCK_REVIEWS.map((r, i) => (
                <ReviewCard key={i} {...r} />
              ))}
            </div>
            <button className="w-full py-2.5 rounded-2xl border border-border text-sm font-semibold hover:bg-muted/30 transition-all">
              Xem tất cả 124 đánh giá →
            </button>
          </div>

          {/* Bottom CTA */}
          <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border pt-4 -mx-5 md:-mx-7 px-5 md:px-7 pb-2">
            <div className="flex items-center justify-between mb-3">
              <div>
                {tiersLoading && (
                  <div className="h-10 w-24 bg-muted/20 rounded-xl animate-pulse" />
                )}
                {!tiersLoading && tiers.length > 0 && (
                  <>
                    <p className="text-xs text-muted-foreground">Từ</p>
                    <p className="text-2xl font-black text-primary">
                      {vnd(Math.min(...tiers.map((t: PricingTierEntity) => Number(t.pricePerHour ?? t.fixedPrice ?? t.pricePerM2 ?? 0))))}
                    </p>
                    <p className="text-xs text-muted-foreground">/{pkg.pricingMode === "FIXED" ? "lần" : "giờ"}</p>
                  </>
                )}
              </div>
              <button className="px-8 py-3.5 rounded-2xl bg-primary text-primary-foreground font-black text-sm shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all">
                Đặt dịch vụ ngay
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
