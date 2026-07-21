"use client";

import { useState, useRef, useEffect, type ElementType } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, X, SlidersHorizontal, Star, Flame, Tag, Check, ArrowUpDown, ChevronDown, DollarSign, Clock3
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { StarFilter, PriceFilter } from "../hooks/useCatalog";
import type { AvailableVoucher } from "@/features/customer/vouchers/useCustomerVouchers";

export type DurationFilter = "all" | "under2" | "2to4" | "over4" | "custom";
export type SortOption = "default" | "price-asc" | "price-desc" | "duration-asc";

interface CatalogSearchBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  durationFilter: DurationFilter;
  onDurationChange: (value: DurationFilter) => void;
  sortOption: SortOption;
  onSortChange: (value: SortOption) => void;
  
  // Các bộ lọc nâng cao
  starFilter: StarFilter;
  onStarChange: (value: StarFilter) => void;
  featuredFilter: boolean;
  onFeaturedChange: (value: boolean) => void;
  promoFilter: boolean;
  onPromoChange: (value: boolean) => void;
  priceFilter: PriceFilter;
  onPriceChange: (value: PriceFilter) => void;

  // Khoảng giá Custom & Voucher thật từ Backend
  customPriceMin: number | null;
  customPriceMax: number | null;
  onCustomPriceRange: (min: number | null, max: number | null) => void;
  selectedVoucherCode: string;
  onVoucherCodeChange: (code: string) => void;
  vouchers: AvailableVoucher[];

  // Khoảng Thời Lượng Custom (Giống hệt Bộ Lọc Giá)
  customDurationMin: number | null;
  customDurationMax: number | null;
  onCustomDurationRange: (min: number | null, max: number | null) => void;

  totalResults: number;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
}

const DURATION_OPTIONS: { value: DurationFilter; label: string }[] = [
  { value: "all", label: "Tất cả thời lượng" },
  { value: "under2", label: "Dưới 2 giờ" },
  { value: "2to4", label: "Từ 2 - 4 giờ" },
  { value: "over4", label: "Trên 4 giờ" },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "default", label: "Sắp xếp mặc định" },
  { value: "price-asc", label: "Giá thấp đến cao" },
  { value: "price-desc", label: "Giá cao đến thấp" },
  { value: "duration-asc", label: "Thời lượng tăng dần" },
];

const STAR_OPTIONS: { value: StarFilter; label: string }[] = [
  { value: "all", label: "Tất cả đánh giá" },
  { value: "5", label: "Đúng 5.0 sao (Hoàn hảo)" },
  { value: "4.5", label: "Từ 4.5 sao trở lên" },
  { value: "4", label: "Từ 4.0 sao trở lên" },
  { value: "under4", label: "Dưới 4.0 sao" },
];

const PRICE_OPTIONS: { value: PriceFilter; label: string }[] = [
  { value: "all", label: "Tất cả mức giá" },
  { value: "under150", label: "Dưới 150.000đ" },
  { value: "150to300", label: "150.000đ - 300.000đ" },
  { value: "over300", label: "Trên 300.000đ" },
];

interface CustomDropdownProps<T extends string> {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (val: T) => void;
  icon: ElementType;
  activeColorClass?: string;
  isStarDropdown?: boolean;
  align?: "left" | "right";
}

