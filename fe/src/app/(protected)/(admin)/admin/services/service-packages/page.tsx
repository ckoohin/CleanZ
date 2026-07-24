"use client";
import { ROUTES } from "@/constants/routes";
import * as React from "react";
import { Plus, Package, TrendingUp, PowerOff, BarChart3 } from "lucide-react";
import { useRouter } from "next/navigation";
import { BaseButton } from "@/components/ui/base/base_button";
import {
  useAdminPackages,
  useDeletedAdminPackages,
  useUpdateAdminPackage,
} from "@/features/admin/modules/service/hooks/useAdminServices";
import { AdminServicePackageEntity } from "@/features/admin/modules/service/services/admin-services.service";
import {
  ServicePackageFilter,
  type SubServiceCountFilter,
  type CoverageFilter,
  type PolicyDescFilter,
  type ServiceModeFilterId,
  type ServicePackageStatusFilter,
} from "@/features/admin/modules/service/_components/service-packages/ServicePackageFilter";
import { ServicePackageTable } from "@/features/admin/modules/service/_components/service-packages/ServicePackageTable";
import { DeletedPackagesPage } from "@/features/admin/modules/service/_components/service-packages/DeletedPackagesPage";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);
  React.useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

function PageHeader({
  onAdd,
  onViewReports,
}: {
  onAdd: () => void;
  onViewReports: () => void;
}) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-(--c-ink)">
          Quản lý Gói Dịch vụ
        </h1>
        <p className="text-(--c-muted) text-sm mt-1">
          Thiết lập, quản lý bảng giá và thống kê cho từng gói dịch vụ.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <BaseButton
          variant="outline"
          onClick={onViewReports}
          className="rounded-xl gap-2 h-11 px-5 border-(--c-line)/50"
        >
          <BarChart3 className="w-4 h-4" aria-hidden="true" />
          <span className="font-bold uppercase tracking-widest text-[10px]">Xem báo cáo</span>
        </BaseButton>
        <BaseButton
          variant="primary"
          onClick={onAdd}
          className="rounded-xl shadow-lg shadow-primary/20 gap-2 h-11 px-6"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span className="font-bold uppercase tracking-widest text-[10px]">Tạo gói mới</span>
        </BaseButton>
      </div>
    </div>
  );
}

