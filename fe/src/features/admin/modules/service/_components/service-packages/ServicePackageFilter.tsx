import {
  Package, Grid3X3, List, SlidersHorizontal, RotateCcw, X, Loader2,
  CheckCircle2, XCircle, LayoutList, Users, Repeat, MousePointerClick, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BaseButton } from "@/components/ui/base/base_button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export type SubServiceCountFilter = "all" | "none" | "few" | "many";
export type CoverageFilter = "all" | "limited" | "system";
export type PolicyDescFilter = "all" | "yes" | "no";
export type ServiceModeFilterId = "multiple" | "subscription" | "single";
export type ServicePackageStatusFilter = "all" | "active" | "inactive" | "deleted";

const SERVICE_MODE_OPTIONS: {
  id: ServiceModeFilterId; label: string; icon: typeof Users;
  activeColor: string; inactiveColor: string;
}[] = [
  { id: "multiple", label: "Nhiều Tasker", icon: Users, activeColor: "bg-blue-500/10 text-blue-600 border-blue-500/30", inactiveColor: "bg-muted/30 text-muted-foreground border-border/40 hover:bg-muted" },
  { id: "subscription", label: "Theo gói đăng ký", icon: Repeat, activeColor: "bg-violet-500/10 text-violet-600 border-violet-500/30", inactiveColor: "bg-muted/30 text-muted-foreground border-border/40 hover:bg-muted" },
  { id: "single", label: "Chọn lẻ dịch vụ", icon: MousePointerClick, activeColor: "bg-teal-500/10 text-teal-600 border-teal-500/30", inactiveColor: "bg-muted/30 text-muted-foreground border-border/40 hover:bg-muted" },
];

const STATUS_BTNS = [
  { key: "all" as const, label: "Tất cả", icon: LayoutList },
  { key: "active" as const, label: "Đang bật", icon: CheckCircle2 },
  { key: "inactive" as const, label: "Đã tắt", icon: XCircle },
  { key: "deleted" as const, label: "Thùng rác", icon: Trash2 },
];