// Component Custom Dropdown chuẩn Generics TypeScript
function CustomDropdown<T extends string>({
  label,
  options,
  value,
  onChange,
  icon: Icon,
  activeColorClass,
  isStarDropdown = false,
  align = "left",
}: CustomDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];
  const isFiltered = value !== "all" && value !== "default";

  return (
    <div className="relative" ref={containerRef}>
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-8 px-3 rounded-xl text-xs font-bold border transition-all duration-200 flex items-center gap-1.5 shadow-xs select-none",
          isFiltered
            ? (activeColorClass || "bg-primary/10 border-primary/30 text-primary")
            : "bg-card border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
        )}
      >
        <Icon className={cn("w-3.5 h-3.5", isStarDropdown && isFiltered ? "fill-amber-400 text-amber-400" : "")} />
        <span>{selectedOption.label}</span>
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200 text-muted-foreground/80", isOpen ? "transform rotate-180" : "")} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={cn(
              "absolute z-40 top-full mt-1.5 min-w-[210px] bg-card border border-border/40 rounded-2xl shadow-xl p-1.5 space-y-0.5",
              align === "right" ? "right-0" : "left-0"
            )}
          >
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full h-8.5 px-3 rounded-xl text-xs font-bold text-left flex items-center justify-between transition-colors",
                    isSelected
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    {isStarDropdown && opt.value !== "all" && <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />}
                    {opt.label}
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Component 1: Shadcn Dual Range Slider GIÁ (0đ đến 5 triệu) ───
function ShadcnDualRangeSlider({
  customMin,
  customMax,
  onApplyCustom,
}: {
  customMin: number | null;
  customMax: number | null;
  onApplyCustom: (min: number | null, max: number | null) => void;
}) {
  const MAX_LIMIT = 5000000; // 5 Triệu
  const MIN_LIMIT = 0;
  const STEP = 50000; // 50k

  const [minVal, setMinVal] = useState<number>(customMin ?? MIN_LIMIT);
  const [maxVal, setMaxVal] = useState<number>(customMax ?? MAX_LIMIT);

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.min(Number(e.target.value), maxVal - STEP);
    setMinVal(value);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(Number(e.target.value), minVal + STEP);
    setMaxVal(value);
  };

  const minPercent = (minVal / MAX_LIMIT) * 100;
  const maxPercent = (maxVal / MAX_LIMIT) * 100;
  const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

  return (
    <div className="space-y-3 p-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Khoảng giá lọc</span>
        <span className="text-xs font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
          {fmt(minVal)}đ — {maxVal >= MAX_LIMIT ? "5.000.000đ+" : `${fmt(maxVal)}đ`}
        </span>
      </div>

      <div className="relative w-full h-6 flex items-center justify-center select-none py-2">
        <div className="absolute w-full h-2 rounded-full bg-muted border border-border/40" />
        <div
          className="absolute h-2 rounded-full bg-gradient-to-r from-primary/80 to-primary shadow-xs"
          style={{ left: `${minPercent}%`, width: `${maxPercent - minPercent}%` }}
        />

        <input
          type="range"
          min={MIN_LIMIT}
          max={MAX_LIMIT}
          step={STEP}
          value={minVal}
          onChange={handleMinChange}
          className="absolute w-full h-2 opacity-0 cursor-pointer pointer-events-auto z-20"
        />
        <input
          type="range"
          min={MIN_LIMIT}
          max={MAX_LIMIT}
          step={STEP}
          value={maxVal}
          onChange={handleMaxChange}
          className="absolute w-full h-2 opacity-0 cursor-pointer pointer-events-auto z-20"
        />

        <div
          className="absolute w-4 h-4 rounded-full bg-card border-2 border-primary shadow-md pointer-events-none z-10 transition-transform hover:scale-110"
          style={{ left: `calc(${minPercent}% - 8px)` }}
        />
        <div
          className="absolute w-4 h-4 rounded-full bg-card border-2 border-primary shadow-md pointer-events-none z-10 transition-transform hover:scale-110"
          style={{ left: `calc(${maxPercent}% - 8px)` }}
        />
      </div>

      <div className="space-y-1.5 pt-1">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Hoặc nhập số tiền tùy chọn:</span>
        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">Từ</span>
            <input
              type="number"
              value={minVal === 0 ? "" : minVal}
              onChange={(e) => setMinVal(Number(e.target.value))}
              placeholder="0"
              className="w-full h-8 pl-7 pr-2 rounded-xl text-xs font-bold bg-muted/40 border border-border/50 text-foreground focus:outline-none focus:border-primary"
            />
          </div>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">Đến</span>
            <input
              type="number"
              value={maxVal === MAX_LIMIT ? "" : maxVal}
              onChange={(e) => setMaxVal(Number(e.target.value))}
              placeholder="5.000.000"
              className="w-full h-8 pl-8 pr-2 rounded-xl text-xs font-bold bg-muted/40 border border-border/50 text-foreground focus:outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>

      <button
        onClick={() => onApplyCustom(minVal === 0 ? null : minVal, maxVal >= MAX_LIMIT ? null : maxVal)}
        className="w-full h-8 bg-primary text-primary-foreground font-bold text-xs rounded-xl hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
      >
        Áp dụng khoảng giá ({fmt(minVal)}đ - {maxVal >= MAX_LIMIT ? "5M+" : `${fmt(maxVal)}đ`})
      </button>
    </div>
  );
}

