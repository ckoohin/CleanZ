import React, { useState } from "react";
import Image from "next/image";
import {
  Package, ChevronRight, Eye, Clock, CheckCircle2, XCircle,
  Check, X, Star, DollarSign, Loader2, AlertCircle,
} from "lucide-react";
import { AdminServicePackageEntity } from "@/features/admin/modules/service/services/admin-services.service";
import { useRouter } from "next/navigation";
import BaseEmptyState from "@/components/ui/base/base_empty_state";

interface PackageSubServicesTabProps {
  pkg: AdminServicePackageEntity;
}

const vnd = (val: number | string | null | undefined) => {
  if (!val && val !== 0) return "—";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(Number(val));
};

export function PackageSubServicesTab({ pkg }: PackageSubServicesTabProps) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const subServices = pkg.packageSubServices ?? [];

  if (subServices.length === 0) {
    return (
      <div className="py-16">
        <BaseEmptyState
          title="Chưa có dịch vụ con"
          description="Gói này chưa liên kết với dịch vụ con nào. Vui lòng thêm dịch vụ con để bắt đầu."
          icon={Package}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-[var(--c-ink)]">Dịch vụ con trong gói</h3>
          <p className="text-sm text-[var(--c-muted)] mt-0.5">
            Tổng cộng <span className="font-bold text-[var(--c-primary-strong)]">{subServices.length}</span> dịch vụ được liên kết
          </p>
        </div>
      </div>

      {/* Sub-services list */}
      <div className="space-y-4">
        {subServices.map((pss) => {
          const svc = pss.subService;
          if (!svc) return null;
          const isExpanded = expandedId === pss.id;

          return (
            <div
              key={pss.id}
              className={`border rounded-2xl overflow-hidden bg-[var(--c-card)] transition-all duration-300 ${
                isExpanded ? "border-[var(--c-primary)]/40 shadow-md" : "border-[var(--c-line)]/50 shadow-sm hover:border-[var(--c-primary)]/20 hover:shadow-md"
              }`}
            >
              {/* Row header */}
              <div
                className="flex items-center gap-4 p-4 cursor-pointer group"
                onClick={() => setExpandedId(isExpanded ? null : pss.id)}
              >
                {/* Thumbnail */}
                <div className="relative h-14 w-14 rounded-xl overflow-hidden bg-[var(--c-card-2)] shrink-0 border border-[var(--c-line)]/40">
                  {svc.thumbnailUrl ? (
                    <Image src={svc.thumbnailUrl} alt={svc.name} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Package className="w-6 h-6 text-[var(--c-muted)]" aria-hidden="true" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-[var(--c-ink)] text-base">{svc.name}</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)] font-bold">
                      {svc.subServiceCode}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        svc.isActive
                          ? "bg-[rgba(14,159,110,0.12)] text-[#0E9F6E] dark:bg-[rgba(14,159,110,0.12)] dark:text-[#0E9F6E]"
                          : "bg-[rgba(225,29,72,0.12)] text-[#E11D48] dark:bg-[rgba(225,29,72,0.12)] dark:text-[#E11D48]"
                      }`}
                    >
                      {svc.isActive ? "Bật" : "Tắt"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-[var(--c-muted)]">
                    {svc.durationHours && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" aria-hidden="true" />
                        {svc.durationHours} giờ
                      </span>
                    )}
                    {svc.pricingConfig?.basePrice && (
                      <span className="flex items-center gap-1 text-[var(--c-primary-strong)] font-semibold">
                        <DollarSign className="w-3 h-3" aria-hidden="true" />
                        {vnd(svc.pricingConfig.basePrice)}
                      </span>
                    )}
                    {svc.includedTasks && svc.includedTasks.length > 0 && (
                      <span className="flex items-center gap-1 text-[#0E9F6E]">
                        <Check className="w-3 h-3" aria-hidden="true" />
                        {svc.includedTasks.length} tác vụ
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/admin/services/${svc.id}`);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--c-line)]/50 text-xs font-semibold text-[var(--c-muted)] hover:text-[var(--c-primary-strong)] hover:border-[var(--c-primary)]/40 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                    Xem chi tiết
                  </button>
                  <ChevronRight
                    className={`w-4 h-4 text-[var(--c-muted)] transition-transform duration-300 ${isExpanded ? "rotate-90" : ""}`}
                    aria-hidden="true"
                  />
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t border-[var(--c-line)]/50 bg-[var(--c-card-2)] p-6 animate-in fade-in-0 slide-in-from-top-2 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Short & Full Description */}
                    <div className="space-y-4">
                      {svc.shortDescription && (
                        <div>
                          <p className="text-xs font-bold text-[var(--c-muted)] uppercase tracking-wider mb-2">Mô tả ngắn</p>
                          <p className="text-sm text-[var(--c-ink)] leading-relaxed bg-[var(--c-card)] p-3 rounded-xl border border-[var(--c-line)]/40">
                            {svc.shortDescription}
                          </p>
                        </div>
                      )}
                      {svc.description && (
                        <div>
                          <p className="text-xs font-bold text-[var(--c-muted)] uppercase tracking-wider mb-2">Mô tả đầy đủ</p>
                          <p className="text-sm text-[var(--c-muted)] leading-relaxed bg-[var(--c-card)] p-3 rounded-xl border border-[var(--c-line)]/40 whitespace-pre-wrap">
                            {svc.description}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Tasks included/excluded */}
                    <div className="space-y-4">
                      {svc.includedTasks && svc.includedTasks.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-[#0E9F6E] uppercase tracking-wider mb-2 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                            Bao gồm ({svc.includedTasks.length})
                          </p>
                          <ul className="space-y-1.5">
                            {svc.includedTasks.map((task, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <Check className="w-3.5 h-3.5 text-[#0E9F6E] shrink-0 mt-0.5" aria-hidden="true" />
                                <span>{task}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {svc.excludedTasks && svc.excludedTasks.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-[#E11D48] uppercase tracking-wider mb-2 flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                            Không bao gồm ({svc.excludedTasks.length})
                          </p>
                          <ul className="space-y-1.5">
                            {svc.excludedTasks.map((task, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-[var(--c-muted)]">
                                <X className="w-3.5 h-3.5 text-[#E11D48] shrink-0 mt-0.5" aria-hidden="true" />
                                <span>{task}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Gallery mini */}
                  {svc.galleryUrls && svc.galleryUrls.length > 0 && (
                    <div className="mt-5 pt-5 border-t border-[var(--c-line)]/40">
                      <p className="text-xs font-bold text-[var(--c-muted)] uppercase tracking-wider mb-3">
                        Ảnh dịch vụ ({svc.galleryUrls.length})
                      </p>
                      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                        {svc.galleryUrls.map((url, i) => (
                          <div key={i} className="relative h-20 w-20 rounded-xl overflow-hidden border border-[var(--c-line)]/40 shrink-0">
                            <Image src={url} alt={`${svc.name} ${i + 1}`} fill className="object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* View detail button */}
                  <div className="mt-5 flex justify-end">
                    <button
                      onClick={() => router.push(`/admin/services/${svc.id}`)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--c-primary)] text-white text-sm font-bold hover:bg-[var(--c-primary)] transition-colors"
                    >
                      <Eye className="w-4 h-4" aria-hidden="true" />
                      Xem toàn bộ thông tin dịch vụ
                      <ChevronRight className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
