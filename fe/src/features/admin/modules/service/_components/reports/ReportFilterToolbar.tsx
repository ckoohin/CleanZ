"use client";

import { RotateCcw, Package, User, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { BaseButton } from "@/components/ui/base/base_button";
import { useAdminPackages } from "@/features/admin/modules/service/hooks/useAdminServices";
import { useActiveTaskers } from "@/features/admin/modules/booking/hooks/useAdminBooking";
import { ReportDateRangeControl } from "./ReportDateRangeControl";
import { ComboSelect } from "./ComboSelect";
import type { ServicePackageReportFilter } from "../../services/service-package-reports.service";

export interface ReportFilterToolbarProps {
  filter: ServicePackageReportFilter;
  onChange: (filter: ServicePackageReportFilter) => void;
}

export function ReportFilterToolbar({ filter, onChange }: ReportFilterToolbarProps) {
  const { data: packages } = useAdminPackages();
  const { data: taskers } = useActiveTaskers();

  const isAnyFilterActive = !!(filter.from || filter.to || filter.packageId || filter.taskerId);

  return (
    <div className="bg-(--c-card) border border-(--c-line)/70 rounded-2xl p-4 flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 shadow-sm">
      <div className="flex items-center gap-1.5 text-xs font-bold text-(--c-muted) uppercase tracking-wide shrink-0 mr-1">
        <SlidersHorizontal className="w-3.5 h-3.5" />
        Bộ lọc
      </div>

      <ReportDateRangeControl
        from={filter.from}
        to={filter.to}
        onChange={(from, to) => onChange({ ...filter, from, to })}
      />

      <ComboSelect
        icon={<Package className="w-3.5 h-3.5 text-(--c-primary-strong)" />}
        placeholder="Tất cả gói dịch vụ"
        searchPlaceholder="Gõ để tìm gói dịch vụ..."
        value={filter.packageId}
        onChange={(v) => onChange({ ...filter, packageId: v })}
        options={(packages ?? []).map((pkg) => ({ value: pkg.id, label: pkg.name }))}
      />

      <ComboSelect
        icon={<User className="w-3.5 h-3.5 text-(--c-primary-strong)" />}
        placeholder="Tất cả tasker"
        searchPlaceholder="Gõ để tìm tasker..."
        value={filter.taskerId}
        onChange={(v) => onChange({ ...filter, taskerId: v })}
        options={(taskers ?? []).map((t: { id: string; fullName: string; phoneNumber?: string }) => ({
          value: t.id,
          label: t.fullName,
          sub: t.phoneNumber,
        }))}
      />

      {isAnyFilterActive && (
        <BaseButton
          variant="ghost"
          onClick={() => onChange({})}
          className={cn(
            "h-10 px-3.5 rounded-xl text-xs font-bold gap-1.5 shrink-0 ml-auto",
            "bg-red-500/10 text-red-600 hover:bg-red-500/15 border-2 border-red-500/20",
          )}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Đặt lại bộ lọc</span>
        </BaseButton>
      )}
    </div>
  );
}
