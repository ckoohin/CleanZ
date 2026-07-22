"use client";

import React from "react";
import { PageHeader, FilterTabs } from "@/components/admin";

import { useDashboardStore } from "../stores/dashboard.store";
import { CATEGORIES, CATEGORY_LAYOUT, SPAN_CLASS } from "../lib/dashboard-categories";
import { rangeLabel } from "../lib/date-ranges";
import type { CategoryKey, ExportableCategory, WidgetId } from "../types/dashboard.types";

import { DateRangeFilter } from "./DateRangeFilter";
import { ExportMenu } from "./ExportMenu";

import { AlertsWidget } from "./widgets/AlertsWidget";
import { KpiCard } from "./widgets/KpiCard";
import { GmvChartWidget } from "./widgets/GmvChartWidget";
import { BookingStatusWidget } from "./widgets/BookingStatusWidget";
import { RecentBookingsWidget } from "./widgets/RecentBookingsWidget";
import { RecurringWidget } from "./widgets/RecurringWidget";
import { CancelReasonsWidget } from "./widgets/CancelReasonsWidget";
import { PeakHoursWidget } from "./widgets/PeakHoursWidget";
import { PaymentMixWidget } from "./widgets/PaymentMixWidget";
import { FeeBreakdownWidget } from "./widgets/FeeBreakdownWidget";
import { TopTaskersWidget } from "./widgets/TopTaskersWidget";
import { DocExpiryWidget } from "./widgets/DocExpiryWidget";
import { TaskerLevelsWidget } from "./widgets/TaskerLevelsWidget";
import { ReviewsWidget } from "./widgets/ReviewsWidget";
import { FeedbackWidget } from "./widgets/FeedbackWidget";
import { VoucherPerfWidget } from "./widgets/VoucherPerfWidget";
import { AreaPerfWidget } from "./widgets/AreaPerfWidget";
import { ServicePackageReportsPage } from "../modules/service/_components/reports/ServicePackageReportsPage";

const WIDGET_MAP: Record<WidgetId, React.ReactNode> = {
  alerts: <AlertsWidget />,
  kpiRevenue: <KpiCard id="kpiRevenue" />,
  kpiGMV: <KpiCard id="kpiGMV" />,
  kpiAOV: <KpiCard id="kpiAOV" />,
  kpiRefund: <KpiCard id="kpiRefund" />,
  kpiOrders: <KpiCard id="kpiOrders" />,
  kpiCancel: <KpiCard id="kpiCancel" />,
  kpiTaskers: <KpiCard id="kpiTaskers" />,
  kpiNewCust: <KpiCard id="kpiNewCust" />,
  kpiRetention: <KpiCard id="kpiRetention" />,
  kpiNPS: <KpiCard id="kpiNPS" />,
  chart: <GmvChartWidget />,
  statuses: <BookingStatusWidget />,
  recent: <RecentBookingsWidget />,
  recurring: <RecurringWidget />,
  cancelReasons: <CancelReasonsWidget />,
  paymentMix: <PaymentMixWidget />,
  feeBreakdown: <FeeBreakdownWidget />,
  taskerLevels: <TaskerLevelsWidget />,
  topTaskers: <TopTaskersWidget />,
  docExpiry: <DocExpiryWidget />,
  reviews: <ReviewsWidget />,
  feedback: <FeedbackWidget />,
  voucherPerf: <VoucherPerfWidget />,
  areaPerf: <AreaPerfWidget />,
  peakHours: <PeakHoursWidget />,
};

export function DashboardClient() {
  const category = useDashboardStore((s) => s.currentCategory);
  const setCategory = useDashboardStore((s) => s.setCategory);
  const dateRange = useDashboardStore((s) => s.dateRange);

  /** Danh mục này không dùng lưới widget — render trang báo cáo dịch vụ riêng. */
  const isServiceReport = category === "services";

  return (
    <div className="space-y-6 pb-20 kos-rise">
      <PageHeader
        title="Bảng điều khiển · Dịch vụ dọn dẹp"
        description={
          isServiceReport
            ? "Hà Nội & TP. HCM · báo cáo gói dịch vụ"
            : `Hà Nội & TP. HCM · kỳ thống kê: ${rangeLabel(dateRange)}`
        }
        actions={
          !isServiceReport && (
            <>
              <DateRangeFilter />
              <ExportMenu
                category={category as ExportableCategory}
                range={dateRange}
              />
            </>
          )
        }
      />

      <FilterTabs<CategoryKey>
        tabs={CATEGORIES}
        value={category}
        onChange={setCategory}
      />

      {isServiceReport ? (
        <ServicePackageReportsPage embedded />
      ) : (
        <div className="grid grid-cols-12 items-stretch gap-5">
          {CATEGORY_LAYOUT[category].map(({ id, span }) => (
            <div key={id} className={SPAN_CLASS[span]}>
              {WIDGET_MAP[id]}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
