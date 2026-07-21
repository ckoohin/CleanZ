"use client";

import { motion } from "framer-motion";
import {
  Clock3, MapPin, Zap, PawPrint, Star,
  ChevronRight, Eye, ShieldCheck, Sparkles, Tag
} from "lucide-react";
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
  subServiceNames?: string[];
  rating?: number;
  reviewsCount?: number;
  isPopular?: boolean;
  hasPromo?: boolean;
  onViewDetail: (id: string) => void;
  onBookNow: (id: string) => void;
}

const PRICING_BADGE: Record<string, { label: string; color: string }> = {
  HOURLY:  { label: "Theo giờ",      color: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  FIXED:   { label: "Gói cố định",   color: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
  AREA:    { label: "Theo m²",       color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  PACKAGE: { label: "Gói dịch vụ",  color: "bg-primary/15 text-primary" },
};

// Rating giả placeholder (tới khi có API review)



export const ServiceCard = ({
  id,
  name,
  description,
  imageUrl,
  basePrice,
  durationHours,
  coverageArea,
  pricingType,
  hasPetFee,
  hasPeakPrice,
  subServiceNames = [],
  rating = 4.8,
  reviewsCount = 100,
  isPopular,
  hasPromo,
  onViewDetail,
  onBookNow,
}: ServiceCardProps) => {
  const fmtPrice = (n: number) => new Intl.NumberFormat("vi-VN").format(n);
  const badge = pricingType
    ? (PRICING_BADGE[pricingType.toUpperCase()] ?? PRICING_BADGE.PACKAGE)
    : PRICING_BADGE.PACKAGE;

  return (
    <motion.article
      variants={zoomInVariants}
      whileHover={{ y: -5, boxShadow: "0 20px 40px -12px rgba(0,0,0,0.15)" }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        "group relative bg-card rounded-2xl border border-border/50",
        "overflow-hidden shadow-sm",
        "flex flex-col cursor-pointer"
      )}
      onClick={() => onViewDetail(id)}
      aria-label={`Xem chi tiết: ${name}`}
    >
      {/* ── Image zone ── */}
      <div className="relative aspect-[16/10] overflow-hidden bg-muted shrink-0">
        <img
          src={imageUrl}
          alt={name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        {/* Top-right badges (Chỉ hiển thị tối đa 2 badge ưu tiên nhất để tránh che đè ảnh) */}
        <div className="absolute top-2 right-2 md:top-2.5 md:right-2.5 flex flex-col gap-1 items-end z-10">
          {isPopular && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/95 backdrop-blur-xs px-1.5 py-0.5 text-[8px] md:text-[9px] font-black text-white shadow-md">
              <Sparkles className="h-2 w-2 md:h-2.5 md:w-2.5 fill-current" /> Nổi bật
            </span>
          )}
          {hasPromo && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/95 backdrop-blur-xs px-1.5 py-0.5 text-[8px] md:text-[9px] font-black text-white shadow-md">
              <Tag className="h-2 w-2 md:h-2.5 md:w-2.5" /> Ưu đãi
            </span>
          )}
          {!isPopular && !hasPromo && hasPeakPrice && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/95 backdrop-blur-xs px-1.5 py-0.5 text-[8px] md:text-[9px] font-bold text-white shadow">
              <Zap className="h-2 w-2 md:h-2.5 md:w-2.5 fill-current" /> Cao điểm
            </span>
          )}
          {!isPopular && !hasPromo && !hasPeakPrice && hasPetFee && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/95 backdrop-blur-xs px-1.5 py-0.5 text-[8px] md:text-[9px] font-bold text-white shadow">
              <PawPrint className="h-2 w-2 md:h-2.5 md:w-2.5" /> Thú cưng
            </span>
          )}
        </div>

        {/* Bottom-left: pricing type pill */}
        <div className="absolute bottom-2 left-2">
          <span className={cn(
            "inline-flex items-center gap-1 rounded-full bg-card/90 backdrop-blur-sm",
            "px-1.5 py-0.5 text-[8px] md:text-[9px] font-bold shadow-sm border border-border/30",
            badge.color
          )}>
            {badge.label}
          </span>
        </div>

        {/* Bottom-right: rating */}
        <div className="absolute bottom-2 right-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-sm px-1.5 py-0.5 text-[8px] md:text-[9px] font-semibold text-white shadow">
            <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
            {rating} <span className="text-white/70">({reviewsCount})</span>
          </span>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex flex-1 flex-col p-2.5 md:p-3.5 gap-1.5 md:gap-2">

        {/* Title + shield */}
        <div className="flex items-start justify-between gap-1.5">
          <h3 className="text-xs md:text-sm font-bold leading-snug text-foreground line-clamp-2 flex-1">
            {name}
          </h3>
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary/60 mt-0.5" />
        </div>

        {/* Description */}
        <p className="text-[11px] md:text-xs leading-relaxed text-muted-foreground line-clamp-1 md:line-clamp-2">
          {description}
        </p>

        {/* Sub-service tags */}
        {subServiceNames.length > 0 && (
          <div className="hidden sm:flex flex-wrap gap-1.5">
            {subServiceNames.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/40 truncate max-w-[120px]"
              >
                {tag}
              </span>
            ))}
            {subServiceNames.length > 3 && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/40">
                +{subServiceNames.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Meta: duration + area */}
        <div className="flex items-center gap-1.5 md:gap-3 text-[10px] md:text-xs text-muted-foreground/80">
          <span className="inline-flex items-center gap-1 shrink-0">
            <Clock3 className="h-3 w-3 md:h-3.5 md:w-3.5 text-primary/60 shrink-0" />
            {durationHours > 0 ? `${durationHours} giờ` : "Linh hoạt"}
          </span>
          <span className="h-3 w-px bg-border shrink-0" />
          <span className="inline-flex min-w-0 items-center gap-1">
            <MapPin className="h-3 w-3 md:h-3.5 md:w-3.5 text-primary/60 shrink-0" />
            <span className="truncate">{coverageArea || "Toàn bộ"}</span>
          </span>
        </div>

        {/* Divider */}
        <div className="h-px bg-border/50 -mx-1" />

        {/* Price + CTAs (Giá bên trái rộng rãi, Nút Đặt ngay duy nhất bên phải) */}
        <div className="flex items-center justify-between gap-2 mt-auto pt-1">
          {/* Price */}
          <div className="min-w-0 flex-1">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground/70 font-bold mb-0.5">
              Từ
            </p>
            <p className="text-sm md:text-base font-black text-primary leading-none whitespace-nowrap">
              {fmtPrice(basePrice)}
              <span className="text-[10px] md:text-xs font-normal text-muted-foreground ml-0.5">đ</span>
            </p>
          </div>

          {/* Nút Đặt ngay duy nhất thanh thoát */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onBookNow(id);
            }}
            className={cn(
              "inline-flex h-8 md:h-8.5 items-center gap-1 rounded-xl px-2.5 md:px-3.5 shrink-0",
              "bg-primary text-primary-foreground text-xs font-bold",
              "hover:bg-primary/90 shadow-sm shadow-primary/30",
              "transition-all duration-200 active:scale-95 whitespace-nowrap"
            )}
            aria-label={`Đặt ngay ${name}`}
          >
            <span>Đặt ngay</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </motion.article>
  );
};
