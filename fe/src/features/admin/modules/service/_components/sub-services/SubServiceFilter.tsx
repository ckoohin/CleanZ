import { Search, SlidersHorizontal, RotateCcw, LayoutGrid, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { BaseButton } from "@/components/ui/base/base_button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AdminServicePackageEntity } from "@/features/admin/modules/service/services/admin-services.service";

export function SubServiceFilter({
  search, onSearchChange,
  activeFilter, onActiveFilterChange,
  pricingFilter, onPricingFilterChange,
  packageFilter, onPackageFilterChange,
  durationFilter, onDurationFilterChange,
  isFiltersExpanded, onToggleExpanded,
  packages, filteredCount, totalCount, activeFiltersCount, hasFilters, onReset,
  onClearPackageFilter,
}: {
  search: string; onSearchChange: (v: string) => void;
  activeFilter: string; onActiveFilterChange: (v: string) => void;
  pricingFilter: string; onPricingFilterChange: (v: string) => void;
  packageFilter: string; onPackageFilterChange: (v: string) => void;
  durationFilter: "ALL" | "short" | "medium" | "long"; onDurationFilterChange: (v: "ALL" | "short" | "medium" | "long") => void;
  isFiltersExpanded: boolean; onToggleExpanded: () => void;
  packages: AdminServicePackageEntity[];
  filteredCount: number; totalCount: number; activeFiltersCount: number; hasFilters: boolean;
  onReset: () => void;
  onClearPackageFilter: () => void;
}) {
  return (
    <div className="bg-card border border-border/50 rounded-2xl p-4 space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <Input placeholder="Tìm theo tên hoặc mã dịch vụ..."
            value={search} onChange={e => onSearchChange(e.target.value)}
            className="pl-10 h-9 rounded-xl text-sm bg-(--c-card)" />
        </div>

        {/* Toggle Advanced Filters Button */}
        <BaseButton
          variant={isFiltersExpanded ? "primary" : "outline"}
          size="sm"
          onClick={onToggleExpanded}
          className="rounded-xl h-9 text-xs gap-1.5 select-none shrink-0"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Bộ lọc nâng cao</span>
          {activeFiltersCount > 0 && (
            <span className="ml-1 w-5 h-5 rounded-full bg-primary-foreground text-primary text-[10px] font-black flex items-center justify-center border border-primary/20">
              {activeFiltersCount}
            </span>
          )}
        </BaseButton>

        {hasFilters && (
          <BaseButton variant="outline" size="sm"
            onClick={onReset}
            className="rounded-xl h-9 text-xs gap-1.5 text-muted-foreground hover:text-foreground">
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Đặt lại</span>
          </BaseButton>
        )}

        <div className="ml-auto text-xs text-muted-foreground font-semibold">
          Hiển thị <span className="font-bold text-foreground">{filteredCount}</span> / {totalCount} dịch vụ
        </div>
      </div>

      {/* Expanded Filters Panel */}
      {isFiltersExpanded && (
        <div className="bg-muted/10 border border-border/40 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-top-2 duration-200">
          {/* 1. Lọc theo gói */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">Gói dịch vụ</label>
            <Select value={packageFilter} onValueChange={onPackageFilterChange}>
              <SelectTrigger className="h-9 rounded-xl text-xs bg-background font-semibold">
                <SelectValue placeholder="Chọn gói" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ALL" className="text-xs font-semibold rounded-lg">Tất cả gói dịch vụ</SelectItem>
                {packages.map(pkg => (
                  <SelectItem key={pkg.id} value={pkg.id} className="text-xs font-semibold rounded-lg">
                    {pkg.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 2. Lọc trạng thái hoạt động */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">Trạng thái</label>
            <Select value={activeFilter} onValueChange={onActiveFilterChange}>
              <SelectTrigger className="h-9 rounded-xl text-xs bg-background font-semibold">
                <SelectValue placeholder="Chọn trạng thái" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ALL" className="text-xs font-semibold rounded-lg">Tất cả trạng thái</SelectItem>
                <SelectItem value="ACTIVE" className="text-xs font-semibold rounded-lg">Đang hoạt động</SelectItem>
                <SelectItem value="INACTIVE" className="text-xs font-semibold rounded-lg">Tắt</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 3. Lọc cấu hình giá */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">Cấu hình giá</label>
            <Select value={pricingFilter} onValueChange={onPricingFilterChange}>
              <SelectTrigger className="h-9 rounded-xl text-xs bg-background font-semibold">
                <SelectValue placeholder="Chọn cấu hình giá" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ALL" className="text-xs font-semibold rounded-lg">Tất cả loại giá</SelectItem>
                <SelectItem value="PRICED" className="text-xs font-semibold rounded-lg">Đã cấu hình giá</SelectItem>
                <SelectItem value="UNPRICED" className="text-xs font-semibold rounded-lg">Chưa có giá</SelectItem>
                <SelectItem value="FIXED" className="text-xs font-semibold rounded-lg">Cố định</SelectItem>
                <SelectItem value="HOURLY" className="text-xs font-semibold rounded-lg">Theo giờ</SelectItem>
                <SelectItem value="CUSTOM" className="text-xs font-semibold rounded-lg">Tùy chỉnh</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 4. Lọc thời lượng làm việc */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">Thời lượng làm việc</label>
            <Select value={durationFilter} onValueChange={onDurationFilterChange}>
              <SelectTrigger className="h-9 rounded-xl text-xs bg-background font-semibold">
                <SelectValue placeholder="Chọn thời lượng" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ALL" className="text-xs font-semibold rounded-lg">Tất cả thời lượng</SelectItem>
                <SelectItem value="short" className="text-xs font-semibold rounded-lg">Dưới 1.5 giờ</SelectItem>
                <SelectItem value="medium" className="text-xs font-semibold rounded-lg">Từ 1.5 - 3 giờ</SelectItem>
                <SelectItem value="long" className="text-xs font-semibold rounded-lg">Trên 3 giờ</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Active package badge */}
      {packageFilter !== "ALL" && (
        <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl px-3 py-2 animate-in fade-in duration-200">
          <LayoutGrid className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
          <span className="text-xs text-primary font-semibold">
            Đang lọc theo gói: <strong>{packages.find(p => p.id === packageFilter)?.name}</strong>
          </span>
          <button type="button" onClick={onClearPackageFilter} className="ml-auto text-(--c-muted) hover:text-(--c-ink)">
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
