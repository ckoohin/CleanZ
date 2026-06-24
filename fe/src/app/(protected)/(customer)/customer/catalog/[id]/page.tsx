"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Clock3, MapPin, Zap, PawPrint, Star,
  ShieldCheck, CheckCircle2, ChevronRight,
  Info, FileText, Tag, Flame, ChevronLeft,
} from "lucide-react";
import { catalogApi } from "@/features/customer/catalog/services/catalog.service";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtPrice(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + "đ";
}

// Kiểm tra giờ cao điểm (17:00–20:00)
function isCurrentlyPeakHour(): boolean {
  const h = new Date().getHours();
  return h >= 17 && h < 20;
}

const PRICING_TYPE_LABEL: Record<string, string> = {
  HOURLY: "Tính theo giờ",
  FIXED:  "Gói cố định",
  AREA:   "Tính theo diện tích",
};

// Điều khoản tĩnh chung cho dịch vụ
const GENERAL_TERMS = [
  "Khách hàng cần có mặt hoặc cấp quyền ra vào trước giờ dịch vụ.",
  "Hủy đơn trước 2 giờ sẽ không mất phí. Hủy trong vòng 2 giờ phát sinh phí 20%.",
  "Nhân viên được kiểm tra lý lịch tư pháp đầy đủ.",
  "Dụng cụ và hóa chất vệ sinh do nhân viên chuẩn bị, trừ khi có yêu cầu đặc biệt.",
  "Mọi thiệt hại trong quá trình dịch vụ được bảo hiểm qua chính sách bồi thường của CleanZ.",
  "Không bao gồm dọn dẹp kho, tầng hầm, mái nhà hoặc không gian ngoài trời.",
];

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function DetailSkeleton() {
  return (
    <div className="min-h-screen bg-background animate-pulse">
      <div className="h-72 bg-muted" />
      <div className="px-4 pt-5 space-y-4">
        <div className="h-7 bg-muted rounded-xl w-3/4" />
        <div className="h-4 bg-muted rounded-lg w-1/2" />
        <div className="h-24 bg-muted rounded-2xl" />
        <div className="h-32 bg-muted rounded-2xl" />
      </div>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, icon: Icon, children, className }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("bg-card border border-border/40 rounded-2xl p-4", className)}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <h2 className="font-bold text-sm text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ─── Price block ──────────────────────────────────────────────────────────────
