"use client";

import { Search, X, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export type DurationFilter = "all" | "under2" | "2to4" | "over4";
export type SortOption = "default" | "price-asc" | "price-desc" | "duration-asc";

interface CatalogSearchBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  durationFilter: DurationFilter;
  onDurationChange: (value: DurationFilter) => void;
  sortOption: SortOption;
  onSortChange: (value: SortOption) => void;
  totalResults: number;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
}

const DURATION_OPTIONS: { value: DurationFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "under2", label: "< 2 giờ" },
  { value: "2to4", label: "2 – 4 giờ" },
  { value: "over4", label: "> 4 giờ" },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "default", label: "Mặc định" },
  { value: "price-asc", label: "Giá tăng dần" },
  { value: "price-desc", label: "Giá giảm dần" },
  { value: "duration-asc", label: "Thời lượng" },
];

export const CatalogSearchBar = ({
  searchQuery,
  onSearchChange,
  durationFilter,
  onDurationChange,
  sortOption,
  onSortChange,
  totalResults,
  hasActiveFilters,
  onResetFilters,
}: CatalogSearchBarProps) => {
  return (
    <div className="sticky top-0 z-30 px-4 py-3 bg-background/90 backdrop-blur-xl border-b border-border/40">
      {/* Search input */}
      <div className="relative mb-3">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70 pointer-events-none"
          aria-hidden="true"
        />
        <input
          id="catalog-search"
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Tìm gói dịch vụ..."
          className={cn(
            "w-full h-10 pl-9 pr-9 rounded-xl text-sm",
            "bg-muted/50 border border-border/40",
            "text-foreground placeholder:text-muted-foreground/50",
            "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50",
            "transition-all duration-200"
          )}
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
            aria-label="Xóa tìm kiếm"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-0.5">
        {/* Duration filter chips */}
        <div className="flex items-center gap-1.5 shrink-0">
          {DURATION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onDurationChange(opt.value)}
              className={cn(
                "h-7 px-3 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all duration-200",
                durationFilter === opt.value
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-border/60 shrink-0 mx-1" aria-hidden="true" />

        {/* Sort select */}
        <div className="relative shrink-0">
          <SlidersHorizontal
            className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/70 pointer-events-none"
            aria-hidden="true"
          />
          <select
            id="catalog-sort"
            value={sortOption}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className={cn(
              "h-7 pl-7 pr-2 rounded-lg text-[11px] font-semibold",
              "bg-muted/60 border-0 text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-primary/30",
              "cursor-pointer appearance-none transition-all"
            )}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Reset button */}
        {hasActiveFilters && (
          <button
            onClick={onResetFilters}
            className="shrink-0 h-7 px-2.5 rounded-lg text-[11px] font-semibold text-rose-500 hover:bg-rose-500/10 transition-all duration-200 whitespace-nowrap ml-auto"
          >
            Đặt lại
          </button>
        )}
      </div>

      {/* Result count */}
      <p className="mt-2 text-xs text-muted-foreground/70">
        {hasActiveFilters ? (
          <>
            <span className="text-primary font-semibold">{totalResults}</span>{" "}
            kết quả
            {searchQuery && (
              <>
                {" "}cho{" "}
                <span className="font-medium text-foreground/80">
                  &ldquo;{searchQuery}&rdquo;
                </span>
              </>
            )}
          </>
        ) : (
          <>
            <span className="font-semibold">{totalResults}</span> gói dịch vụ
          </>
        )}
      </p>
    </div>
  );
};
