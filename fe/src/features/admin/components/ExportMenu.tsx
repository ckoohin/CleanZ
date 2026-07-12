"use client";

import { Download } from "lucide-react";
import { AdminButton } from "@/components/admin";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExportExcelButton } from "../modules/service/_components/reports/ExportExcelButton";
import { dashboardApi } from "../services/dashboard.service";
import type { DateRange, ExportableCategory } from "../types/dashboard.types";
import { rangeLabel } from "../lib/date-ranges";

interface ExportMenuProps {
  category: ExportableCategory;
  range: DateRange;
}

/**
 * "Xuất báo cáo" cho danh mục đang xem. Hai chế độ dùng chung dữ liệu, chỉ khác
 * cách bày trong file: mỗi mục một tab, hoặc xếp chồng trong một trang tính.
 */
export function ExportMenu({ category, range }: ExportMenuProps) {
  const params = {
    category,
    fromDate: range.fromDate,
    toDate: range.toDate,
  } as const;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <AdminButton variant="primary" icon={<Download className="size-4" />}>
          Xuất báo cáo
        </AdminButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-[11px] font-normal text-[var(--c-muted)]">
          Kỳ: {rangeLabel(range)}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="flex flex-col gap-1 p-1">
          <ExportExcelButton
            onExport={() => dashboardApi.exportReport({ ...params, mode: "multi" })}
            filenamePrefix={`bao-cao-${category}`}
            label="Nhiều sheet — mỗi mục 1 tab"
            className="w-full justify-start"
          />
          <ExportExcelButton
            onExport={() => dashboardApi.exportReport({ ...params, mode: "combined" })}
            filenamePrefix={`bao-cao-${category}-gop`}
            label="Gộp 1 sheet — cuộn xem hết"
            className="w-full justify-start"
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
