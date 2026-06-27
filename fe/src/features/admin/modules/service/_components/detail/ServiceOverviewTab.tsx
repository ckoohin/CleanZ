import React from "react";
import { AdminServiceEntity } from "@/features/admin/modules/service/services/admin-services.service";
import { CheckCircle2, XCircle, Clock, MapPin, Check, X, Image as ImageIcon } from "lucide-react";
import Image from "next/image";

interface ServiceOverviewTabProps {
  service: AdminServiceEntity;
}

export function ServiceOverviewTab({ service }: ServiceOverviewTabProps) {
  return (
    <div className="space-y-8">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-1/3 aspect-square relative rounded-2xl overflow-hidden bg-[var(--c-card-2)] border border-[var(--c-line)]/50 shadow-sm flex items-center justify-center shrink-0 group">
          {service.thumbnailUrl ? (
            <Image
              src={service.thumbnailUrl}
              alt={service.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="text-[var(--c-muted)] flex flex-col items-center gap-2">
              <ImageIcon className="w-12 h-12 opacity-50" />
              <span className="text-sm font-medium">Chưa có ảnh</span>
            </div>
          )}
        </div>

        <div className="w-full md:w-2/3 flex flex-col space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-3xl font-bold text-[var(--c-ink)]">{service.name}</h2>
              {service.isActive ? (
                <span className="px-3 py-1 rounded-full bg-[rgba(14,159,110,0.12)] text-[#0E9F6E] text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#0E9F6E]"></span>
                  Hoạt động
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-[rgba(225,29,72,0.12)] text-[#E11D48] text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#E11D48]"></span>
                  Đã tắt
                </span>
              )}
            </div>
            <p className="text-lg text-[var(--c-muted)]">{service.shortDescription || "Chưa có mô tả ngắn."}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-xl border border-[var(--c-line)]/50 bg-[var(--c-card)] shadow-sm">
              <div className="p-2 rounded-lg bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)]">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-[var(--c-muted)] font-medium">Thời lượng cơ bản</p>
                <p className="font-bold text-[var(--c-ink)]">{service.durationHours ? `${service.durationHours} giờ` : "Chưa cấu hình"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl border border-[var(--c-line)]/50 bg-[var(--c-card)] shadow-sm">
              <div className="p-2 rounded-lg bg-[#D97706] text-[#D97706]">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-[var(--c-muted)] font-medium">Khu vực phục vụ</p>
                <p className="font-bold text-[var(--c-ink)]">{service.coverageArea || "Toàn quốc"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <hr className="border-[var(--c-line)]/50" />

      {/* Description */}
      <div>
        <h3 className="text-xl font-bold text-[var(--c-ink)] mb-4">Mô tả chi tiết</h3>
        <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-[var(--c-muted)] bg-[var(--c-card-2)] p-6 rounded-2xl border border-[var(--c-line)]/50">
          {service.description ? (
            <p className="whitespace-pre-wrap">{service.description}</p>
          ) : (
            <p className="italic opacity-70">Chưa có mô tả chi tiết cho dịch vụ này.</p>
          )}
        </div>
      </div>

      <hr className="border-[var(--c-line)]/50" />

      {/* Tasks List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-bold text-[var(--c-primary-strong)] flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5" />
            Công việc bao gồm
          </h3>
          <ul className="space-y-3">
            {service.includedTasks && service.includedTasks.length > 0 ? (
              service.includedTasks.map((task, index) => (
                <li key={index} className="flex items-start gap-3 p-3 rounded-xl bg-[var(--c-primary-soft)] border border-[var(--c-primary)]/10">
                  <Check className="w-5 h-5 text-[var(--c-primary-strong)] shrink-0 mt-0.5" />
                  <span className="text-[var(--c-ink)]">{task}</span>
                </li>
              ))
            ) : (
              <li className="text-[var(--c-muted)] italic text-sm p-4 bg-[var(--c-card-2)] rounded-xl border border-dashed border-[var(--c-line)] text-center">Chưa có dữ liệu</li>
            )}
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-bold text-[#E11D48] flex items-center gap-2 mb-4">
            <XCircle className="w-5 h-5" />
            Công việc không bao gồm
          </h3>
          <ul className="space-y-3">
            {service.excludedTasks && service.excludedTasks.length > 0 ? (
              service.excludedTasks.map((task, index) => (
                <li key={index} className="flex items-start gap-3 p-3 rounded-xl bg-[rgba(225,29,72,0.12)] border border-[#E11D48]/10">
                  <X className="w-5 h-5 text-[#E11D48] shrink-0 mt-0.5" />
                  <span className="text-[var(--c-ink)]">{task}</span>
                </li>
              ))
            ) : (
              <li className="text-[var(--c-muted)] italic text-sm p-4 bg-[var(--c-card-2)] rounded-xl border border-dashed border-[var(--c-line)] text-center">Chưa có dữ liệu</li>
            )}
          </ul>
        </div>
      </div>

      {/* Gallery */}
      {service.galleryUrls && service.galleryUrls.length > 0 && (
        <>
          <hr className="border-[var(--c-line)]/50" />
          <div>
            <h3 className="text-xl font-bold text-[var(--c-ink)] mb-4">Thư viện ảnh ({service.galleryUrls.length})</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {service.galleryUrls.map((url, idx) => (
                <div key={idx} className="aspect-square relative rounded-xl overflow-hidden border border-[var(--c-line)] shadow-sm group">
                  <Image src={url} alt={`Gallery ${idx}`} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
