"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Clock3, MapPin, Zap, PawPrint, Star,
  ShieldCheck, CheckCircle2, ChevronRight,
  Info, FileText, Tag, Flame, ChevronLeft,
  MessageSquare, ThumbsUp, User,
} from "lucide-react";
import { catalogApi } from "@/features/customer/catalog/services/catalog.service";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import http from "@/lib/api/http";
import { API_ENDPOINTS } from "@/constants/api-endpoints";

// ─── Types ───────────────────────────────────────────────────────────────────
interface ReviewItem {
  id: string;
  overallRating: number;
  punctuality: number;
  cleanliness: number;
  friendliness: number;
  satisfaction: number;
  comment: string | null;
  images: string[];
  adminReply: string | null;
  taskerReply: string | null;
  isAnonymous: boolean;
  createdAt: string;
  customerName: string | null;
  avatar: string | null;
}

interface PackageReviewsResponse {
  items: ReviewItem[];
  total: number;
  avgRating: number;
  totalReviews: number;
  distribution: { stars: number; count: number; pct: number }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtPrice(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + "đ";
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function isCurrentlyPeakHour(): boolean {
  const h = new Date().getHours();
  return h >= 17 && h < 20;
}

const PRICING_TYPE_LABEL: Record<string, string> = {
  HOURLY: "Tính theo giờ",
  FIXED:  "Gói cố định",
  AREA:   "Tính theo diện tích",
  PACKAGE: "Gói dịch vụ",
};

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

function StarRow({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const s = size === "lg" ? "w-5 h-5" : "w-3.5 h-3.5";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(s, "shrink-0 transition-colors",
            star <= Math.round(rating)
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/30"
          )}
        />
      ))}
    </div>
  );
}

function RatingBar({ stars, count, pct, isSelected, onClick }: { 
  stars: number; 
  count: number; 
  pct: number;
  isSelected?: boolean;
  onClick?: () => void;
}) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 p-1.5 rounded-xl transition-all select-none",
        isSelected && "bg-primary/10 border border-primary/20"
      )}
    >
      <span className="w-4 text-right text-muted-foreground font-medium">{stars}</span>
      <Star className={cn("w-3.5 h-3.5 shrink-0 transition-colors", isSelected ? "fill-primary text-primary" : "fill-amber-400 text-amber-400")} />
      <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: pct + "%" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={cn("h-full rounded-full transition-colors", isSelected ? "bg-primary" : "bg-amber-400")}
        />
      </div>
      <span className="w-8 text-right text-muted-foreground font-semibold">{count}</span>
    </div>
  );
}

function ReviewCard({ review }: { review: ReviewItem }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = (review.comment?.length ?? 0) > 160;

  return (
    <div className="p-4 rounded-2xl border border-border/40 bg-card/60 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {review.avatar ? (
            <img
              src={review.avatar}
              alt={review.customerName ?? "Ẩn danh"}
              className="w-9 h-9 rounded-full object-cover border border-border/40"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-foreground">
              {review.customerName ?? "Khách hàng ẩn danh"}
            </p>
            <p className="text-[11px] text-muted-foreground">{fmtDate(review.createdAt)}</p>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-1">
          <StarRow rating={review.overallRating} />
          <span className="text-xs font-bold text-amber-500 ml-1">{review.overallRating.toFixed(1)}</span>
        </div>
      </div>

      {/* Sub-ratings */}
      {(review.cleanliness || review.punctuality || review.friendliness) > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Sạch sẽ", val: review.cleanliness },
            { label: "Đúng giờ", val: review.punctuality },
            { label: "Thân thiện", val: review.friendliness },
          ].map(({ label, val }) => (
            <div key={label} className="text-center p-2 rounded-xl bg-muted/50">
              <p className="text-xs font-bold text-primary">{val.toFixed(1)}</p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Comment */}
      {review.comment && (
        <div>
          <p className={cn("text-sm text-foreground leading-relaxed", !expanded && isLong && "line-clamp-3")}>
            {review.comment}
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs font-semibold text-primary mt-1 hover:underline"
            >
              {expanded ? "Thu gọn" : "Xem thêm"}
            </button>
          )}
        </div>
      )}

      {/* Review images */}
      {review.images.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {review.images.map((img: string, idx: number) => (
            <img
              key={idx}
              src={img}
              alt={`Ảnh đánh giá ${idx + 1}`}
              className="h-20 w-20 rounded-xl object-cover shrink-0 border border-border/40"
            />
          ))}
        </div>
      )}

      {/* Tasker reply */}
      {review.taskerReply && (
        <div className="bg-primary/5 border border-primary/15 rounded-xl p-3">
          <p className="text-[11px] font-bold text-primary mb-1 flex items-center gap-1">
            <MessageSquare className="w-3 h-3" /> Phản hồi từ nhân viên
          </p>
          <p className="text-xs text-foreground leading-relaxed">{review.taskerReply}</p>
        </div>
      )}
    </div>
  );
}