// ─── Component 2: Shadcn Dual Range Slider THỜI LƯỢNG (1h đến 12h - GIỐNG HỆT GIÁ) ───
function ShadcnDurationDualSlider({
  customMin,
  customMax,
  onApplyCustom,
}: {
  customMin: number | null;
  customMax: number | null;
  onApplyCustom: (min: number | null, max: number | null) => void;
}) {
  const MAX_HOURS = 12;
  const MIN_HOURS = 1;

  const [minVal, setMinVal] = useState<number>(customMin ?? MIN_HOURS);
  const [maxVal, setMaxVal] = useState<number>(customMax ?? MAX_HOURS);

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.min(Number(e.target.value), maxVal - 1);
    setMinVal(value);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(Number(e.target.value), minVal + 1);
    setMaxVal(value);
  };

  const minPercent = ((minVal - MIN_HOURS) / (MAX_HOURS - MIN_HOURS)) * 100;
  const maxPercent = ((maxVal - MIN_HOURS) / (MAX_HOURS - MIN_HOURS)) * 100;

  return (
    <div className="space-y-3 p-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Khoảng thời lượng</span>
        <span className="text-xs font-black text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
          {minVal} giờ — {maxVal >= MAX_HOURS ? "12 giờ+" : `${maxVal} giờ`}
        </span>
      </div>

      <div className="relative w-full h-6 flex items-center justify-center select-none py-2">
        <div className="absolute w-full h-2 rounded-full bg-muted border border-border/40" />
        <div
          className="absolute h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 shadow-xs"
          style={{ left: `${minPercent}%`, width: `${maxPercent - minPercent}%` }}
        />

        <input
          type="range"
          min={MIN_HOURS}
          max={MAX_HOURS}
          step={1}
          value={minVal}
          onChange={handleMinChange}
          className="absolute w-full h-2 opacity-0 cursor-pointer pointer-events-auto z-20"
        />
        <input
          type="range"
          min={MIN_HOURS}
          max={MAX_HOURS}
          step={1}
          value={maxVal}
          onChange={handleMaxChange}
          className="absolute w-full h-2 opacity-0 cursor-pointer pointer-events-auto z-20"
        />

        <div
          className="absolute w-4 h-4 rounded-full bg-card border-2 border-blue-500 shadow-md pointer-events-none z-10 transition-transform hover:scale-110"
          style={{ left: `calc(${minPercent}% - 8px)` }}
        />
        <div
          className="absolute w-4 h-4 rounded-full bg-card border-2 border-blue-500 shadow-md pointer-events-none z-10 transition-transform hover:scale-110"
          style={{ left: `calc(${maxPercent}% - 8px)` }}
        />
      </div>

      <div className="space-y-1.5 pt-1">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Hoặc nhập số giờ tùy chọn:</span>
        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">Từ</span>
            <input
              type="number"
              value={minVal}
              onChange={(e) => setMinVal(Number(e.target.value))}
              placeholder="1"
              className="w-full h-8 pl-7 pr-2 rounded-xl text-xs font-bold bg-muted/40 border border-border/50 text-foreground focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">Đến</span>
            <input
              type="number"
              value={maxVal}
              onChange={(e) => setMaxVal(Number(e.target.value))}
              placeholder="12"
              className="w-full h-8 pl-8 pr-2 rounded-xl text-xs font-bold bg-muted/40 border border-border/50 text-foreground focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      <button
        onClick={() => onApplyCustom(minVal <= MIN_HOURS ? null : minVal, maxVal >= MAX_HOURS ? null : maxVal)}
        className="w-full h-8 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/20"
      >
        Áp dụng thời lượng ({minVal}h - {maxVal >= MAX_HOURS ? "12h+" : `${maxVal}h`})
      </button>
    </div>
  );
}

