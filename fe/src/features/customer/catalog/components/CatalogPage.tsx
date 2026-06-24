"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Sparkles, Wind, Home, Shirt, Bug, Briefcase,
  LayoutGrid, LucideIcon,
} from "lucide-react";
import { useCatalog } from "../hooks/useCatalog";
import { CatalogHero } from "./CatalogHero";
import { CatalogSearchBar } from "./CatalogSearchBar";
import { ServiceListGrid } from "./ServiceListGrid";
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
  } = useCatalog();

  // Bấm card → vào trang chi tiết, không phải vào booking wizard ngay
  const handleSelectService = (id: string) => {
    router.push(`${ROUTES.CUSTOMER.CATALOG}/${id}`);
  };

  return (
    <div className="min-h-screen bg-background pb-28 md:pb-12">
      {/* Hero */}
      <CatalogHero />

      {/* Search & Filter — sticky */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border/30 shadow-sm">
        <div className="px-4 pt-3 pb-2 space-y-2.5">
          {/* Search bar */}
          <CatalogSearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            durationFilter={durationFilter}
            onDurationChange={setDurationFilter}
            sortOption={sortOption}
            onSortChange={setSortOption}
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

        {/* Services grid */}
        {!isLoading && !isError && services.length > 0 && (
          <ServiceListGrid
            services={services}
            onSelectService={handleSelectService}
          />
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
