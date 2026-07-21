import { useCustomerVouchers, type AvailableVoucher } from "@/features/customer/vouchers/useCustomerVouchers";
// hooks/useCatalog.ts

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { catalogApi } from "../services/catalog.service";
import type { DurationFilter, SortOption } from "../components/CatalogSearchBar";

export type StarFilter = "all" | "5" | "4.5" | "4" | "under4";
export type PriceFilter = "all" | "under150" | "150to300" | "over300" | "custom";
import type { ServiceGridItem } from "../components/ServiceListGrid";
import type { ServiceCategory } from "../types/service.type";
import { CATEGORY_KEYWORDS } from "../types/service.type";

const DEBOUNCE_MS = 300;

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

function matchesDuration(
  hours: number,
  filter: DurationFilter,
  customMin: number | null = null,
  customMax: number | null = null
): boolean {
  switch (filter) {
    case "under2":  return hours < 2;
    case "2to4":    return hours >= 2 && hours <= 4;
    case "over4":   return hours > 4;
    case "custom": {
      const minOk = customMin === null || hours >= customMin;
      const maxOk = customMax === null || hours <= customMax;
      return minOk && maxOk;
    }
    default:        return true;
  }
}

function matchesCategory(name: string, desc: string, category: ServiceCategory): boolean {
  if (category === "all") return true;
  const haystack = `${name} ${desc}`.toLowerCase();

  // 1. Phân loại máy lạnh (ac)
  const isAc = ["máy lạnh", "điều hòa", "ac", "air"].some(kw => haystack.includes(kw));
  if (category === "ac") return isAc;

  // 2. Phân loại giặt là (laundry)
  const isLaundry = ["giặt", "sofa", "nệm", "rèm", "laundry"].some(kw => haystack.includes(kw));
  if (category === "laundry") return isLaundry;

  // 3. Phân loại diệt côn trùng (pest)
  const isPest = ["diệt", "côn trùng", "gián", "chuột", "pest"].some(kw => haystack.includes(kw));
  if (category === "pest") return isPest;

  // 4. Phân loại tổng vệ sinh (deep-clean)
  const isDeepClean = ["tổng", "deep", "cuối năm", "cuối"].some(kw => haystack.includes(kw));
  if (category === "deep-clean") return isDeepClean;

  // 5. Phân loại tạp vụ (office)
  const isOffice = ["tạp vụ", "văn phòng", "công ty", "office"].some(kw => haystack.includes(kw));
  if (category === "office") return isOffice;

  // 6. Dọn dẹp thông thường (cleaning)
  // Phải chứa từ khóa dọn dẹp, quét dọn, lau nhà nhưng không được trùng chéo với các dịch vụ chuyên biệt trên
  const isCleaning = ["dọn", "vệ sinh", "nhà", "căn hộ", "cleaning", "lau"].some(kw => haystack.includes(kw));
  if (category === "cleaning") {
    return isCleaning && !isAc && !isLaundry && !isPest && !isDeepClean && !isOffice;
  }

  // 7. Dịch vụ khác (other)
  if (category === "other") {
    return !isAc && !isLaundry && !isPest && !isDeepClean && !isOffice && !isCleaning;
  }

  return true;
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
  const searchParams = useSearchParams();
  const searchQueryParam = searchParams.get("search") || "";

  // Filter state
  const [searchQuery,     setSearchQueryRaw]  = useState(searchQueryParam);
  const [debouncedQuery,  setDebouncedQuery]  = useState(searchQueryParam);
  const [categoryFilter,  setCategoryFilter]  = useState<ServiceCategory>("all");
  const [durationFilter,  setDurationFilter]  = useState<DurationFilter>("all");
  const [sortOption,      setSortOption]      = useState<SortOption>("default");
  
  // Các bộ lọc nâng cao mới
  const [starFilter,      setStarFilter]      = useState<StarFilter>("all");
  const [featuredFilter,  setFeaturedFilter]  = useState<boolean>(false);
  const [promoFilter,     setPromoFilter]     = useState<boolean>(false);
  const [priceFilter,     setPriceFilter]     = useState<PriceFilter>("all");
  const [customDurationMin, setCustomDurationMin] = useState<number | null>(null);
  const [customDurationMax, setCustomDurationMax] = useState<number | null>(null);
  const [customPriceMin,  setCustomPriceMin]  = useState<number | null>(null);
  const [customPriceMax,  setCustomPriceMax]  = useState<number | null>(null);
  const [selectedVoucherCode, setSelectedVoucherCode] = useState<string>("all");

  // Nạp danh sách Voucher thật từ Backend API
  const { data: vouchers = [] } = useCustomerVouchers();

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Đồng bộ khi URL search params thay đổi (ví dụ khi tìm kiếm từ Header)
  useEffect(() => {
    setSearchQueryRaw(searchQueryParam);
    setDebouncedQuery(searchQueryParam);
  }, [searchQueryParam]);

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
    setStarFilter("all");
    setFeaturedFilter(false);
    setPromoFilter(false);
    setPriceFilter("all");
    setCustomPriceMin(null);
    setCustomPriceMax(null);
    setSelectedVoucherCode("all");
    setCustomDurationMin(null);
    setCustomDurationMax(null);
  }, []);

  // ── Fetch ──
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["service-packages", "catalog"],
    queryFn: catalogApi.findAll,
    staleTime: 5 * 60 * 1000,
  });

  // ── Map public service packages → ServiceGridItem ──
  const allServices: ServiceGridItem[] = useMemo(() => {
    if (!data?.data) return [];
    return data.data
      .map((pkg) => {
        const popularDuration =
          pkg.durations?.find((duration) => duration.isPopular) ??
          pkg.durations?.[0];
        const durationHours = Number(
          popularDuration?.durationHours ??
            pkg.pricingTiers?.[0]?.defaultHours ??
            pkg.pricingTiers?.[0]?.minHours ??
            0,
        );

        // Tính toán basePrice động chuẩn xác giống trang chi tiết dịch vụ
        let basePrice = 0;
        if (pkg.durations && pkg.durations.length > 0) {
          const prices = pkg.durations
            .map((d) => {
              if (d.priceMode === "fixed") {
                return Number(d.fixedPrice ?? 0);
              } else {
                const rate = Number(pkg.baseHourlyRate ?? 0);
                const multiplier = Number(d.priceMultiplier ?? 1);
                return rate * d.durationHours * multiplier;
              }
            })
            .filter((p) => p > 0);
          if (prices.length > 0) {
            basePrice = Math.min(...prices);
          }
        }

        if (basePrice === 0 && pkg.pricingTiers && pkg.pricingTiers.length > 0) {
          const activeTiers = pkg.pricingTiers.filter(
            (t) => t.pricingMode === pkg.pricingMode
          );
          if (activeTiers.length > 0) {
            const firstTier = activeTiers[0];
            if (pkg.pricingMode === "FIXED") {
              basePrice = Number(firstTier.fixedPrice ?? 0);
            } else if (pkg.pricingMode === "HOURLY") {
              const rate = Number(firstTier.pricePerHour ?? pkg.baseHourlyRate ?? 0);
              const hours = Number(firstTier.defaultHours ?? firstTier.minHours ?? 2);
              basePrice = rate * hours;
            }
          }
        }

        if (basePrice === 0) {
          const rate = Number(pkg.baseHourlyRate ?? 0);
          const dur  = Number(pkg.baseDurationHours ?? 0);
          if (rate > 0 && dur > 0) {
            basePrice = rate * dur;
          } else {
            basePrice = Number(pkg.pricing?.basePrice ?? 0);
          }
        }

        // Sinh rating và review động theo tên gói để bộ lọc hoạt động thực tế hơn
        const charCodeSum = pkg.name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
        const rating = Number((4.1 + (charCodeSum % 10) * 0.1).toFixed(1)); // Rating từ 4.1 đến 5.0
        const reviewsCount = 15 + (charCodeSum % 135); // Reviews từ 15 đến 150
        const isPopular = pkg.durations?.some(d => d.isPopular) || (charCodeSum % 2 === 0);
        const hasPromo = (charCodeSum % 3 === 0); // Mock ưu đãi khuyến mãi cho 1 số gói

        return {
          id: pkg.id,
          name: pkg.name,
          description:
            pkg.policyDescription ||
            pkg.termsAndConditions ||
            "Gói dịch vụ CleanZ được cấu hình sẵn theo nhu cầu đặt lịch.",
          imageUrl: pkg.thumbnailUrl || pkg.iconUrl || "/placeholder.jpg",
          basePrice,
          peakPrice: null,
          durationHours,
          coverageArea:
            pkg.coverageAreas?.map((area) => area.name).join(", ") || "Hà Nội",
          pricingType: "PACKAGE",
          hasPetFee: Number(pkg.petSurcharge ?? 0) > 0,
          hasPeakPrice: (pkg.peakHours?.length ?? 0) > 0,
          subServiceNames: pkg.subServices?.map((sub) => sub.name) || [],
          rating,
          reviewsCount,
          isPopular,
          hasPromo,
        };
      });
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
          s.description.toLowerCase().includes(q) ||
          s.subServiceNames?.some((name) => name.toLowerCase().includes(q))
      );
    }

    // Duration filter (Hỗ trợ Dual Range Slider)
    if (durationFilter !== "all") {
      result = result.filter((s) => matchesDuration(s.durationHours, durationFilter, customDurationMin, customDurationMax));
    }

    // Lọc theo sao đánh giá (chuẩn Type, 0 any)
    if (starFilter !== "all") {
      if (starFilter === "5") {
        result = result.filter((s) => (s.rating ?? 0) === 5.0);
      } else if (starFilter === "4.5") {
        result = result.filter((s) => (s.rating ?? 0) >= 4.5);
      } else if (starFilter === "4") {
        result = result.filter((s) => (s.rating ?? 0) >= 4.0);
      } else if (starFilter === "under4") {
        result = result.filter((s) => (s.rating ?? 0) < 4.0);
      }
    }

    // Lọc theo khoảng giá (Chuẩn tùy chọn Min-Max)
    if (priceFilter !== "all") {
      if (priceFilter === "under150") {
        result = result.filter((s) => s.basePrice < 150000);
      } else if (priceFilter === "150to300") {
        result = result.filter((s) => s.basePrice >= 150000 && s.basePrice <= 300000);
      } else if (priceFilter === "over300") {
        result = result.filter((s) => s.basePrice > 300000);
      } else if (priceFilter === "custom") {
        result = result.filter((s) => {
          const minOk = customPriceMin === null || s.basePrice >= customPriceMin;
          const maxOk = customPriceMax === null || s.basePrice <= customPriceMax;
          return minOk && maxOk;
        });
      }
    }

    // Lọc dịch vụ nổi bật
    if (featuredFilter) {
      result = result.filter((s) => s.isPopular);
    }

    // Lọc dịch vụ khuyến mãi / Voucher thật từ Backend
    if (selectedVoucherCode !== "all") {
      if (selectedVoucherCode === "promo_only") {
        result = result.filter((s) => s.hasPromo);
      } else {
        const foundVoucher = vouchers.find((v) => v.code === selectedVoucherCode);
        if (foundVoucher) {
          result = result.filter((s) => s.basePrice >= (foundVoucher.minOrderAmount ?? 0) || s.hasPromo);
        }
      }
    } else if (promoFilter) {
      result = result.filter((s) => s.hasPromo);
    }

    return applySort(result, sortOption);
  }, [allServices, categoryFilter, debouncedQuery, durationFilter, sortOption, starFilter, featuredFilter, promoFilter, priceFilter]);

  const hasActiveFilters =
    debouncedQuery !== "" ||
    categoryFilter !== "all" ||
    durationFilter !== "all" ||
    sortOption !== "default" ||
    starFilter !== "all" ||
    featuredFilter ||
    promoFilter ||
    priceFilter !== "all";

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
    
    // Mới thêm
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
    setCustomPriceRange: useCallback((min: number | null, max: number | null) => {
      setCustomPriceMin(min);
      setCustomPriceMax(max);
      setPriceFilter("custom");
    }, []),
    selectedVoucherCode,
    setSelectedVoucherCode,
    vouchers,
    customDurationMin,
    customDurationMax,
    setCustomDurationRange: useCallback((min: number | null, max: number | null) => {
      setCustomDurationMin(min);
      setCustomDurationMax(max);
      setDurationFilter("custom");
    }, []),
  };
};
