"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BarChart3, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BaseButton } from "@/components/ui/base/base_button";
import { ROUTES } from "@/constants/routes";
import { ReportFilterToolbar } from "./ReportFilterToolbar";
import { ReportStatTiles } from "./ReportStatTiles";
import { RevenueTrendChart } from "./RevenueTrendChart";
import { RevenueByPackageChart } from "./RevenueByPackageChart";
import { HourlyDistributionChart } from "./HourlyDistributionChart";
import { AddonPopularityPanel } from "./AddonPopularityPanel";
import { DurationPopularityChart } from "./DurationPopularityChart";
import { BookingStatusDonut } from "./BookingStatusDonut";
import { TopTaskersPanel } from "./TopTaskersPanel";
import { downloadBlob, servicePackageReportsApi, type ServicePackageReportFilter } from "../../services/service-package-reports.service";

interface Props {
  /** Khi true: ẩn nút Back và tiêu đề trang (đã có PageHeader của Dashboard) */
  embedded?: boolean;
}

export function ServicePackageReportsPage({ embedded = false }: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<ServicePackageReportFilter>({});
  const [exportingAll, setExportingAll] = useState(false);

  const handleExportAll = async () => {
    setExportingAll(true);
    try {
      const blob = await servicePackageReportsApi.exportAll(filter);
      downloadBlob(blob, `bao-cao-tong-hop-goi-dich-vu_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch {
      toast.error("Xuất báo cáo tổng thất bại, vui lòng thử lại.");
    } finally {
      setExportingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        {!embedded && (
          <div>
            <BaseButton
              variant="ghost"
              onClick={() => router.push(ROUTES.ADMIN.SERVICES.SERVICE_PACKAGES.BASE)}
              className="h-8 px-2 mb-2 -ml-2 rounded-lg text-xs font-bold gap-1.5 text-(--c-muted) hover:text-(--c-ink)"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Quay lại danh sách gói dịch vụ
            </BaseButton>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-(--c-ink) flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-(--c-primary-soft)">
                <BarChart3 className="w-6 h-6 text-(--c-primary-strong)" />
              </span>
              Báo cáo thống kê Gói dịch vụ
            </h1>
            <p className="text-(--c-muted) text-sm mt-1 pl-11">
              Doanh thu, booking và hiệu suất toàn bộ hệ thống gói dịch vụ.
            </p>
          </div>
        )}

        <BaseButton
          onClick={handleExportAll}
          disabled={exportingAll}
          className="rounded-xl gap-2.5 h-12 px-6 shrink-0 bg-[#0E9F6E] hover:bg-[#0C8B5F] text-white border-0 shadow-lg shadow-[#0E9F6E]/30 hover:shadow-xl hover:shadow-[#0E9F6E]/40 hover:-translate-y-0.5"
        >
          {exportingAll ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <span className="grid place-items-center size-7 rounded-lg bg-white/20 shrink-0">
              <FileSpreadsheet className="w-4 h-4" />
            </span>
          )}
          <span className="font-bold text-[13px]">Xuất báo cáo tổng (Excel)</span>
        </BaseButton>
      </div>

      <ReportFilterToolbar filter={filter} onChange={setFilter} />

      <ReportStatTiles filter={filter} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2">
          <RevenueTrendChart filter={filter} />
        </div>
        <BookingStatusDonut filter={filter} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <RevenueByPackageChart filter={filter} />
        <HourlyDistributionChart filter={filter} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <DurationPopularityChart filter={filter} />
        <AddonPopularityPanel filter={filter} />
      </div>

      <TopTaskersPanel filter={filter} />
    </div>
  );
}
