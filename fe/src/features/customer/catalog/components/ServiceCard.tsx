"use client";

import { motion } from "framer-motion";
import { Clock3, MapPin, Zap, PawPrint, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { zoomInVariants } from "@/constants/motion";

interface ServiceCardProps {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  basePrice: number;
  peakPrice?: number | null;
  durationHours: number;
  coverageArea?: string | null;
  pricingType?: string;
  hasPetFee?: boolean;
  hasPeakPrice?: boolean;
  onSelect: (id: string) => void;
}

const PRICING_TYPE_LABEL: Record<string, string> = {
  HOURLY: "Theo giờ",
  FIXED:  "Gói cố định",
  AREA:   "Theo m²",
};

// Kiểm tra giờ cao điểm 17h–20h
function isPeakHourNow(): boolean {
  const h = new Date().getHours();
  return h >= 17 && h < 20;
}

export const ServiceCard = ({
  id,
  name,
  description,
  imageUrl,
  basePrice,
  peakPrice,
  durationHours,
  coverageArea,
  pricingType,
  hasPetFee,
  hasPeakPrice,
  onSelect,
}: ServiceCardProps) => {
  const isPeak = hasPeakPrice && peakPrice != null && isPeakHourNow();
  const displayPrice = isPeak && peakPrice != null ? peakPrice : basePrice;
  const peakDiff = peakPrice != null ? peakPrice - basePrice : 0;

  const fmtPrice = (n: number) => new Intl.NumberFormat("vi-VN").format(n);
  const pricingLabel = pricingType
    ? (PRICING_TYPE_LABEL[pricingType.toUpperCase()] ?? pricingType)
    : null;

  return (
    <motion.article
      variants={zoomInVariants}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(id)}
      aria-label={`Xem chi tiết: ${name}`}
      className={cn(
        "group relative bg-card rounded-2xl border border-border/40",
        "overflow-hidden shadow-sm hover:shadow-lg hover:border-primary/20",
        "transition-all duration-300 cursor-pointer flex flex-col"
      )}
    >
      {/* ── Image ── */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted shrink-0">
        <img
          src={imageUrl}
          alt={name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        {/* Badges top-right */}
        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 items-end">
          {isPeak && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-md animate-pulse">
              <Zap className="h-3 w-3" /> Giờ cao điểm
            </span>
          )}
          {!isPeak && hasPeakPrice && (
            <span className="inline-flex items-center gap-1 rounded-full bg-card/90 backdrop-blur-sm px-2 py-0.5 text-[10px] font-semibold text-muted-foreground shadow-sm">
              <Zap className="h-3 w-3 text-amber-500" /> Có giá cao điểm
            </span>
          )}
          {hasPetFee && (
            <span className="inline-flex items-center gap-1 rounded-full bg-card/90 backdrop-blur-sm px-2 py-0.5 text-[10px] font-semibold text-foreground shadow-sm">
              <PawPrint className="h-3 w-3 text-green-500" /> Thú cưng
            </span>
          )}
        </div>

        {/* Pricing type badge bottom-left */}
        {pricingLabel && (
          <span className="absolute bottom-2.5 left-2.5 rounded-lg bg-foreground/75 backdrop-blur-sm px-2 py-0.5 text-[10px] font-semibold text-background">
            {pricingLabel}
          </span>
        )}
      </div>

      {/* ── Content ── */}
      <div className="flex flex-col flex-1 p-4">
        <h3 className="font-bold text-base text-foreground line-clamp-1 mb-1">{name}</h3>

        <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px] leading-relaxed">
          {description}
        </p>

        {/* Meta */}
        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground/80">
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5 shrink-0 text-primary/60" />
            {durationHours} giờ
          </span>
          <span className="inline-flex items-center gap-1 min-w-0">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/60" />
            <span className="truncate">{coverageArea || "Toàn khu vực"}</span>
          </span>
        </div>

        {/* Price + CTA */}
        <div className="mt-auto pt-3 border-t border-border/40 flex items-end justify-between gap-2">
          <div>
            {/* Giá gốc (gạch ngang nếu đang peak) */}
            {isPeak && (
              <p className="text-[10px] text-muted-foreground/60 line-through leading-none mb-0.5">
                {fmtPrice(basePrice)}đ
              </p>
            )}
            {!isPeak && (
              <p className="text-[10px] text-muted-foreground/70 mb-0.5 uppercase tracking-wide">
                Giá từ
              </p>
            )}
            <p className={cn(
              "text-lg font-black leading-none",
              isPeak ? "text-amber-600 dark:text-amber-400" : "text-primary"
            )}>
              {fmtPrice(displayPrice)}
              <span className="text-xs font-normal text-muted-foreground ml-0.5">đ</span>
            </p>
            {isPeak && peakDiff > 0 && (
              <p className="text-[10px] text-amber-500 mt-0.5 flex items-center gap-0.5">
                <Zap className="w-2.5 h-2.5" />+{fmtPrice(peakDiff)}đ cao điểm
              </p>
            )}
          </div>

          {/* Nút "Xem chi tiết" thay vì "Đặt ngay" */}
          <button
            className={cn(
              "shrink-0 inline-flex h-9 items-center gap-1 rounded-xl px-3",
              "bg-card border border-primary/30 text-primary text-xs font-bold",
              "hover:bg-primary hover:text-primary-foreground",
              "transition-all duration-200 active:scale-95"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(id);
            }}
            aria-label={`Xem chi tiết ${name}`}
          >
            Xem chi tiết
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </motion.article>
  );
};