// Component Dropdown Giá
function PriceCustomDropdown({
  priceFilter,
  onPriceChange,
  customMin,
  customMax,
  onApplyCustom,
}: {
  priceFilter: PriceFilter;
  onPriceChange: (val: PriceFilter) => void;
  customMin: number | null;
  customMax: number | null;
  onApplyCustom: (min: number | null, max: number | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  let labelText = "Tất cả mức giá";
  if (priceFilter === "under150") labelText = "Dưới 150.000đ";
  else if (priceFilter === "150to300") labelText = "150k - 300k";
  else if (priceFilter === "over300") labelText = "Trên 300.000đ";
  else if (priceFilter === "custom") {
    if (customMin && customMax) labelText = `${customMin/1000}k - ${customMax/1000}k`;
    else if (customMin) labelText = `Từ ${customMin/1000}k`;
    else if (customMax) labelText = `Đến ${customMax/1000}k`;
    else labelText = "Giá tự chọn";
  }

  const isFiltered = priceFilter !== "all";

  return (
    <div className="relative" ref={ref}>
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-8 px-3 rounded-xl text-xs font-bold border transition-all duration-200 flex items-center gap-1.5 shadow-xs select-none",
          isFiltered
            ? "bg-primary/10 border-primary/30 text-primary"
            : "bg-card border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
        )}
      >
        <DollarSign className="w-3.5 h-3.5" />
        <span>{labelText}</span>
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200 text-muted-foreground/80", isOpen ? "transform rotate-180" : "")} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="absolute z-40 top-full left-0 mt-1.5 min-w-[280px] bg-card border border-border/40 rounded-2xl shadow-xl p-2 space-y-1.5"
          >
            {PRICE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onPriceChange(opt.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full h-8 px-3 rounded-xl text-xs font-bold text-left flex items-center justify-between transition-colors",
                  priceFilter === opt.value
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                )}
              >
                <span>{opt.label}</span>
                {priceFilter === opt.value && <Check className="w-3.5 h-3.5 text-primary" />}
              </button>
            ))}

            <div className="pt-2 border-t border-border/40">
              <ShadcnDualRangeSlider
                key={`price-${customMin}-${customMax}`}
                customMin={customMin}
                customMax={customMax}
                onApplyCustom={(min, max) => {
                  onApplyCustom(min, max);
                  setIsOpen(false);
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Component Dropdown Thời Lượng (Giống hệt Giá)
function DurationCustomDropdown({
  durationFilter,
  onDurationChange,
  customMin,
  customMax,
  onApplyCustom,
}: {
  durationFilter: DurationFilter;
  onDurationChange: (val: DurationFilter) => void;
  customMin: number | null;
  customMax: number | null;
  onApplyCustom: (min: number | null, max: number | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  let labelText = "Tất cả thời lượng";
  if (durationFilter === "under2") labelText = "Dưới 2 giờ";
  else if (durationFilter === "2to4") labelText = "Từ 2 - 4 giờ";
  else if (durationFilter === "over4") labelText = "Trên 4 giờ";
  else if (durationFilter === "custom") {
    if (customMin && customMax) labelText = `${customMin}h - ${customMax}h`;
    else if (customMin) labelText = `Từ ${customMin}h`;
    else if (customMax) labelText = `Đến ${customMax}h`;
    else labelText = "Giờ tự chọn";
  }

  const isFiltered = durationFilter !== "all";

  return (
    <div className="relative" ref={ref}>
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-8 px-3 rounded-xl text-xs font-bold border transition-all duration-200 flex items-center gap-1.5 shadow-xs select-none",
          isFiltered
            ? "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400"
            : "bg-card border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
        )}
      >
        <Clock3 className="w-3.5 h-3.5" />
        <span>{labelText}</span>
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200 text-muted-foreground/80", isOpen ? "transform rotate-180" : "")} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="absolute z-40 top-full left-0 mt-1.5 min-w-[280px] bg-card border border-border/40 rounded-2xl shadow-xl p-2 space-y-1.5"
          >
            {DURATION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onDurationChange(opt.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full h-8 px-3 rounded-xl text-xs font-bold text-left flex items-center justify-between transition-colors",
                  durationFilter === opt.value
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                )}
              >
                <span>{opt.label}</span>
                {durationFilter === opt.value && <Check className="w-3.5 h-3.5 text-blue-500" />}
              </button>
            ))}

            <div className="pt-2 border-t border-border/40">
              <ShadcnDurationDualSlider
                key={`duration-${customMin}-${customMax}`}
                customMin={customMin}
                customMax={customMax}
                onApplyCustom={(min, max) => {
                  onApplyCustom(min, max);
                  setIsOpen(false);
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Component Dropdown Voucher
function VoucherCustomDropdown({
  selectedVoucherCode,
  onVoucherCodeChange,
  vouchers,
  promoFilter,
  onPromoChange,
}: {
  selectedVoucherCode: string;
  onVoucherCodeChange: (code: string) => void;
  vouchers: AvailableVoucher[];
  promoFilter: boolean;
  onPromoChange: (val: boolean) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedVoucher = vouchers.find((v) => v.code === selectedVoucherCode);
  let labelText = "Khuyến mãi";
  if (selectedVoucherCode === "promo_only" || promoFilter) {
    labelText = "Ưu đãi hạ giá";
  } else if (selectedVoucher) {
    labelText = `Mã ${selectedVoucher.code}`;
  }

  const isFiltered = selectedVoucherCode !== "all" || promoFilter;

  return (
    <div className="relative" ref={ref}>
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-8 px-3 rounded-xl text-xs font-bold border transition-all duration-200 flex items-center gap-1.5 shadow-xs select-none",
          isFiltered
            ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
            : "bg-card border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
        )}
      >
        <Tag className="w-3.5 h-3.5" />
        <span>{labelText}</span>
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200 text-muted-foreground/80", isOpen ? "transform rotate-180" : "")} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="absolute z-40 top-full left-0 mt-1.5 min-w-[250px] bg-card border border-border/40 rounded-2xl shadow-xl p-2 space-y-1"
          >
            <button
              onClick={() => {
                onVoucherCodeChange("all");
                onPromoChange(false);
                setIsOpen(false);
              }}
              className={cn(
                "w-full h-8 px-3 rounded-xl text-xs font-bold text-left flex items-center justify-between transition-colors",
                selectedVoucherCode === "all" && !promoFilter
                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              )}
            >
              <span>Tất cả khuyến mãi</span>
              {selectedVoucherCode === "all" && !promoFilter && <Check className="w-3.5 h-3.5 text-rose-500" />}
            </button>

            <button
              onClick={() => {
                onVoucherCodeChange("promo_only");
                onPromoChange(true);
                setIsOpen(false);
              }}
              className={cn(
                "w-full h-8 px-3 rounded-xl text-xs font-bold text-left flex items-center justify-between transition-colors",
                (selectedVoucherCode === "promo_only" || promoFilter)
                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              )}
            >
              <span>Gói dịch vụ đang hạ giá</span>
              {(selectedVoucherCode === "promo_only" || promoFilter) && <Check className="w-3.5 h-3.5 text-rose-500" />}
            </button>

            {vouchers.length > 0 && (
              <div className="pt-2 border-t border-border/40 space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2">Voucher đang hoạt động (${vouchers.length})</p>
                {vouchers.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      onVoucherCodeChange(v.code);
                      onPromoChange(false);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full p-2 rounded-xl text-xs font-bold text-left flex items-center justify-between transition-colors border",
                      selectedVoucherCode === v.code
                        ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                        : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    )}
                  >
                    <div className="flex flex-col">
                      <span className="font-extrabold text-foreground">{v.code}</span>
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {v.type === "PERCENT" ? `Giảm ${v.value}%` : `Giảm ${v.value.toLocaleString("vi-VN")}đ`}
                        {v.minOrderAmount > 0 && ` • Đơn từ ${v.minOrderAmount / 1000}k`}
                      </span>
                    </div>
                    {selectedVoucherCode === v.code && <Check className="w-4 h-4 text-rose-500 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const CatalogSearchBar = ({
  searchQuery,
  onSearchChange,
  durationFilter,
  onDurationChange,
  sortOption,
  onSortChange,
  starFilter,
  onStarChange,
  featuredFilter,
  onFeaturedChange,
  promoFilter,
  onPromoChange,
  priceFilter,
  onPriceChange,
  customPriceMin,
  customPriceMax,
  onCustomPriceRange,
  selectedVoucherCode,
  onVoucherCodeChange,
  vouchers,
  customDurationMin,
  customDurationMax,
  onCustomDurationRange,
  totalResults,
  hasActiveFilters,
  onResetFilters,
}: CatalogSearchBarProps) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  let activeFilterCount = 0;
  if (durationFilter !== "all") activeFilterCount++;
  if (starFilter !== "all") activeFilterCount++;
  if (priceFilter !== "all") activeFilterCount++;
  if (featuredFilter) activeFilterCount++;
  if (promoFilter || selectedVoucherCode !== "all") activeFilterCount++;

  return (
    <div className="w-full space-y-3">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
        <input
          id="catalog-search"
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Tìm kiếm dịch vụ dọn dẹp, máy lạnh, côn trùng..."
          className={cn(
            "w-full h-11 pl-10 pr-10 rounded-2xl text-sm transition-all duration-200",
            "bg-muted/40 border border-border/40",
            "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50",
            "placeholder:text-muted-foreground/50 text-foreground"
          )}
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted text-muted-foreground/60 hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Desktop Filters (hidden lg:flex) ── */}
      <div className="hidden lg:flex items-center gap-2.5 flex-wrap">
        {/* Nút lọc nổi bật */}
        <button
          onClick={() => onFeaturedChange(!featuredFilter)}
          className={cn(
            "h-8 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border select-none",
            featuredFilter
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-sm"
              : "bg-card border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
          )}
        >
          <Flame className="w-3.5 h-3.5" />
          Nổi bật
        </button>

        {/* Dropdown Lọc Voucher & Khuyến mãi thật từ Backend */}
        <VoucherCustomDropdown
          selectedVoucherCode={selectedVoucherCode}
          onVoucherCodeChange={onVoucherCodeChange}
          vouchers={vouchers}
          promoFilter={promoFilter}
          onPromoChange={onPromoChange}
        />

        {/* Custom Dropdown Đánh giá sao */}
        <CustomDropdown
          label="Đánh giá sao"
          options={STAR_OPTIONS}
          value={starFilter}
          onChange={onStarChange}
          icon={Star}
          isStarDropdown
          activeColorClass="bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
        />

        {/* Custom Dropdown Lọc Giá linh hoạt Min-Max (Shadcn Slider 0-5M) */}
        <PriceCustomDropdown
          priceFilter={priceFilter}
          onPriceChange={onPriceChange}
          customMin={customPriceMin}
          customMax={customPriceMax}
          onApplyCustom={onCustomPriceRange}
        />

        {/* Custom Dropdown Thời Lượng (Shadcn Slider 1-12h GIỐNG HỆT GIÁ) */}
        <DurationCustomDropdown
          durationFilter={durationFilter}
          onDurationChange={onDurationChange}
          customMin={customDurationMin}
          customMax={customDurationMax}
          onApplyCustom={onCustomDurationRange}
        />

        {/* Custom Dropdown Sắp xếp */}
        <div className="ml-auto">
          <CustomDropdown
            label="Sắp xếp"
            options={SORT_OPTIONS}
            value={sortOption}
            onChange={onSortChange}
            icon={SlidersHorizontal}
          />
        </div>

        {/* Reset button */}
        {hasActiveFilters && (
          <button
            onClick={onResetFilters}
            className="h-8 px-3 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-colors border border-transparent"
          >
            Đặt lại bộ lọc
          </button>
        )}
      </div>

      {/* ── Mobile Filters Trigger (lg:hidden) ── */}
      <div className="flex lg:hidden items-center justify-between gap-2.5 w-full">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsDrawerOpen(true)}
          className={cn(
            "flex-1 h-9 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all",
            activeFilterCount > 0
              ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/25"
              : "bg-card border-border/60 text-foreground hover:border-border"
          )}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Bộ lọc dịch vụ</span>
          {activeFilterCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-white text-primary text-[10px] font-black flex items-center justify-center shrink-0">
              {activeFilterCount}
            </span>
          )}
        </motion.button>

        <div className="shrink-0">
          <CustomDropdown
            label="Sắp xếp"
            options={SORT_OPTIONS}
            value={sortOption}
            onChange={onSortChange}
            icon={ArrowUpDown}
            align="right"
          />
        </div>

        {hasActiveFilters && (
          <button
            onClick={onResetFilters}
            className="h-9 px-2 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 shrink-0"
          >
            Xóa
          </button>
        )}
      </div>

      {/* Result count */}
      <p className="text-xs text-muted-foreground/60 select-none">
        {hasActiveFilters ? (
          <>
            Đang hiển thị <span className="text-primary font-bold">{totalResults}</span> kết quả phù hợp
          </>
        ) : (
          <>
            Có <span className="font-bold text-foreground/80">{totalResults}</span> gói dịch vụ CleanZ khả dụng
          </>
        )}
      </p>

      {/* ── Mobile Bottom Sheet Filter Drawer (Tối Ưu 100% Premium Shadcn UI) ── */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
            />

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 240 }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-[32px] bg-card border-t border-border/40 shadow-2xl lg:hidden h-[85vh] flex flex-col overflow-hidden"
            >
              <div className="w-12 h-1.5 bg-muted rounded-full mx-auto my-3 shrink-0" />

              {/* Header Sheet */}
              <div className="flex items-center justify-between px-6 pb-4 border-b border-border/30 shrink-0">
                <div>
                  <h3 className="text-base md:text-lg font-black text-foreground">Bộ lọc nâng cao</h3>
                  <p className="text-[10px] md:text-xs text-muted-foreground">Tùy chỉnh khoảng giá & thời lượng mượt mà</p>
                </div>
                <div className="flex items-center gap-2">
                  {hasActiveFilters && (
                    <button
                      onClick={onResetFilters}
                      className="text-xs font-bold text-rose-500 hover:underline px-2 py-1"
                    >
                      Đặt lại
                    </button>
                  )}
                  <button
                    onClick={() => setIsDrawerOpen(false)}
                    className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground/80 hover:text-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Body Content */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                {/* 1. Ngân sách dịch vụ (Shadcn Dual Range Slider 0-5M) */}
                <div className="space-y-3 bg-muted/20 border border-border/40 rounded-2xl p-3.5">
                  <ShadcnDualRangeSlider
                    customMin={customPriceMin}
                    customMax={customPriceMax}
                    onApplyCustom={(min: number | null, max: number | null) => {
                      onCustomPriceRange(min, max);
                    }}
                  />
                </div>

                {/* 2. Thời lượng công việc (Shadcn Dual Range Slider 1-12h GIỐNG HỆT GIÁ) */}
                <div className="space-y-3 bg-muted/20 border border-border/40 rounded-2xl p-3.5">
                  <ShadcnDurationDualSlider
                    customMin={customDurationMin}
                    customMax={customDurationMax}
                    onApplyCustom={(min: number | null, max: number | null) => {
                      onCustomDurationRange(min, max);
                    }}
                  />
                </div>

                {/* 3. Mã Voucher Khuyến Mãi từ Backend API */}
                {vouchers.length > 0 && (
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Voucher khả dụng ({vouchers.length})</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {vouchers.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => {
                            onVoucherCodeChange(selectedVoucherCode === v.code ? "all" : v.code);
                            onPromoChange(false);
                          }}
                          className={cn(
                            "w-full p-3 rounded-2xl text-xs font-bold text-left flex items-center justify-between transition-all border",
                            selectedVoucherCode === v.code
                              ? "bg-rose-500/10 border-rose-500/40 text-rose-600 dark:text-rose-400 shadow-sm"
                              : "bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/80"
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-rose-500/15 flex items-center justify-center text-rose-500 shrink-0">
                              <Tag className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-black text-foreground">{v.code}</span>
                              <span className="text-[10px] font-medium text-muted-foreground">
                                {v.type === "PERCENT" ? `Giảm ${v.value}%` : `Giảm ${v.value.toLocaleString("vi-VN")}đ`}
                                {v.minOrderAmount > 0 && ` • Đơn từ ${v.minOrderAmount / 1000}k`}
                              </span>
                            </div>
                          </div>
                          {selectedVoucherCode === v.code && <Check className="w-4 h-4 text-rose-500 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Đánh giá sao (Chip Grid) */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Đánh giá sao khách hàng</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {STAR_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => onStarChange(opt.value)}
                        className={cn(
                          "h-10 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between border",
                          starFilter === opt.value
                            ? "bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400"
                            : "bg-muted/30 border-border/40 text-muted-foreground"
                        )}
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                          <span className="truncate">{opt.label}</span>
                        </span>
                        {starFilter === opt.value && <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. Ưu tiên dịch vụ nổi bật */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Phân loại đặc biệt</h4>
                  <button
                    onClick={() => onFeaturedChange(!featuredFilter)}
                    className={cn(
                      "w-full h-11 px-4 rounded-2xl text-xs font-bold transition-all flex items-center justify-between border",
                      featuredFilter
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                        : "bg-muted/30 border-border/40 text-muted-foreground"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-emerald-500" />
                      Chỉ hiện các gói Dịch vụ Nổi bật HOT
                    </span>
                    {featuredFilter && <Check className="w-4 h-4 text-emerald-500" />}
                  </button>
                </div>
              </div>

              {/* Footer Button Ghim */}
              <div className="p-5 bg-card border-t border-border/30 shrink-0 z-10 shadow-[0_-8px_24px_-4px_rgba(0,0,0,0.08)]">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setIsDrawerOpen(false)}
                  className="w-full h-12 bg-primary text-primary-foreground font-black text-sm rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all"
                >
                  Áp dụng bộ lọc ({totalResults} gói dịch vụ)
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