export default function AdminServicesPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = React.useState("");
  const debouncedSearch = useDebounce(searchTerm, 400);
  const [statusFilter, setStatusFilter] = React.useState<ServicePackageStatusFilter>("all");

  // Advanced Filters States
  const [isFiltersExpanded, setIsFiltersExpanded] = React.useState(false);
  const [maxHoursFilter, setMaxHoursFilter] = React.useState<"all" | "short" | "medium" | "long">("all");
  const [subServiceCountFilter, setSubServiceCountFilter] = React.useState<SubServiceCountFilter>("all");
  const [coverageFilter, setCoverageFilter] = React.useState<CoverageFilter>("all");
  const [policyDescFilter, setPolicyDescFilter] = React.useState<PolicyDescFilter>("all");
  const [serviceModeFilters, setServiceModeFilters] = React.useState<ServiceModeFilterId[]>([]);

  // Pagination states
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(6);

  const { data: packages, isLoading } = useAdminPackages();
  const {
    data: deletedPackages,
    isLoading: isDeletedLoading,
    isError: isDeletedError,
    refetch: refetchDeletedPackages,
  } = useDeletedAdminPackages();
  const updateMutation = useUpdateAdminPackage();

  const isAnyFilterActive = React.useMemo(() => {
    return maxHoursFilter !== "all" || subServiceCountFilter !== "all" || coverageFilter !== "all"
      || policyDescFilter !== "all" || serviceModeFilters.length > 0;
  }, [maxHoursFilter, subServiceCountFilter, coverageFilter, policyDescFilter, serviceModeFilters]);

  const handleResetFilters = React.useCallback(() => {
    setMaxHoursFilter("all");
    setSubServiceCountFilter("all");
    setCoverageFilter("all");
    setPolicyDescFilter("all");
    setServiceModeFilters([]);
  }, []);

  const toggleServiceMode = React.useCallback((id: ServiceModeFilterId) => {
    setServiceModeFilters((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  }, []);

  // Reset page when filters change
  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, pageSize, maxHoursFilter, subServiceCountFilter, coverageFilter, policyDescFilter, serviceModeFilters]);

  const filtered = React.useMemo(() => {
    if (!packages) return [];
    return packages.filter((pkg) => {
      // 1. Tìm kiếm theo Tên, Mã gói hoặc Mô tả chính sách
      const matchSearch =
        !debouncedSearch ||
        pkg.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        pkg.packageCode.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (pkg.policyDescription?.toLowerCase().includes(debouncedSearch.toLowerCase()) ?? false);

      // 2. Trạng thái hoạt động
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && pkg.isActive) ||
        (statusFilter === "inactive" && !pkg.isActive);

      // 3. Thời lượng tối đa
      let matchMaxHours = true;
      if (maxHoursFilter === "short") {
        matchMaxHours = pkg.maxHours <= 4;
      } else if (maxHoursFilter === "medium") {
        matchMaxHours = pkg.maxHours > 4 && pkg.maxHours <= 8;
      } else if (maxHoursFilter === "long") {
        matchMaxHours = pkg.maxHours > 8;
      }

      // 4. Số lượng dịch vụ con
      let matchSubServices = true;
      const subCount = pkg.packageSubServices?.length ?? 0;
      if (subServiceCountFilter === "none") {
        matchSubServices = subCount === 0;
      } else if (subServiceCountFilter === "few") {
        matchSubServices = subCount >= 1 && subCount <= 3;
      } else if (subServiceCountFilter === "many") {
        matchSubServices = subCount > 3;
      }

      // 5. Khu vực phục vụ
      let matchCoverage = true;
      const areaCount = pkg.coverageAreaIds?.length ?? pkg.coverageAreas?.length ?? 0;
      if (coverageFilter === "limited") {
        matchCoverage = areaCount > 0;
      } else if (coverageFilter === "system") {
        matchCoverage = areaCount === 0;
      }

      // 6. Mô tả chính sách
      let matchPolicyDesc = true;
      const hasPolicyDesc = !!pkg.policyDescription?.trim();
      if (policyDescFilter === "yes") {
        matchPolicyDesc = hasPolicyDesc;
      } else if (policyDescFilter === "no") {
        matchPolicyDesc = !hasPolicyDesc;
      }

      // 7. Chế độ đặt dịch vụ (gói phải thỏa tất cả chế độ được tích chọn)
      let matchServiceMode = true;
      if (serviceModeFilters.includes("multiple") && !pkg.allowMultipleTaskers) matchServiceMode = false;
      if (serviceModeFilters.includes("subscription") && !pkg.allowSubscription) matchServiceMode = false;
      if (serviceModeFilters.includes("single") && !pkg.allowSingleService) matchServiceMode = false;

      return matchSearch && matchStatus && matchMaxHours && matchSubServices
        && matchCoverage && matchPolicyDesc && matchServiceMode;
    });
  }, [packages, debouncedSearch, statusFilter, maxHoursFilter, subServiceCountFilter, coverageFilter, policyDescFilter, serviceModeFilters]);

  const totalPages = Math.ceil(filtered.length / pageSize);

  const filteredDeletedPackages = React.useMemo(() => {
    if (!deletedPackages) return [];
    const query = debouncedSearch.trim().toLowerCase();
    if (!query) return deletedPackages;

    return deletedPackages.filter(
      (pkg) =>
        pkg.name.toLowerCase().includes(query) ||
        pkg.packageCode.toLowerCase().includes(query) ||
        (pkg.policyDescription?.toLowerCase().includes(query) ?? false),
    );
  }, [deletedPackages, debouncedSearch]);

  const paginatedPackages = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const toggleActive = (pkg: AdminServicePackageEntity) => {
    updateMutation.mutate({ id: pkg.id, payload: { isActive: !pkg.isActive } });
  };

  const statusCounts = React.useMemo(() => ({
    all: packages?.length ?? 0,
    active: packages?.filter((p) => p.isActive).length ?? 0,
    inactive: packages?.filter((p) => !p.isActive).length ?? 0,
    deleted: deletedPackages?.length ?? 0,
  }), [packages, deletedPackages]);

  const isSearchPending = searchTerm !== debouncedSearch;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          onAdd={() => router.push(ROUTES.ADMIN.SERVICES.SERVICE_PACKAGES.CREATE)}
          onViewReports={() => router.push(ROUTES.ADMIN.SERVICES.SERVICE_PACKAGES.REPORTS)}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-(--c-card-2) animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        onAdd={() => router.push(ROUTES.ADMIN.SERVICES.SERVICE_PACKAGES.CREATE)}
        onViewReports={() => router.push(ROUTES.ADMIN.SERVICES.SERVICE_PACKAGES.REPORTS)}
      />

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: "Tổng gói dịch vụ", value: packages?.length ?? 0, icon: Package, color: "text-[var(--c-primary-strong)] bg-[var(--c-primary-soft)]" },
          { label: "Đang hoạt động", value: packages?.filter((p) => p.isActive).length ?? 0, icon: TrendingUp, color: "text-[#0E9F6E] bg-[rgba(14,159,110,0.12)] dark:bg-[rgba(14,159,110,0.12)]" },
          { label: "Đã tắt", value: packages?.filter((p) => !p.isActive).length ?? 0, icon: PowerOff, color: "text-[#E11D48] bg-[rgba(225,29,72,0.12)] dark:bg-[rgba(225,29,72,0.12)]" },
        ].map((stat) => (
          <div key={stat.label} className="bg-(--c-card) border border-(--c-line)/50 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
            <div className={`p-2.5 rounded-xl ${stat.color}`}>
              <stat.icon className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm text-(--c-muted) font-medium">{stat.label}</p>
              <p className="text-2xl font-bold text-(--c-ink)">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <ServicePackageFilter
        searchTerm={searchTerm} onSearchChange={setSearchTerm} isSearchPending={isSearchPending}
        statusFilter={statusFilter} onStatusFilterChange={setStatusFilter} statusCounts={statusCounts}
        viewMode={viewMode} onViewModeChange={setViewMode}
        isFiltersExpanded={isFiltersExpanded} onToggleExpanded={() => setIsFiltersExpanded(!isFiltersExpanded)}
        isAnyFilterActive={isAnyFilterActive} onReset={handleResetFilters}
        maxHoursFilter={maxHoursFilter} onMaxHoursFilterChange={setMaxHoursFilter}
        subServiceCountFilter={subServiceCountFilter} onSubServiceCountFilterChange={setSubServiceCountFilter}
        coverageFilter={coverageFilter} onCoverageFilterChange={setCoverageFilter}
        policyDescFilter={policyDescFilter} onPolicyDescFilterChange={setPolicyDescFilter}
        serviceModeFilters={serviceModeFilters} onToggleServiceMode={toggleServiceMode}
      />

      {statusFilter === "deleted" ? (
        <DeletedPackagesPage
          packages={filteredDeletedPackages}
          totalCount={deletedPackages?.length ?? 0}
          isLoading={isDeletedLoading}
          isError={isDeletedError}
          hasSearch={Boolean(debouncedSearch.trim())}
          onRetry={() => void refetchDeletedPackages()}
        />
      ) : (
        <ServicePackageTable
          items={paginatedPackages} totalFilteredCount={filtered.length}
          viewMode={viewMode} page={page} pageSize={pageSize} totalPages={totalPages}
          onPageChange={setPage} onPageSizeChange={setPageSize}
          onView={(pkg) => router.push(ROUTES.ADMIN.SERVICES.SERVICE_PACKAGES.DETAIL(pkg.id))}
          onEdit={(pkg) => router.push(ROUTES.ADMIN.SERVICES.SERVICE_PACKAGES.UPDATE(pkg.id))}
          onToggle={toggleActive} isToggling={updateMutation.isPending}
          onCreateFirst={() => router.push("/admin/services/create")}
        />
      )}
    </div>
  );
}
