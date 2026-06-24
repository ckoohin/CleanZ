// hooks/useCatalog.ts

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useCallback, useRef } from "react";
import { catalogApi } from "../services/catalog.service";
import type { DurationFilter, SortOption } from "../components/CatalogSearchBar";
import type { ServiceGridItem } from "../components/ServiceListGrid";
import type { ServiceCategory } from "../types/service.type";
import { CATEGORY_KEYWORDS } from "../types/service.type";

const DEBOUNCE_MS = 300;

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

function matchesDuration(hours: number, filter: DurationFilter): boolean {
  switch (filter) {
    case "under2":  return hours < 2;
    case "2to4":    return hours >= 2 && hours <= 4;
    case "over4":   return hours > 4;
    default:        return true;
  }
}

function matchesCategory(name: string, desc: string, category: ServiceCategory): boolean {
  if (category === "all") return true;
  const keywords = CATEGORY_KEYWORDS[category];
  if (!keywords.length) return true; // "other" — fallback
  const haystack = `${name} ${desc}`.toLowerCase();
  return keywords.some((kw) => haystack.includes(kw));
}

function applySort(items: ServiceGridItem[], sort: SortOption): ServiceGridItem[] {
  const copy = [...items];
  switch (sort) {
    case "price-asc":     return copy.sort((a, b) => a.basePrice - b.basePrice);
    case "price-desc":    return copy.sort((a, b) => b.basePrice - a.basePrice);
    case "duration-asc":  return copy.sort((a, b) => a.durationHours - b.durationHours);
    default:              return copy;
  }
}

// ──────────────────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────────────────

export const useCatalog = () => {
  // Filter state
  const [searchQuery,     setSearchQueryRaw]  = useState("");
  const [debouncedQuery,  setDebouncedQuery]  = useState("");
  const [categoryFilter,  setCategoryFilter]  = useState<ServiceCategory>("all");
  const [durationFilter,  setDurationFilter]  = useState<DurationFilter>("all");
  const [sortOption,      setSortOption]      = useState<SortOption>("default");

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setSearchQuery = useCallback((value: string) => {
    setSearchQueryRaw(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedQuery(value.trim());
    }, DEBOUNCE_MS);
  }, []);

  const resetFilters = useCallback(() => {
    setSearchQueryRaw("");
    setDebouncedQuery("");
    setCategoryFilter("all");
    setDurationFilter("all");
    setSortOption("default");
  }, []);

  // ── Fetch ──
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["sub-services"],
    queryFn: catalogApi.findAll,
    staleTime: 5 * 60 * 1000,
  });

  // ── Map raw API → ServiceGridItem ──
  const allServices: ServiceGridItem[] = useMemo(() => {
    if (!data?.items) return [];
    return data.items
      .filter((s) => s.isActive)
      .map((s) => ({
        id: s.id,
        name: s.name,
        description: s.shortDescription || s.description || "Chưa có mô tả",
        imageUrl: s.thumbnailUrl,
        basePrice:    Number(s.pricingConfig?.basePrice ?? 0),
        peakPrice:    s.pricingConfig?.peakPrice ? Number(s.pricingConfig.peakPrice) : null,
        durationHours: Number(s.durationHours),
        coverageArea: s.coverageArea || "Hà Nội",
        pricingType: s.pricingType,
        hasPetFee:   s.pricingConfig !== null && Number(s.pricingConfig.petFee) > 0,
        hasPeakPrice: s.pricingConfig !== null && s.pricingConfig.peakPrice !== null,
      }));
  }, [data]);

  // ── Apply filters ──
  const filteredServices: ServiceGridItem[] = useMemo(() => {
    let result = allServices;

    // Category filter
    if (categoryFilter !== "all") {
      result = result.filter((s) => matchesCategory(s.name, s.description, categoryFilter));
    }

    // Search filter
    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q)
      );
    }

    // Duration filter
    if (durationFilter !== "all") {
      result = result.filter((s) => matchesDuration(s.durationHours, durationFilter));
    }

    return applySort(result, sortOption);
  }, [allServices, categoryFilter, debouncedQuery, durationFilter, sortOption]);

  const hasActiveFilters =
    debouncedQuery !== "" ||
    categoryFilter !== "all" ||
    durationFilter !== "all" ||
    sortOption !== "default";

  return {
    // Data
    services: filteredServices,
    allServices,
    totalResults: filteredServices.length,
    isLoading,
    isError,
    refetch,

    // Filter state
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
  };
};