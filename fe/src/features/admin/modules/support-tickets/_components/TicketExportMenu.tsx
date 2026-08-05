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
import { supportTicketAdminApi } from "../services/support-ticket.service";
import type { AdminTicketExportQuery } from "@/features/support-tickets/shared/ticket.types";

interface TicketExportMenuProps {
  /** Bộ lọc đang render bảng — cũng chính là phạm vi của file danh sách. */
  filters: AdminTicketExportQuery;
  /** Nhãn kỳ ngày đang áp, hiển thị ngay tại điểm bấm. */
  rangeLabel: string;
  /** Mô tả ngắn các bộ lọc khác đang áp (ngoài kỳ ngày). */
  filterHint: string;
}

/**
 * MỘT điểm vào duy nhất cho mọi file Excel của module ticket.
 *
 * Trước đây hai loại file nằm ở hai nơi cách xa nhau — "Xuất danh sách" ngoài
 * toolbar, "Xuất báo cáo" trong panel chỉ số — nên người dùng không nhận ra
 * chúng là cùng một nhóm hành động và phải nhớ muốn cái nào thì bấm ở đâu.
 * Gom về một chỗ, dùng chung một kỳ ngày, và nói rõ phạm vi ngay trong menu
 * thay vì bắt người đọc suy ra từ các chip rải rác trên màn hình.
 */
export function TicketExportMenu({
  filters,
  rangeLabel,
  filterHint,
}: TicketExportMenuProps) {
  const range = { fromDate: filters.fromDate, toDate: filters.toDate };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#0E9F6E]/25 bg-[#0E9F6E]/10 px-3 text-[13px] font-semibold text-[#0E9F6E] transition-colors hover:bg-[#0E9F6E]/20"
        >
          <Download className="size-4" />
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
            onExport={() => supportTicketAdminApi.exportList(filters)}
            filenamePrefix="danh-sach-ticket"
            label="Danh sách ticket — theo bộ lọc đang xem"
            className="w-full justify-start text-left"
          />
          <ExportExcelButton
            onExport={() => supportTicketAdminApi.exportReport(range)}
            filenamePrefix="bao-cao-ho-tro-khach-hang"
            label="Báo cáo vận hành — SLA, xử lý, CSAT"
            className="w-full justify-start text-left"
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
