"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Layers, Activity, Tag, BarChart3 } from "lucide-react";
import {
  useAdminServices, useAdminPackages, useUpdateAdminService,
} from "@/features/admin/modules/service/hooks/useAdminServices";
import { AdminServiceEntity } from "@/features/admin/modules/service/services/admin-services.service";
import { BaseButton } from "@/components/ui/base/base_button";
import { toast } from "sonner";
import { StatCard } from "@/features/admin/modules/service/_components/StatCard";
import { SubServiceFilter } from "@/features/admin/modules/service/_components/sub-services/SubServiceFilter";
import { SubServiceTable } from "@/features/admin/modules/service/_components/sub-services/SubServiceTable";
import { ServiceDetailSheet } from "@/features/admin/modules/service/_components/sub-services/ServiceDetailSheet";
import { EditServiceSheet } from "@/features/admin/modules/service/_components/sub-services/SubServiceFormSheet";

const vnd = (val: number | string | null | undefined) => {
  if (!val && val !== 0) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency", currency: "VND", maximumFractionDigits: 0,
  }).format(Number(val));
};

export default function SubServicesManagementPage() {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [pricingFilter, setPricingFilter] = useState("ALL");
  const [packageFilter, setPackageFilter] = useState("ALL");
  const [durationFilter, setDurationFilter] = useState<"ALL" | "short" | "medium" | "long">("ALL");
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [detailSvc, setDetailSvc] = useState<AdminServiceEntity | null>(null);
  const [editSvc, setEditSvc] = useState<AdminServiceEntity | null>(null);

  const searchParams = useSearchParams();
  const openId = searchParams.get("openId");

  const updateMutation = useUpdateAdminService();

  const { data: packagesData } = useAdminPackages();
  const packages = packagesData ?? [];

  // Lấy toàn bộ items của gói hoặc tất cả để client-side filter
  const { data, isLoading } = useAdminServices({
    page: 1,
    limit: 1000,
    packageId: packageFilter === "ALL" ? undefined : packageFilter,
  });

  const items = data?.items ?? [];

  // Auto-open detail sheet khi URL có ?openId=<id>
  useEffect(() => {
    if (!openId || items.length === 0) return;
    const target = items.find(s => s.id === openId);
    if (target) setDetailSvc(target);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, items]);

  const filtered = useMemo(() => {
    return items.filter(s => {
      // 1. Lọc theo search
      if (search) {
        const query = search.toLowerCase();
        const matchName = s.name.toLowerCase().includes(query);
        const matchCode = s.subServiceCode.toLowerCase().includes(query);
        if (!matchName && !matchCode) return false;
      }
      // 2. Lọc theo activeFilter
      if (activeFilter !== "ALL") {
        const isActiveTarget = activeFilter === "ACTIVE";
        if (s.isActive !== isActiveTarget) return false;
      }
      // 3. Lọc theo pricingFilter
      if (pricingFilter !== "ALL") {
        if (pricingFilter === "PRICED") {
          if (!s.pricingConfig?.basePrice) return false;
        } else if (pricingFilter === "UNPRICED") {
          if (s.pricingConfig?.basePrice) return false;
        } else {
          if (s.pricingType !== pricingFilter) return false;
        }
      }
      // 4. Lọc theo durationFilter
      if (durationFilter !== "ALL") {
        const hrs = s.durationHours || 0;
        if (durationFilter === "short") {
          if (hrs > 1.5) return false;
        } else if (durationFilter === "medium") {
          if (hrs <= 1.5 || hrs > 3) return false;
        } else if (durationFilter === "long") {
          if (hrs <= 3) return false;
        }
      }
      return true;
    });
  }, [items, search, activeFilter, pricingFilter, durationFilter]);

  const activeCount = items.filter(s => s.isActive).length;
  const pricedCount = items.filter(s => s.pricingConfig?.basePrice).length;
  const avgPrice = pricedCount > 0
    ? items.reduce((sum, s) => sum + (s.pricingConfig?.basePrice ? Number(s.pricingConfig.basePrice) : 0), 0) / pricedCount
    : 0;

  const handleToggle = (svc: AdminServiceEntity) => {
    updateMutation.mutate(
      { id: svc.id, payload: { isActive: !svc.isActive } },
      { onSuccess: () => toast.success(svc.isActive ? "Đã tắt dịch vụ" : "Đã bật dịch vụ") }
    );
  };

  const handleResetFilters = () => {
    setSearch("");
    setActiveFilter("ALL");
    setPricingFilter("ALL");
    setPackageFilter("ALL");
    setDurationFilter("ALL");
    setPage(1);
  };

  // Client-side pagination
  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize);

  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(totalPages);
    }
  }, [totalPages, page]);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (activeFilter !== "ALL") count++;
    if (pricingFilter !== "ALL") count++;
    if (packageFilter !== "ALL") count++;
    if (durationFilter !== "ALL") count++;
    return count;
  }, [activeFilter, pricingFilter, packageFilter, durationFilter]);

  const hasFilters = search || activeFiltersCount > 0;

  return (
    <div className="space-y-6 w-full">

      {/* Sheets */}
      <ServiceDetailSheet
        svc={detailSvc}
        open={!!detailSvc}
        onClose={() => setDetailSvc(null)}
        onEdit={svc => { setDetailSvc(null); setEditSvc(svc); }}
      />
      <EditServiceSheet key={editSvc?.id} svc={editSvc} open={!!editSvc} onClose={() => setEditSvc(null)} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-(--c-ink)">Quản lý Dịch vụ con</h1>
          <p className="text-sm text-(--c-muted) mt-1">
            Danh sách đầy đủ các dịch vụ con với thông số phân tích và cấu hình giá chi tiết
          </p>
        </div>
        <BaseButton variant="primary" onClick={() => router.push("/admin/services/create")}
          className="gap-2 rounded-xl h-9 shrink-0">
          <Plus className="w-4 h-4" aria-hidden="true" />Thêm dịch vụ con
        </BaseButton>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Layers}    iconColor="text-[var(--c-primary-strong)]"     bgColor="bg-[var(--c-primary-soft)]"                    label="Tổng dịch vụ"    value={total}         sub="trên hệ thống" />
        <StatCard icon={Activity}  iconColor="text-[#0E9F6E]" bgColor="bg-[rgba(14,159,110,0.12)] dark:bg-[rgba(14,159,110,0.12)]" label="Đang hoạt động" value={activeCount}   sub={`${total - activeCount} tắt`} />
        <StatCard icon={Tag}       iconColor="text-[#2563EB]"    bgColor="bg-[rgba(37,99,235,0.12)] dark:bg-[rgba(37,99,235,0.12)]"   label="Có cấu hình giá" value={pricedCount}   sub="dịch vụ" />
        <StatCard icon={BarChart3} iconColor="text-[#D97706]"   bgColor="bg-[rgba(217,119,6,0.14)] dark:bg-[rgba(217,119,6,0.14)]" label="Giá TB"          value={vnd(Math.round(avgPrice))} sub="/ dịch vụ" />
      </div>

      {/* Filters Toolbar */}
      <SubServiceFilter
        search={search} onSearchChange={v => { setSearch(v); setPage(1); }}
        activeFilter={activeFilter} onActiveFilterChange={v => { setActiveFilter(v); setPage(1); }}
        pricingFilter={pricingFilter} onPricingFilterChange={v => { setPricingFilter(v); setPage(1); }}
        packageFilter={packageFilter} onPackageFilterChange={v => { setPackageFilter(v); setPage(1); }}
        durationFilter={durationFilter} onDurationFilterChange={v => { setDurationFilter(v); setPage(1); }}
        isFiltersExpanded={isFiltersExpanded} onToggleExpanded={() => setIsFiltersExpanded(!isFiltersExpanded)}
        packages={packages} filteredCount={filtered.length} totalCount={items.length}
        activeFiltersCount={activeFiltersCount} hasFilters={!!hasFilters}
        onReset={handleResetFilters}
        onClearPackageFilter={() => setPackageFilter("ALL")}
      />

      {/* List + Pagination + Delete dialog */}
      <SubServiceTable
        items={paginatedItems} isLoading={isLoading}
        filteredCount={filtered.length} page={page} pageSize={pageSize} totalPages={totalPages}
        onPageChange={setPage} onPageSizeChange={v => { setPageSize(v); setPage(1); }}
        onViewDetail={setDetailSvc} onEdit={setEditSvc}
        onToggle={handleToggle} isToggling={updateMutation.isPending}
      />
    </div>
  );
}
