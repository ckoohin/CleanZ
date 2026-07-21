"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Sparkles, Wind, Home, Shirt, Bug, Briefcase,
  LayoutGrid, LucideIcon, Flame,
} from "lucide-react";
import { useCatalog } from "../hooks/useCatalog";
import { CatalogHero } from "./CatalogHero";
import { CatalogSearchBar } from "./CatalogSearchBar";
import { ServiceListGrid } from "./ServiceListGrid";
import { ServiceHorizontalScroll } from "./ServiceHorizontalScroll";
import { ServiceGridSkeleton } from "./ServiceCardSkeleton";
import { CatalogEmptyState } from "./CatalogEmptyState";
import { CatalogErrorState } from "./CatalogErrorState";
import { ROUTES } from "@/constants/routes";
import { CATEGORY_ORDER, CATEGORY_LABELS } from "../types/service.type";
import type { ServiceCategory } from "../types/service.type";
import { cn } from "@/lib/utils";

// ─── Lucide icon map ──────────────────────────────────────────────────────────
const CATEGORY_ICONS: Record<ServiceCategory, LucideIcon> = {
  all:          LayoutGrid,
  cleaning:     Sparkles,
  "deep-clean": Home,
  ac:           Wind,
  laundry:      Shirt,
  pest:         Bug,
  office:       Briefcase,
  other:        LayoutGrid,
};

// Màu accent cho từng category khi active/hover
const CATEGORY_COLORS: Record<ServiceCategory, { icon: string; ring: string }> = {
  all:          { icon: "text-primary",      ring: "ring-primary/30" },
  cleaning:     { icon: "text-emerald-500",  ring: "ring-emerald-400/30" },
  "deep-clean": { icon: "text-indigo-500",   ring: "ring-indigo-400/30" },
  ac:           { icon: "text-sky-500",      ring: "ring-sky-400/30" },
  laundry:      { icon: "text-blue-500",     ring: "ring-blue-400/30" },
  pest:         { icon: "text-red-500",      ring: "ring-red-400/30" },
  office:       { icon: "text-amber-500",    ring: "ring-amber-400/30" },
  other:        { icon: "text-muted-foreground", ring: "ring-border" },
};

