"use client";

import { Download } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExportExcelButton } from "@/features/admin/components/ExportExcelButton";
import { adminIncidentApi } from "../services/admin-incident.service";
import type { AdminIncidentExportQuery } from "@/features/incident/shared/incident.types";

interface IncidentExportMenuProps {
  /** Bộ lọc đang render bảng — cũng chính là phạm vi của file danh sách. */
  filters: AdminIncidentExportQuery;
  /** Nhãn kỳ ngày đang áp, hiển thị ngay tại điểm bấm. */
  rangeLabel: string;
  /** Mô tả ngắn các bộ lọc khác đang áp (ngoài kỳ ngày). */
  filterHint: string;
}

/**
 * MỘT điểm vào duy nhất cho mọi file Excel của module sự cố — cùng khuôn với
 * `TicketExportMenu`. Hai loại file phục vụ hai nhu cầu thật khác nhau (đối
 * soát từng vụ / báo cáo dòng tiền theo kỳ) nhưng đặt chung một chỗ, dùng chung
 * một kỳ ngày, và nói rõ phạm vi ngay trong menu.
 */
export function IncidentExportMenu({
  filters,
  rangeLabel,
  filterHint,
}: IncidentExportMenuProps) {
  const range = { fromDate: filters.fromDate, toDate: filters.toDate };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#0E9F6E]/25 bg-[#0E9F6E]/10 px-3 text-xs font-semibold text-[#0E9F6E] transition-colors hover:bg-[#0E9F6E]/20"
        >
          <Download className="size-3.5" />
          Xuất Excel
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-[11px] font-normal text-[var(--c-muted)]">
          Kỳ: {rangeLabel}
          {filterHint && ` · ${filterHint}`}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="flex flex-col gap-1 p-1">
          <ExportExcelButton
            onExport={() => adminIncidentApi.exportList(filters)}
            filenamePrefix="danh-sach-su-co"
            label="Danh sách sự cố — theo bộ lọc đang xem"
            className="w-full justify-start text-left"
          />
          <ExportExcelButton
            onExport={() => adminIncidentApi.exportReport(range)}
            filenamePrefix="bao-cao-su-co"
            label="Báo cáo sự cố — thẩm định, trách nhiệm, dòng tiền"
            className="w-full justify-start text-left"
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