export function ServicePackageFilter({
  searchTerm, onSearchChange, isSearchPending,
  statusFilter, onStatusFilterChange, statusCounts,
  viewMode, onViewModeChange,
  isFiltersExpanded, onToggleExpanded,
  isAnyFilterActive, onReset,
  maxHoursFilter, onMaxHoursFilterChange,
  subServiceCountFilter, onSubServiceCountFilterChange,
  coverageFilter, onCoverageFilterChange,
  policyDescFilter, onPolicyDescFilterChange,
  serviceModeFilters, onToggleServiceMode,
}: {
  searchTerm: string; onSearchChange: (v: string) => void; isSearchPending: boolean;
  statusFilter: ServicePackageStatusFilter; onStatusFilterChange: (v: ServicePackageStatusFilter) => void;
  statusCounts: Record<ServicePackageStatusFilter, number>;
  viewMode: "grid" | "list"; onViewModeChange: (v: "grid" | "list") => void;
  isFiltersExpanded: boolean; onToggleExpanded: () => void;
  isAnyFilterActive: boolean; onReset: () => void;
  maxHoursFilter: "all" | "short" | "medium" | "long"; onMaxHoursFilterChange: (v: "all" | "short" | "medium" | "long") => void;
  subServiceCountFilter: SubServiceCountFilter; onSubServiceCountFilterChange: (v: SubServiceCountFilter) => void;
  coverageFilter: CoverageFilter; onCoverageFilterChange: (v: CoverageFilter) => void;
  policyDescFilter: PolicyDescFilter; onPolicyDescFilterChange: (v: PolicyDescFilter) => void;
  serviceModeFilters: ServiceModeFilterId[]; onToggleServiceMode: (id: ServiceModeFilterId) => void;
}) {
  const isDeletedView = statusFilter === "deleted";

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        {/* Status segmented control — nổi bật, có icon + số lượng */}
        <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl border border-border/50 bg-muted/40 p-1">
          {STATUS_BTNS.map((btn) => {
            const isActive = statusFilter === btn.key;
            return (
              <button
                key={btn.key}
                onClick={() => onStatusFilterChange(btn.key)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all",
                  isActive
                    ? "bg-(--c-card) text-primary shadow-md ring-1 ring-primary/20 scale-[1.02]"
                    : "text-muted-foreground hover:text-foreground hover:bg-(--c-card)/60"
                )}
              >
                <btn.icon className={cn("w-3.5 h-3.5", isActive && "text-primary")} aria-hidden="true" />
                <span>{btn.label}</span>
                <span className={cn(
                  "min-w-[18px] px-1 rounded-full text-[10px] font-black",
                  isActive ? "bg-primary text-white" : "bg-border/60 text-muted-foreground"
                )}>
                  {statusCounts[btn.key]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Search — có nút xóa, icon loading khi debounce, tìm rộng hơn */}
          <div className="relative flex-1 sm:w-72">
            {isSearchPending ? (
              <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" aria-hidden="true" />
            ) : (
              <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--c-muted)" aria-hidden="true" />
            )}
            <Input
              placeholder={
                isDeletedView
                  ? "Tìm trong thùng rác..."
                  : "Tìm theo tên, mã gói hoặc mô tả chính sách..."
              }
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 pr-8 h-10 rounded-xl bg-(--c-card) text-sm shadow-sm"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-(--c-muted) hover:text-(--c-ink) hover:bg-(--c-card-2) transition-colors"
                aria-label="Xóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          {!isDeletedView && (
            <BaseButton
              variant="outline"
              onClick={onToggleExpanded}
              className={cn(
                "h-9 px-3 rounded-xl gap-2 font-bold text-xs shrink-0 border-border/50",
                (isFiltersExpanded || isAnyFilterActive) && "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
              )}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Bộ lọc</span>
              {isAnyFilterActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              )}
            </BaseButton>
          )}

          {!isDeletedView && isAnyFilterActive && (
            <BaseButton
              variant="ghost"
              onClick={onReset}
              className="h-9 px-2 rounded-xl text-xs font-bold gap-1 shrink-0 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden md:inline">Đặt lại</span>
            </BaseButton>
          )}

          {!isDeletedView && (
            <div className="flex rounded-xl overflow-hidden border border-border/50 shrink-0">
              <button
                onClick={() => onViewModeChange("grid")}
                className={`p-2 transition-colors ${viewMode === "grid" ? "bg-(--c-primary) text-white" : "bg-(--c-card) text-(--c-muted) hover:bg-(--c-card-2)"}`}
              >
                <Grid3X3 className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                onClick={() => onViewModeChange("list")}
                className={`p-2 transition-colors ${viewMode === "list" ? "bg-(--c-primary) text-white" : "bg-(--c-card) text-(--c-muted) hover:bg-(--c-card-2)"}`}
              >
                <List className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Advanced Filters Panel */}
      {isFiltersExpanded && !isDeletedView && (
        <div className="bg-card border border-border/40 rounded-2xl p-5 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in slide-in-from-top-2 duration-200">
          {/* Lọc 1: Thời lượng tối đa */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">Thời lượng tối đa</label>
            <Select value={maxHoursFilter} onValueChange={(val) => onMaxHoursFilterChange(val as "all" | "short" | "medium" | "long")}>
              <SelectTrigger className="h-9 rounded-xl text-xs bg-background">
                <SelectValue placeholder="Chọn thời lượng" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="text-xs font-semibold rounded-lg">Tất cả thời lượng</SelectItem>
                <SelectItem value="short" className="text-xs font-semibold rounded-lg">Dưới 4 giờ / ca</SelectItem>
                <SelectItem value="medium" className="text-xs font-semibold rounded-lg">Từ 4h - 8h / ca</SelectItem>
                <SelectItem value="long" className="text-xs font-semibold rounded-lg">Trên 8 giờ / ca</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Lọc 2: Số lượng dịch vụ con */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">Số lượng dịch vụ con</label>
            <Select value={subServiceCountFilter} onValueChange={(val) => onSubServiceCountFilterChange(val as SubServiceCountFilter)}>
              <SelectTrigger className="h-9 rounded-xl text-xs bg-background">
                <SelectValue placeholder="Chọn số lượng" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="text-xs font-semibold rounded-lg">Tất cả</SelectItem>
                <SelectItem value="none" className="text-xs font-semibold rounded-lg">Chưa có dịch vụ con</SelectItem>
                <SelectItem value="few" className="text-xs font-semibold rounded-lg">Ít (1 - 3 dịch vụ)</SelectItem>
                <SelectItem value="many" className="text-xs font-semibold rounded-lg">Nhiều (trên 3 dịch vụ)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Lọc 3: Khu vực phục vụ */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">Khu vực phục vụ</label>
            <Select value={coverageFilter} onValueChange={(val) => onCoverageFilterChange(val as CoverageFilter)}>
              <SelectTrigger className="h-9 rounded-xl text-xs bg-background">
                <SelectValue placeholder="Chọn khu vực" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="text-xs font-semibold rounded-lg">Tất cả</SelectItem>
                <SelectItem value="limited" className="text-xs font-semibold rounded-lg">Đã giới hạn khu vực</SelectItem>
                <SelectItem value="system" className="text-xs font-semibold rounded-lg">Áp dụng toàn hệ thống</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Lọc 4: Mô tả chính sách */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">Mô tả chính sách</label>
            <Select value={policyDescFilter} onValueChange={(val) => onPolicyDescFilterChange(val as PolicyDescFilter)}>
              <SelectTrigger className="h-9 rounded-xl text-xs bg-background">
                <SelectValue placeholder="Chọn trạng thái mô tả" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="text-xs font-semibold rounded-lg">Tất cả</SelectItem>
                <SelectItem value="yes" className="text-xs font-semibold rounded-lg">Đã có mô tả</SelectItem>
                <SelectItem value="no" className="text-xs font-semibold rounded-lg">Chưa có mô tả</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Lọc 5: Chế độ đặt dịch vụ */}
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">Chế độ đặt dịch vụ</label>
            <div className="flex flex-wrap gap-1 pt-0.5">
              {SERVICE_MODE_OPTIONS.map((item) => {
                const isActive = serviceModeFilters.includes(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => onToggleServiceMode(item.id)}
                    className={cn(
                      "px-2 py-1 rounded-xl text-[10px] font-bold border transition-all flex items-center gap-1 cursor-pointer select-none",
                      isActive ? item.activeColor : item.inactiveColor
                    )}
                  >
                    <item.icon className="w-3 h-3 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