// ─── Category chip bar ────────────────────────────────────────────────────────
function CategoryChips({
  selected,
  onChange,
}: {
  selected: ServiceCategory;
  onChange: (c: ServiceCategory) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4">
      {CATEGORY_ORDER.map((cat) => {
        const Icon    = CATEGORY_ICONS[cat];
        const colors  = CATEGORY_COLORS[cat];
        const isActive = cat === selected;

        return (
          <motion.button
            key={cat}
            whileTap={{ scale: 0.92 }}
            onClick={() => onChange(cat)}
            className={cn(
              "flex items-center gap-1.5 shrink-0 h-8 pl-2.5 pr-3 rounded-full",
              "text-xs font-semibold whitespace-nowrap transition-all duration-200",
              isActive
                ? [
                    "bg-primary text-primary-foreground shadow-md shadow-primary/25",
                    "ring-2 ring-offset-1 ring-offset-background", colors.ring,
                  ]
                : "bg-card border border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
            )}
          >
            <Icon
              className={cn(
                "w-3.5 h-3.5 shrink-0 transition-colors",
                isActive ? "text-primary-foreground" : colors.icon
              )}
              strokeWidth={2.2}
            />
            {CATEGORY_LABELS[cat]}
          </motion.button>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export const CatalogPage = () => {
  const router = useRouter();

  const {
    services,
    totalResults,
    isLoading,
    isError,
    refetch,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    durationFilter,
    setDurationFilter,
    sortOption,
    setSortOption,
    hasActiveFilters,
    resetFilters,
    
    // Mới bổ sung
    starFilter,
    setStarFilter,
    featuredFilter,
    setFeaturedFilter,
    promoFilter,
    setPromoFilter,
    priceFilter,
    setPriceFilter,
    customPriceMin,
    customPriceMax,
    setCustomPriceRange,
    selectedVoucherCode,
    setSelectedVoucherCode,
    vouchers,
    customDurationMin,
    customDurationMax,
    setCustomDurationRange,
  } = useCatalog();

  // Bấm "Xem chi tiết" → trang detail gói dịch vụ
  const handleViewDetail = (id: string) => {
    router.push(ROUTES.CUSTOMER.CATALOG_DETAIL(id));
  };

  // Bấm "Đặt ngay" → booking wizard với packageId
  const handleBookNow = (id: string) => {
    router.push(`${ROUTES.CUSTOMER.BOOKING_WIZARD}?serviceId=${encodeURIComponent(id)}`);
  };

  return (
    <div className="min-h-screen bg-background pb-28 md:pb-12">
      {/* Hero */}
      <CatalogHero />

      {/* Search & Filter — sticky */}
      <div className="bg-background">
        <div className="px-4 pt-3 pb-2 space-y-2.5">
          {/* Search bar */}
          <CatalogSearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            durationFilter={durationFilter}
            onDurationChange={setDurationFilter}
            sortOption={sortOption}
            onSortChange={setSortOption}
            
            // Các filter mới
            starFilter={starFilter}
            onStarChange={setStarFilter}
            featuredFilter={featuredFilter}
            onFeaturedChange={setFeaturedFilter}
            promoFilter={promoFilter}
            onPromoChange={setPromoFilter}
            priceFilter={priceFilter}
            onPriceChange={setPriceFilter}

            // Khoảng giá Custom & Voucher thật từ Backend
            customPriceMin={customPriceMin}
            customPriceMax={customPriceMax}
            onCustomPriceRange={setCustomPriceRange}
            selectedVoucherCode={selectedVoucherCode}
            onVoucherCodeChange={setSelectedVoucherCode}
            vouchers={vouchers}

            // Khoảng Thời Lượng Custom (Giống Giá)
            customDurationMin={customDurationMin}
            customDurationMax={customDurationMax}
            onCustomDurationRange={setCustomDurationRange}

            totalResults={totalResults}
            hasActiveFilters={hasActiveFilters}
            onResetFilters={resetFilters}
          />

          {/* Category chips */}
          <CategoryChips selected={categoryFilter} onChange={setCategoryFilter} />
        </div>
      </div>

      {/* Content area */}
      <section className="px-4 pt-5">
        {/* Loading */}
        {isLoading && <ServiceGridSkeleton count={6} />}

        {/* Error */}
        {isError && !isLoading && (
          <CatalogErrorState onRetry={() => refetch()} />
        )}

        {/* Services content */}
        {!isLoading && !isError && services.length > 0 && (
          (searchQuery.trim() !== "" || hasActiveFilters) ? (
            <ServiceListGrid
              services={services}
              onViewDetail={handleViewDetail}
              onBookNow={handleBookNow}
            />
          ) : (
            <div className="space-y-6">
              {/* Nhóm 1: Ưu đãi cực hot */}
              {services.filter(s => s.hasPromo).length > 0 && (
                <ServiceHorizontalScroll
                  title="Ưu đãi cực hot"
                  subtitle="Gói dịch vụ dọn dẹp giá tốt nhất dành riêng cho bạn"
                  icon={Flame}
                  iconColorClass="text-orange-500"
                  services={services.filter(s => s.hasPromo)}
                  onViewDetail={handleViewDetail}
                  onBookNow={handleBookNow}
                />
              )}

              {/* Nhóm 2: Dịch vụ nổi bật */}
              {services.filter(s => s.isPopular).length > 0 && (
                <ServiceHorizontalScroll
                  title="Dịch vụ nổi bật"
                  subtitle="Các gói dịch vụ chất lượng cao được khách hàng tin dùng"
                  icon={Sparkles}
                  iconColorClass="text-amber-500"
                  services={services.filter(s => s.isPopular)}
                  onViewDetail={handleViewDetail}
                  onBookNow={handleBookNow}
                />
              )}

              {/* Nhóm 3: Tất cả dịch vụ */}
              <div className="pt-2">
                <h2 className="text-base font-extrabold text-foreground/90 mb-4 flex items-center gap-1.5 leading-none">
                  <LayoutGrid className="w-4 h-4 shrink-0 text-primary" />
                  Tất cả dịch vụ
                </h2>
                <ServiceListGrid
                  services={services}
                  onViewDetail={handleViewDetail}
                  onBookNow={handleBookNow}
                />
              </div>
            </div>
          )
        )}

        {/* Empty */}
        {!isLoading && !isError && services.length === 0 && (
          <CatalogEmptyState
            searchQuery={searchQuery}
            hasActiveFilters={hasActiveFilters}
            onResetFilters={resetFilters}
          />
        )}
      </section>
    </div>
  );
};