// ─── Slideshow variants ───────────────────────────────────────────────────────
const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? "-100%" : "100%", opacity: 0 }),
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  // Logic theo dõi cuộn phối hợp với menu chính
  const [showNav, setShowNav] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > 80) {
        if (currentScrollY > lastScrollY.current) {
          setShowNav(false); // Cuộn xuống -> ẩn menu chính
        } else {
          setShowNav(true);  // Cuộn lên -> hiện menu chính
        }
      } else {
        setShowNav(true);   // Gần đầu trang -> hiện menu chính
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);



  const [[activeImg, direction], setSlide] = useState<[number, number]>([0, 0]);
  const [isPaused, setIsPaused] = useState(false);
  const [reviewPage, setReviewPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"detail" | "policy" | "review">("detail");
  const [selectedStar, setSelectedStar] = useState<number | null>(null);


  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // ── Fetch service detail ──
  const { data: service, isLoading, isError } = useQuery({
    queryKey: ["service-package-detail", id],
    queryFn: () => catalogApi.findOne(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  // ── Fetch reviews ──
  const { data: reviewsData, isLoading: reviewsLoading } = useQuery<PackageReviewsResponse>({
    queryKey: ["package-reviews", id, reviewPage, selectedStar],
    queryFn: () =>
      http
        .get(API_ENDPOINTS.REVIEWS.PACKAGE(id), {
          params: {
            page: reviewPage,
            limit: 5,
            ...(selectedStar !== null ? { stars: selectedStar } : {})
          }
        })
        .then((r) => r.data),
    enabled: !!id,
    staleTime: 3 * 60 * 1000,
  });

  const allImages = useMemo(() => {
    if (!service) return [];
    const raw = [service.thumbnailUrl, service.iconUrl, ...(service.galleryUrls ?? [])].filter(Boolean) as string[];
    const unique = [...new Set(raw)];
    if (unique.length <= 1) {
      return [
        ...unique,
        "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1603712760238-3db5458ee18a?auto=format&fit=crop&w=1200&q=80"
      ];
    }
    return unique;
  }, [service]);

  const goTo = useCallback((idx: number, dir: number) => setSlide([idx, dir]), []);
  const goNext = useCallback(() => {
    if (allImages.length <= 1) return;
    goTo((activeImg + 1) % allImages.length, 1);
  }, [activeImg, allImages.length, goTo]);
  const goPrev = useCallback(() => {
    if (allImages.length <= 1) return;
    goTo((activeImg - 1 + allImages.length) % allImages.length, -1);
  }, [activeImg, allImages.length, goTo]);

  // Auto slideshow — pause on hover/touch
  useEffect(() => {
    if (allImages.length <= 1 || isPaused) return;
    const timer = setInterval(goNext, 3000);
    return () => clearInterval(timer);
  }, [allImages.length, isPaused, goNext]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setIsPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx < 0) goNext(); else goPrev();
    }
    touchStartX.current = null;
    touchStartY.current = null;
    setTimeout(() => setIsPaused(false), 3000);
  };

  const basePrice = useMemo(() => {
    if (!service) return 0;
    
    // 1. Tính theo danh sách durations thiết lập sẵn
    if (service.durations && service.durations.length > 0) {
      const prices = service.durations
        .map((d) => {
          if (d.priceMode === "fixed") {
            return Number(d.fixedPrice ?? 0);
          } else {
            const rate = Number(service.baseHourlyRate ?? 0);
            const multiplier = Number(d.priceMultiplier ?? 1);
            return rate * d.durationHours * multiplier;
          }
        })
        .filter((p) => p > 0);
      if (prices.length > 0) {
        return Math.min(...prices); // Lấy mức giá rẻ nhất làm giá khởi điểm
      }
    }

    // 2. Tính theo Pricing Tiers (nếu không có durations)
    if (service.pricingTiers && service.pricingTiers.length > 0) {
      const activeTiers = service.pricingTiers.filter(
        (t) => t.pricingMode === service.pricingMode
      );
      if (activeTiers.length > 0) {
        const firstTier = activeTiers[0];
        if (service.pricingMode === "FIXED") {
          return Number(firstTier.fixedPrice ?? 0);
        } else if (service.pricingMode === "HOURLY") {
          const rate = Number(firstTier.pricePerHour ?? service.baseHourlyRate ?? 0);
          const hours = Number(firstTier.defaultHours ?? firstTier.minHours ?? 2);
          return rate * hours;
        }
      }
    }

    // 3. Fallback mặc định
    const rate = Number(service.baseHourlyRate ?? 0);
    const dur  = Number(service.baseDurationHours ?? 0);
    if (rate > 0 && dur > 0) return rate * dur;
    return Number(service.pricing?.basePrice ?? 0);
  }, [service]);

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

  // ── Derived values ──
  const petFee       = Number(service.pricing?.petFee ?? 0);
  const pricingType  = service.pricingMode ?? "PACKAGE";
  const pricingLabel = PRICING_TYPE_LABEL[pricingType.toUpperCase()] ?? "Gói dịch vụ";
  const durationHours = Number(service.baseDurationHours ?? 0);
  
  // Rút gọn hiển thị coverageArea ở phần meta
  const coverageAreaMeta = (() => {
    const areas = service.coverageAreas || [];
    if (areas.length > 3) {
      return areas.slice(0, 3).map((a: { name: string }) => a.name).join(", ") + ` và ${areas.length - 3} khu vực khác`;
    }
    return areas.map((a) => a.name).join(", ") || "Hà Nội";
  })();

  const isPeak        = isCurrentlyPeakHour();
  const avgRating     = reviewsData?.avgRating ?? 0;
  const totalReviews  = reviewsData?.totalReviews ?? 0;

  return (
    <div className="min-h-screen bg-background pb-[calc(80px+72px+1rem)] md:pb-28">

      {/* ── Hero Gallery Slideshow ── */}
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
              transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
              src={allImages[activeImg] ?? "/placeholder.jpg"}
              alt={service.name}
              draggable={false}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.6}
              onDragEnd={(_, info) => {
                const swipeThreshold = 55;
                if (info.offset.x < -swipeThreshold) {
                  goNext();
                } else if (info.offset.x > swipeThreshold) {
                  goPrev();
                }
              }}
              className="absolute inset-0 w-full h-full object-cover cursor-grab active:cursor-grabbing"
            />
          </AnimatePresence>

          {/* Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
        </div>

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-card/80 backdrop-blur-md border border-border/40 flex items-center justify-center shadow-md hover:bg-card transition-colors z-10"
          aria-label="Quay lại"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>

        {/* Image counter badge */}
        {allImages.length > 1 && (
          <div className="absolute top-4 right-4 z-10 bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-full text-white text-xs font-semibold">
            {activeImg + 1} / {allImages.length}
          </div>
        )}

        {/* Prev / Next arrows — desktop */}
        {allImages.length > 1 && (
          <>
            <button
              onClick={() => { goPrev(); setIsPaused(true); setTimeout(() => setIsPaused(false), 3000); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 hidden md:flex w-10 h-10 rounded-full bg-card/80 backdrop-blur-md border border-border/40 items-center justify-center shadow-md hover:bg-card transition-colors z-10"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            <button
              onClick={() => { goNext(); setIsPaused(true); setTimeout(() => setIsPaused(false), 3000); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex w-10 h-10 rounded-full bg-card/80 backdrop-blur-md border border-border/40 items-center justify-center shadow-md hover:bg-card transition-colors z-10"
            >
              <ChevronRight className="w-5 h-5 text-foreground" />
            </button>
          </>
        )}

        {/* Dot indicators */}
        {allImages.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
            {allImages.map((_, i) => (
              <button
                key={i}
                onClick={() => { goTo(i, i > activeImg ? 1 : -1); setIsPaused(true); setTimeout(() => setIsPaused(false), 3000); }}
                className={cn(
                  "rounded-full transition-all duration-300",
                  i === activeImg ? "w-6 h-2 bg-white shadow-md" : "w-2 h-2 bg-white/50 hover:bg-white/80"
                )}
              />
            ))}
          </div>
        )}

        {/* Thumbnail strip — desktop only */}
        {allImages.length > 1 && (
          <div className="hidden md:flex gap-2 absolute bottom-3 right-3 z-10">
            {allImages.slice(0, 5).map((img, i) => (
              <button
                key={i}
                onClick={() => { goTo(i, i > activeImg ? 1 : -1); setIsPaused(true); setTimeout(() => setIsPaused(false), 3000); }}
                className={cn(
                  "w-14 h-14 rounded-xl overflow-hidden border-2 transition-all",
                  i === activeImg ? "border-primary shadow-md scale-105" : "border-white/50 hover:border-white"
                )}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
            {allImages.length > 5 && (
              <div className="w-14 h-14 rounded-xl bg-black/50 flex items-center justify-center text-white text-xs font-bold">
                +{allImages.length - 5}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Content Grid ── */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Cột Trái (2/3): Tiêu đề, Tabs và Chi tiết */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Header info */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-foreground/10 px-2.5 py-1 text-[11px] font-bold text-foreground">
                  {pricingLabel}
                </span>
                {petFee > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-1 text-[11px] font-bold text-green-600">
                    <PawPrint className="w-3 h-3" /> Thân thiện thú cưng
                  </span>
                )}
                {isPeak && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-600">
                    <Zap className="w-3 h-3" /> Giờ cao điểm
                  </span>
                )}
              </div>

              <h1 className="text-2xl font-black text-foreground leading-tight">{service.name}</h1>

              {/* Meta tóm tắt */}
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                {durationHours > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Clock3 className="w-4 h-4 text-primary" />
                    {durationHours} giờ
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-primary" />
                  {coverageAreaMeta}
                </span>
                {totalReviews > 0 && (
                  <span className="flex items-center gap-1.5 text-amber-500">
                    <Star className="w-4 h-4 fill-amber-400" />
                    {avgRating.toFixed(1)}
                    <span className="text-muted-foreground text-xs">({totalReviews} đánh giá)</span>
                  </span>
                )}
              </div>
            </motion.div>

            {/* ── Tabs Navigation ── */}
            <div className="border-b border-border/40 flex gap-6 overflow-x-auto scrollbar-hide pt-2">
              {([
                { id: "detail", label: "Chi tiết dịch vụ" },
                { id: "policy", label: "Lưu ý & Cam kết" },
                { id: "review", label: `Đánh giá (${totalReviews})` },
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "pb-3 text-sm font-bold relative transition-colors shrink-0",
                    activeTab === tab.id
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* ── Tabs Content ── */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {activeTab === "detail" && (
                  <>
                    {/* Mô tả */}
                    <Section title="Mô tả dịch vụ" icon={Info}>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                        {service.description || service.shortDescription || service.policyDescription || "Chưa có mô tả chi tiết."}
                      </p>
                    </Section>

                    {/* Bao gồm trong dịch vụ */}
                    <Section title="Bao gồm trong dịch vụ" icon={CheckCircle2}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

                    {/* Bảng giá dịch vụ theo thời lượng */}
                    {service.durations && service.durations.length > 0 && (
                      <Section title="Bảng giá dịch vụ theo thời lượng" icon={Tag}>
                        <div className="space-y-2.5">
                          {service.durations.map((d) => {
                            let price = 0;
                            if (d.priceMode === "fixed") {
                              price = Number(d.fixedPrice ?? 0);
                            } else {
                              const rate = Number(service.baseHourlyRate ?? 0);
                              const multiplier = Number(d.priceMultiplier ?? 1);
                              price = rate * d.durationHours * multiplier;
                            }
                            return (
                              <div key={d.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/30 border border-border/30 text-sm">
                                <div>
                                  <p className="font-bold text-foreground">
                                    {d.durationHours} giờ
                                    {d.isPopular && (
                                      <span className="ml-2 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[9px] font-black uppercase tracking-wider">
                                        Phổ biến
                                      </span>
                                    )}
                                  </p>
                                  {d.description && <p className="text-xs text-muted-foreground mt-1">{d.description}</p>}
                                </div>
                                <span className="font-black text-primary text-base">{fmtPrice(price)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </Section>
                    )}

                    {/* Dịch vụ thêm tùy chọn (Add-ons) */}
                    {service.addons && service.addons.length > 0 && (
                      <Section title="Dịch vụ thêm tùy chọn (Add-ons)" icon={Flame}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {service.addons.map((a) => (
                            <div key={a.id} className="p-3.5 rounded-2xl bg-muted/30 border border-border/30 flex flex-col justify-between gap-2.5">
                              <div>
                                <p className="text-sm font-bold text-foreground">{a.name}</p>
                                {a.description && <p className="text-xs text-muted-foreground mt-1">{a.description}</p>}
                              </div>
                              <div className="flex items-center justify-between mt-1 text-xs">
                                <span className="text-muted-foreground">
                                  {a.durationMinutes ? `+${a.durationMinutes} phút` : "Không tốn thêm thời gian"}
                                </span>
                                <span className="font-bold text-primary">+{fmtPrice(a.price)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Section>
                    )}

                    {/* Khu vực hoạt động chi tiết */}
                    <Section title="Khu vực hoạt động" icon={MapPin}>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Hỗ trợ tại các quận/huyện: {(service.coverageAreas || []).map((a) => a.name).join(", ") || "Hà Nội"}.
                      </p>
                    </Section>
                  </>
                )}

                {activeTab === "policy" && (
                  <>
                    {/* Điều khoản */}
                    <Section title="Điều khoản & Lưu ý" icon={FileText}>
                      <div className="space-y-4">
                        {service.termsAndConditions && (
                          <div className="p-3 bg-muted/40 rounded-xl mb-2 text-sm text-muted-foreground whitespace-pre-line border border-border/40">
                            {service.termsAndConditions}
                          </div>
                        )}
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
                      </div>
                    </Section>

                    {/* Cam kết */}
                    <Section title="Cam kết chất lượng CleanZ" icon={ShieldCheck}>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: "Bảo hành", value: "48h" },
                          { label: "Đánh giá", value: totalReviews > 0 ? `★ ${avgRating.toFixed(1)}` : "★ 5.0" },
                          { label: "Đã phục vụ", value: "10K+" },
                        ].map((item) => (
                          <div key={item.label} className="text-center p-3 bg-muted/30 rounded-xl">
                            <p className="font-black text-primary text-base">{item.value}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{item.label}</p>
                          </div>
                        ))}
                      </div>
                    </Section>
                  </>
                )}

                {activeTab === "review" && (
                  <Section title="Đánh giá từ khách hàng" icon={Star}>
                    {reviewsLoading ? (
                      <div className="space-y-3">
                        {[1, 2].map((i) => (
                          <div key={i} className="h-28 bg-muted animate-pulse rounded-2xl" />
                        ))}
                      </div>
                    ) : reviewsData && reviewsData.totalReviews > 0 ? (
                      <div className="space-y-4">
                        {/* Overall score + distribution */}
                        <div className="flex gap-4 p-4 bg-muted/30 rounded-2xl">
                          {/* Big score */}
                          <div className="flex flex-col items-center justify-center shrink-0 min-w-[72px]">
                            <p className="text-4xl font-black text-primary leading-none">{avgRating.toFixed(1)}</p>
                            <StarRow rating={avgRating} />
                            <p className="text-[11px] text-muted-foreground mt-1">{totalReviews} đánh giá</p>
                          </div>

                          {/* Bar chart */}
                          <div className="flex-1 space-y-1.5">
                            {(reviewsData.distribution ?? []).map((d) => (
                              <RatingBar 
                                key={d.stars} 
                                stars={d.stars} 
                                count={d.count} 
                                pct={d.pct} 
                                isSelected={selectedStar === d.stars}
                                onClick={() => {
                                  setSelectedStar(selectedStar === d.stars ? null : d.stars);
                                  setReviewPage(1);
                                }}
                              />
                            ))}
                          </div>
                        </div>

                        {selectedStar !== null && (
                          <div className="flex items-center justify-between bg-primary/5 border border-primary/15 p-3 rounded-2xl text-xs">
                            <span className="text-muted-foreground font-medium">
                              Đang hiển thị đánh giá: <strong className="text-primary font-bold">{selectedStar} sao</strong>
                            </span>
                            <button
                              onClick={() => {
                                setSelectedStar(null);
                                setReviewPage(1);
                              }}
                              className="text-primary font-bold hover:underline"
                            >
                              Xem tất cả
                            </button>
                          </div>
                        )}

                        {/* Review cards */}
                        <div className="space-y-3">
                          {reviewsData.items.map((review) => (
                            <ReviewCard key={review.id} review={review} />
                          ))}
                        </div>

                        {/* Pagination */}
                        {reviewsData.total > 5 && (
                          <div className="flex items-center justify-center gap-3">
                            <button
                              disabled={reviewPage === 1}
                              onClick={() => setReviewPage((p) => Math.max(1, p - 1))}
                              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-muted border border-border/40 text-muted-foreground disabled:opacity-40 hover:bg-card transition-colors"
                            >
                              Trước
                            </button>
                            <span className="text-xs text-muted-foreground">
                              Trang {reviewPage} / {Math.ceil(reviewsData.total / 5)}
                            </span>
                            <button
                              disabled={reviewPage >= Math.ceil(reviewsData.total / 5)}
                              onClick={() => setReviewPage((p) => p + 1)}
                              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-muted border border-border/40 text-muted-foreground disabled:opacity-40 hover:bg-card transition-colors"
                            >
                              Sau
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center py-6 gap-2">
                        <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                          <ThumbsUp className="w-6 h-6 text-muted-foreground/40" />
                        </div>
                        <p className="text-sm text-muted-foreground">Chưa có đánh giá nào.</p>
                        <p className="text-xs text-muted-foreground/70">Hãy là người đầu tiên đặt và đánh giá dịch vụ này!</p>
                      </div>
                    )}
                  </Section>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Cột Phải (1/3): Sticky Sidebar tính tiền (Chỉ hiển thị trên PC) */}
          <div className="hidden lg:block">
            <div className="sticky top-24 bg-card border border-border/40 rounded-3xl p-6 shadow-sm space-y-6">
              
              {/* Header giá */}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Giá khởi điểm</p>
                <p className="text-3xl font-black text-primary">{fmtPrice(basePrice)}</p>
              </div>

              {/* Chi tiết phụ phí trong sidebar */}
              <div className="space-y-3 pt-2 border-t border-border/40">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Hình thức:</span>
                  <span className="font-semibold text-foreground">{pricingLabel}</span>
                </div>
                {durationHours > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Thời lượng tối thiểu:</span>
                    <span className="font-semibold text-foreground">{durationHours} giờ</span>
                  </div>
                )}
                {petFee > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Phụ phí thú cưng:</span>
                    <span className="font-semibold text-green-600">+{fmtPrice(petFee)}</span>
                  </div>
                )}
                {isPeak && (
                  <div className="p-2.5 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20 text-xs">
                    <p className="font-bold text-amber-700 dark:text-amber-400 mb-0.5">Giờ cao điểm (17h - 20h)</p>
                    <p className="text-[10px] text-amber-500">Giá có thể tăng theo hệ số cao điểm</p>
                  </div>
                )}
              </div>

              {/* Nút đặt ngay */}
              <button
                onClick={() => router.push(`${ROUTES.CUSTOMER.BOOKING_WIZARD}?serviceId=${service.id}`)}
                className="w-full py-4 bg-primary text-primary-foreground font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/30 hover:bg-primary/90 transition-colors"
              >
                Đặt dịch vụ ngay
                <ChevronRight className="w-4 h-4" />
              </button>

              <p className="text-[10px] text-muted-foreground leading-relaxed text-center">
                * Giá trên là giá khởi điểm. Tổng tiền thực tế có thể thay đổi tùy vào địa chỉ, phụ phí và voucher.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sticky Bottom CTA (Chỉ hiển thị trên Mobile) ── */}
      <div className={cn(
        "fixed left-0 right-0 z-40 lg:hidden bg-card/95 backdrop-blur-xl border-t border-border/40 transition-all duration-300 ease-in-out",
        showNav ? "bottom-20 pb-3 px-4 pl-4 shadow-sm border-b border-border/25" : "bottom-0 pb-5 px-4 pl-14 shadow-2xl"
      )}>
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="flex-1">
            <p className="text-[10px] text-muted-foreground">Giá khởi điểm</p>
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