function PriceBlock({
  basePrice,
  peakPrice,
  pricingType,
}: {
  basePrice: number;
  peakPrice: number | null;
  pricingType: string;
}) {
  const isPeak = peakPrice !== null && isCurrentlyPeakHour();
  const diff = peakPrice !== null ? peakPrice - basePrice : 0;

  return (
    <Section title="Bảng giá" icon={Tag}>
      <div className="space-y-3">
        {/* Giá gốc */}
        <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Giá gốc ({PRICING_TYPE_LABEL[pricingType] ?? pricingType})</p>
            <p className="text-2xl font-black text-foreground">{fmtPrice(basePrice)}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Tag className="w-5 h-5 text-primary" />
          </div>
        </div>

        {/* Peak price */}
        {peakPrice !== null && (
          <div className={cn(
            "flex items-center justify-between p-3 rounded-xl border-2",
            isPeak
              ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20"
              : "border-border/40 bg-muted/20"
          )}>
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
                  Giá cao điểm (17:00 – 20:00){isPeak && " · Đang áp dụng"}
                </p>
              </div>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{fmtPrice(peakPrice)}</p>
              {diff > 0 && (
                <p className="text-xs text-amber-500 mt-0.5">
                  +{fmtPrice(diff)} so với giá thường
                </p>
              )}
            </div>
            <Flame className={cn("w-8 h-8", isPeak ? "text-amber-500" : "text-muted-foreground/30")} />
          </div>
        )}

        {/* Ghi chú */}
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          * Giá trên là giá khởi điểm. Tổng tiền thực tế có thể thay đổi tùy vào địa chỉ,
          phụ phí thú cưng và voucher áp dụng.
        </p>
      </div>
    </Section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// Slide direction variants
const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? "100%" : "-100%",
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({
    x: dir > 0 ? "-100%" : "100%",
    opacity: 0,
  }),
};

export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  // Gallery state
  const [[activeImg, direction], setSlide] = useState<[number, number]>([0, 0]);
  const [isPaused, setIsPaused] = useState(false);

  // Touch swipe
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const { data: service, isLoading, isError } = useQuery({
    queryKey: ["sub-service", id],
    queryFn: () => catalogApi.findOne(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  const allImages = useMemo(
    () => service
      ? [service.thumbnailUrl, ...(service.galleryUrls ?? [])].filter(Boolean)
      : [],
    [service]
  );

  const goTo = useCallback((idx: number, dir: number) => {
    setSlide([idx, dir]);
  }, []);

  const goNext = useCallback(() => {
    if (allImages.length <= 1) return;
    const next = (activeImg + 1) % allImages.length;
    goTo(next, 1);
  }, [activeImg, allImages.length, goTo]);

  const goPrev = useCallback(() => {
    if (allImages.length <= 1) return;
    const prev = (activeImg - 1 + allImages.length) % allImages.length;
    goTo(prev, -1);
  }, [activeImg, allImages.length, goTo]);

  // Auto slideshow — 2s, pause on user interaction
  useEffect(() => {
    if (allImages.length <= 1 || isPaused) return;
    const timer = setInterval(goNext, 2000);
    return () => clearInterval(timer);
  }, [allImages.length, isPaused, goNext]);

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setIsPaused(true); // pause on touch
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;

    // Only horizontal swipe (avoid scroll conflicts)
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx < 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
    touchStartY.current = null;

    // Resume after 3s
    setTimeout(() => setIsPaused(false), 3000);
  };

  if (isLoading) return <DetailSkeleton />;

  if (isError || !service) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
          <Info className="w-8 h-8 text-muted-foreground/40" />
        </div>
        <h2 className="font-bold text-lg">Không tìm thấy dịch vụ</h2>
        <p className="text-sm text-muted-foreground">Dịch vụ không tồn tại hoặc đã ngừng hoạt động.</p>
        <button
          onClick={() => router.back()}
          className="mt-2 px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl"
        >
          Quay lại
        </button>
      </div>
    );
  }

  const basePrice = Number(service.pricingConfig?.basePrice ?? 0);
  const peakPrice = service.pricingConfig?.peakPrice ? Number(service.pricingConfig.peakPrice) : null;
  const petFee    = service.pricingConfig?.petFee ? Number(service.pricingConfig.petFee) : 0;
  const pricingType = service.pricingType ?? "FIXED";
  const pricingLabel = PRICING_TYPE_LABEL[pricingType.toUpperCase()] ?? pricingType;

  return (
    <div className="min-h-screen bg-background pb-[calc(80px+72px+1rem)] md:pb-28">

      {/* ── Gallery ── */}
      <div
        className="relative select-none"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="relative aspect-[4/3] md:aspect-[21/9] bg-muted overflow-hidden">
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.img
              key={activeImg}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.38, ease: [0.32, 0.72, 0, 1] }}
              src={allImages[activeImg] ?? "/placeholder.jpg"}
              alt={service.name}
              draggable={false}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </AnimatePresence>
        </div>

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-card/80 backdrop-blur-md border border-border/40 flex items-center justify-center shadow-md hover:bg-card transition-colors z-10"
          aria-label="Quay lại"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>

        {/* Prev / Next arrows — desktop */}
        {allImages.length > 1 && (
          <>
            <button
              onClick={() => { goPrev(); setIsPaused(true); setTimeout(() => setIsPaused(false), 3000); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 hidden md:flex w-9 h-9 rounded-full bg-card/80 backdrop-blur-md border border-border/40 items-center justify-center shadow-md hover:bg-card transition-colors z-10"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            <button
              onClick={() => { goNext(); setIsPaused(true); setTimeout(() => setIsPaused(false), 3000); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex w-9 h-9 rounded-full bg-card/80 backdrop-blur-md border border-border/40 items-center justify-center shadow-md hover:bg-card transition-colors z-10"
            >
              <ChevronRight className="w-5 h-5 text-foreground" />
            </button>
          </>
        )}

        {/* Dot indicators */}
        {allImages.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 px-4 z-10">
            {allImages.map((_, i) => (
              <button
                key={i}
                onClick={() => { goTo(i, i > activeImg ? 1 : -1); setIsPaused(true); setTimeout(() => setIsPaused(false), 3000); }}
                className={cn(
                  "rounded-full transition-all duration-300",
                  i === activeImg
                    ? "w-5 h-2 bg-white shadow-md"
                    : "w-2 h-2 bg-white/50 hover:bg-white/80"
                )}
              />
            ))}
          </div>
        )}

        {/* Thumb strip — desktop only */}
        {allImages.length > 1 && (
          <div className="hidden md:flex gap-2 absolute bottom-3 right-3 z-10">
            {allImages.slice(0, 4).map((img, i) => (
              <button
                key={i}
                onClick={() => { goTo(i, i > activeImg ? 1 : -1); setIsPaused(true); setTimeout(() => setIsPaused(false), 3000); }}
                className={cn(
                  "w-14 h-14 rounded-xl overflow-hidden border-2 transition-all",
                  i === activeImg ? "border-primary shadow-md" : "border-white/50"
                )}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
            {allImages.length > 4 && (
              <div className="w-14 h-14 rounded-xl bg-black/40 flex items-center justify-center text-white text-xs font-bold">
                +{allImages.length - 4}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div className="px-4 py-5 space-y-4 max-w-2xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-foreground/10 px-2.5 py-1 text-[11px] font-bold text-foreground">
              {pricingLabel}
            </span>
            {peakPrice !== null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-600">
                <Zap className="w-3 h-3" /> Có giá cao điểm
              </span>
            )}
            {petFee > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-1 text-[11px] font-bold text-green-600">
                <PawPrint className="w-3 h-3" /> Thân thiện thú cưng
              </span>
            )}
          </div>

          <h1 className="text-2xl font-black text-foreground leading-tight">{service.name}</h1>

          {/* Meta */}
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock3 className="w-4 h-4 text-primary" />
              {Number(service.durationHours)} giờ
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-primary" />
              {service.coverageArea || "Hà Nội"}
            </span>
            <span className="flex items-center gap-1.5 text-amber-500">
              <Star className="w-4 h-4 fill-amber-400" />
              4.9
            </span>
          </div>
        </motion.div>

        {/* Mô tả */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Section title="Mô tả dịch vụ" icon={Info}>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {service.description || service.shortDescription || "Chưa có mô tả chi tiết."}
            </p>
          </Section>
        </motion.div>

        {/* Bảng giá */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <PriceBlock basePrice={basePrice} peakPrice={peakPrice} pricingType={pricingType} />
        </motion.div>

        {/* Bao gồm trong dịch vụ */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
          <Section title="Bao gồm trong dịch vụ" icon={CheckCircle2}>
            <div className="space-y-2">
              {[
                "Nhân viên được đào tạo chuyên nghiệp",
                "Dụng cụ và thiết bị vệ sinh hiện đại",
                "Hóa chất an toàn cho gia đình và thú cưng",
                "Báo cáo trạng thái công việc realtime",
                "Bảo hành chất lượng 48 giờ",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-foreground">{item}</span>
                </div>
              ))}
            </div>
          </Section>
        </motion.div>

        {/* Điều khoản */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Section title="Điều khoản & Lưu ý" icon={FileText}>
            <div className="space-y-2">
              {GENERAL_TERMS.map((term, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold text-muted-foreground">
                    {i + 1}
                  </div>
                  <span className="text-sm text-muted-foreground leading-relaxed">{term}</span>
                </div>
              ))}
            </div>
          </Section>
        </motion.div>

        {/* Cam kết chất lượng */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
          <Section title="Cam kết chất lượng CleanZ" icon={ShieldCheck}>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Bảo hành", value: "48h" },
                { label: "Đánh giá", value: "★ 4.9" },
                { label: "Đã phục vụ", value: "10K+" },
              ].map((item) => (
                <div key={item.label} className="text-center p-3 bg-muted/30 rounded-xl">
                  <p className="font-black text-primary text-base">{item.value}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
          </Section>
        </motion.div>
      </div>

      {/* ── Sticky CTA ── */}
      {/* mobile: bottom = chiều cao BottomNav (h-20 = 80px) | desktop: bottom-0 */}
      <div className={[
        "fixed left-0 right-0 z-40",
        "bottom-20 md:bottom-0",          // ← trên mobile đẩy lên trên BottomNav
        "bg-card/95 backdrop-blur-xl border-t border-border/40 shadow-2xl",
        "px-4 py-3",
      ].join(" ")}>
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Giá khởi điểm</p>
            <p className="text-xl font-black text-primary">{fmtPrice(basePrice)}</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => router.push(`${ROUTES.CUSTOMER.BOOKING_WIZARD}?serviceId=${service.id}`)}
            className="flex-1 h-12 bg-primary text-primary-foreground font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/30 hover:bg-primary/90 transition-colors"
          >
            Đặt dịch vụ ngay
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
