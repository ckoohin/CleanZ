"use client";

import React from "react";
import GridLayout, { WidthProvider, type Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import {
  LayoutGrid,
  Settings2,
  Download,
  GripVertical,
  X,
  RotateCcw,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  PageHeader,
  AdminButton,
  AdminCard,
  AdminDialog,
} from "@/components/admin";

import {
  useDashboardStore,
  DEFAULT_SIZE,
  MIN_SIZE,
  GRID_COLS,
} from "../stores/dashboard.store";
import { useKpis, useBookingDetails, useVoucherPerformance } from "../hooks/useDashboard";
import type { WidgetId, GridLayoutItem } from "../types/dashboard.types";

import { DateRangeFilter } from "./DateRangeFilter";
import { PresetSelect } from "./PresetSelect";

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

// react-grid-layout grid metrics — keep in sync with the store's grid units.
const ROW_HEIGHT = 60;
const GRID_MARGIN: [number, number] = [20, 20];

const GridResponsive = WidthProvider(GridLayout);

const WIDGET_INFO: Record<WidgetId, { title: string; desc: string; group: string }> = {
  alerts: { title: "Cần xử lý ngay", desc: "Việc tồn đọng cần hành động khẩn cấp", group: "Cảnh báo" },
  kpiRevenue: { title: "KPI · Doanh thu hoa hồng", desc: "Hoa hồng nền tảng (bookings × rate)", group: "Tài chính" },
  kpiGMV: { title: "KPI · GMV", desc: "Tổng giá trị giao dịch (bookings.total_price)", group: "Tài chính" },
  kpiAOV: { title: "KPI · Giá trị đơn TB", desc: "GMV / số đơn hoàn tất", group: "Tài chính" },
  kpiRefund: { title: "KPI · Tiền hoàn", desc: "payments REFUNDED + cancellation refund", group: "Tài chính" },
  kpiOrders: { title: "KPI · Đơn hàng", desc: "Tổng đơn trong kỳ", group: "Đơn hàng" },
  kpiCancel: { title: "KPI · Tỉ lệ huỷ", desc: "(cancelled + expired) / tổng", group: "Đơn hàng" },
  kpiTaskers: { title: "KPI · Tasker online", desc: "taskers ACTIVE đang online", group: "Tasker" },
  kpiNewCust: { title: "KPI · Khách mới", desc: "customers tạo trong kỳ", group: "Khách hàng" },
  kpiRetention: { title: "KPI · Tỉ lệ quay lại", desc: "customers có total_bookings ≥ 2", group: "Khách hàng" },
  kpiNPS: { title: "KPI · NPS", desc: "Net Promoter Score từ reviews", group: "Chất lượng" },
  chart: { title: "Biểu đồ GMV & số đơn", desc: "Xu hướng 7 ngày · bookings theo ngày", group: "Đơn hàng" },
  statuses: { title: "Đơn theo trạng thái", desc: "Ảnh chụp hiện tại · bookings.status", group: "Đơn hàng" },
  recent: { title: "Đơn hàng gần đây", desc: "Bảng đơn mới nhất", group: "Đơn hàng" },
  recurring: { title: "Đơn định kỳ", desc: "bookings.is_recurring = true", group: "Đơn hàng" },
  cancelReasons: { title: "Lý do huỷ đơn", desc: "cancellation_logs theo cancelled_by", group: "Đơn hàng" },
  paymentMix: { title: "Cơ cấu thanh toán", desc: "payments theo method", group: "Tài chính" },
  feeBreakdown: { title: "Phân tích phụ phí", desc: "peak_fee / pet_fee / waiting_fee", group: "Tài chính" },
  taskerLevels: { title: "Phân bố level Tasker", desc: "taskers theo tasker_levels", group: "Tasker" },
  topTaskers: { title: "Top Tasker", desc: "taskers theo rating & số ca", group: "Tasker" },
  docExpiry: { title: "Giấy tờ sắp hết hạn", desc: "tasker_documents.expired_date gần", group: "Tasker" },
  reviews: { title: "Đánh giá", desc: "reviews · điểm & 4 tiêu chí", group: "Chất lượng" },
  feedback: { title: "Feedback mới nhất", desc: "reviews.comment gần đây", group: "Chất lượng" },
  voucherPerf: { title: "Hiệu quả voucher", desc: "vouchers · used_count / usage_limit", group: "Marketing" },
  areaPerf: { title: "Đơn theo khu vực", desc: "bookings theo service_areas", group: "Vận hành" },
  peakHours: { title: "Khung giờ cao điểm", desc: "bookings theo scheduled_start", group: "Vận hành" },
  extras: { title: "Chỉ số phụ", desc: "AOV, khách mới, voucher, ticket…", group: "Khác" },
};

const GROUPS = ["Cảnh báo", "Tài chính", "Đơn hàng", "Tasker", "Khách hàng", "Chất lượng", "Marketing", "Vận hành", "Khác"];

function fmtMoney(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1).replace(".0", "")} tỷ`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(".0", "")}M đ`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K đ`;
  return `${v.toLocaleString("vi-VN")} đ`;
}

function ExtrasWidget() {
  const { dateRange } = useDashboardStore();
  const { data: kpis } = useKpis(dateRange);
  const { data: details } = useBookingDetails(dateRange);
  const { data: vouchers } = useVoucherPerformance();

  const recurringTotal = (details?.recurring ?? []).reduce((s, r) => s + r.count, 0);
  const voucherUsed = (vouchers ?? []).reduce((s, v) => s + v.used, 0);

  const m: [string, string][] = [
    ["Giá trị đơn TB", kpis ? fmtMoney(kpis.aov.value) : "—"],
    ["Khách mới (kỳ)", kpis ? kpis.newCustomers.value.toLocaleString("vi-VN") : "—"],
    ["Voucher đã dùng", voucherUsed.toLocaleString("vi-VN")],
    ["Tỉ lệ quay lại", kpis ? `${kpis.returningRate.value}%` : "—"],
    ["Đơn định kỳ", recurringTotal.toLocaleString("vi-VN")],
  ];
  return (
    <AdminCard className="flex h-full flex-col justify-between p-5">
      <div className="mb-4 flex items-start justify-between">
        <h3 className="text-[15px] font-bold text-[var(--c-ink)]">Chỉ số phụ</h3>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {m.map((x) => (
          <div key={x[0]} className="rounded-xl bg-[var(--c-card-2)] p-3">
            <div className="truncate text-[11.5px] font-medium text-[var(--c-muted)]">{x[0]}</div>
            <div className="mt-1 text-lg font-bold text-[var(--c-ink)] tabular-nums">{x[1]}</div>
          </div>
        ))}
      </div>
    </AdminCard>
  );
}

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
  extras: <ExtrasWidget />,
};

export function DashboardClient() {
  const {
    currentPreset,
    dateRange,
    isEditMode,
    presets,
    setEditMode,
    saveLayout,
    hideWidget,
    setWidgetSelection,
    resetPreset,
  } = useDashboardStore();

  const [isCustomizeOpen, setIsCustomizeOpen] = React.useState(false);
  const [draftIds, setDraftIds] = React.useState<WidgetId[]>([]);

  // Avoid SSR/CSR mismatch: react-grid-layout measures width on the client only.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const layout = presets[currentPreset] || { label: "", layout: [] };
  const visibleWidgets = layout.layout;

  /** Preset này không dùng widget grid — render ServicePackageReportsPage thay thế */
  const isServiceReport = currentPreset === 'services';

  // Map our stored grid items into react-grid-layout's Layout[] shape.
  const rglLayout: Layout[] = React.useMemo(
    () =>
      visibleWidgets.map((w) => ({
        i: w.id,
        x: w.x,
        y: w.y,
        w: w.w,
        h: w.h,
        minW: MIN_SIZE.w,
        minH: MIN_SIZE.h,
      })),
    [visibleWidgets]
  );

  const persistLayout = React.useCallback(
    (next: Layout[]) => {
      const mapped: GridLayoutItem[] = next.map((l) => ({
        id: l.i as WidgetId,
        x: l.x,
        y: l.y,
        w: l.w,
        h: l.h,
      }));
      saveLayout(mapped);
    },
    [saveLayout]
  );

  const handleOpenCustomize = () => {
    setDraftIds(visibleWidgets.map((w) => w.id));
    setIsCustomizeOpen(true);
  };

  const handleToggleWidgetOption = (id: WidgetId, checked: boolean) => {
    setDraftIds((prev) =>
      checked ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((x) => x !== id)
    );
  };

  const handleApplyCustomize = () => {
    setWidgetSelection(draftIds);
    setIsCustomizeOpen(false);
    toast.success(`Đã cập nhật bố cục "${layout.label}"`);
  };

  const handleResetPreset = () => {
    resetPreset();
    setIsCustomizeOpen(false);
    toast.success(`Đã khôi phục "${layout.label}" về mặc định`);
  };

  return (
    <div className="space-y-6 pb-20 kos-rise">
      {/* Top Header */}
      <PageHeader
        title="Bảng điều khiển · Dịch vụ dọn dẹp"
        description={`${dateRange.fromDate} — ${dateRange.toDate} · Hà Nội & TP. HCM`}
        actions={
          <>
            <PresetSelect />
            {!isServiceReport && (
              <>
                <AdminButton
                  variant={isEditMode ? "primary" : "secondary"}
                  onClick={() => setEditMode(!isEditMode)}
                  icon={isEditMode ? <Check className="size-4" /> : <LayoutGrid className="size-4" />}
                >
                  {isEditMode ? "Xong sắp xếp" : "Sắp xếp"}
                </AdminButton>
                <AdminButton
                  variant="secondary"
                  onClick={handleOpenCustomize}
                  icon={<Settings2 className="size-4" />}
                >
                  Tuỳ chỉnh
                </AdminButton>
                <DateRangeFilter />
                <AdminButton
                  variant="primary"
                  onClick={() => toast.success("Đang xuất báo cáo...")}
                  icon={<Download className="size-4" />}
                >
                  Xuất báo cáo
                </AdminButton>
              </>
            )}
          </>
        }
      />

      {/* Edit Mode Banner */}
      {isEditMode && (
        <div
          className="flex items-center gap-2 rounded-xl border px-4 py-3 text-xs animate-in slide-in-from-top-2 duration-300"
          style={{
            background: "var(--c-primary-soft)",
            borderColor: "var(--c-line)",
            color: "var(--c-primary-strong)",
          }}
        >
          <LayoutGrid className="size-4 shrink-0" />
          <span>
            Đang ở chế độ sắp xếp — kéo thả để đổi vị trí, kéo góc dưới-phải để chỉnh kích cỡ (cả rộng lẫn cao). Thay đổi tự động lưu lại.
          </span>
          <AdminButton variant="secondary" size="sm" className="ml-auto h-7" onClick={() => setEditMode(false)}>
            Xong
          </AdminButton>
        </div>
      )}

      {/* Service Reports — render khi chọn preset 'services' */}
      {isServiceReport && (
        <ServicePackageReportsPage embedded />
      )}

      {/* Widgets Grid — render khi các preset thông thường */}
      {!isServiceReport && mounted && (
        <GridResponsive
          className={cn("dashboard-grid -mx-1", isEditMode && "is-editing")}
          layout={rglLayout}
          cols={GRID_COLS}
          rowHeight={ROW_HEIGHT}
          margin={GRID_MARGIN}
          containerPadding={[4, 0]}
          isDraggable={isEditMode}
          isResizable={isEditMode}
          resizeHandles={["se"]}
          draggableCancel=".widget-no-drag"
          compactType="vertical"
          useCSSTransforms
          onDragStop={persistLayout}
          onResizeStop={persistLayout}
        >
          {visibleWidgets.map(({ id }) => (
            <div
              key={id}
              className={cn(
                "group relative overflow-hidden rounded-2xl transition-shadow",
                isEditMode &&
                  "cursor-grab border-2 border-dashed border-[var(--c-primary)]/40 active:cursor-grabbing"
              )}
            >
              {/* Widget Action Tools */}
              {isEditMode && (
                <div className="widget-no-drag absolute right-2.5 top-2.5 z-20 flex items-center gap-1 rounded-lg border border-[var(--c-line)] bg-[var(--c-card)]/90 p-1 shadow-sm backdrop-blur">
                  <span className="cursor-grab p-1 text-[var(--c-muted)]">
                    <GripVertical className="size-3.5" />
                  </span>
                  <button
                    title="Ẩn"
                    onClick={() => {
                      hideWidget(id);
                      toast(`Đã ẩn widget · có thể bật lại trong mục Tuỳ chỉnh`);
                    }}
                    className="rounded p-1 text-[var(--c-muted)] transition-colors hover:bg-[var(--c-card-2)] hover:text-[var(--c-ink)]"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              )}
              <div className="h-full w-full overflow-auto">{WIDGET_MAP[id]}</div>
            </div>
          ))}
        </GridResponsive>
      )}

      {/* Customize Layout Modal */}
      <AdminDialog
        open={isCustomizeOpen}
        onOpenChange={setIsCustomizeOpen}
        size="lg"
        title="Tuỳ chỉnh dashboard"
        footer={
          <div className="flex w-full items-center justify-between gap-3">
            <AdminButton
              variant="secondary"
              size="sm"
              onClick={handleResetPreset}
              icon={<RotateCcw className="size-3.5" />}
            >
              Khôi phục mặc định
            </AdminButton>
            <div className="flex gap-2">
              <AdminButton variant="ghost" size="sm" onClick={() => setIsCustomizeOpen(false)}>
                Huỷ
              </AdminButton>
              <AdminButton variant="primary" size="sm" onClick={handleApplyCustomize}>
                Áp dụng
              </AdminButton>
            </div>
          </div>
        }
      >
        <p className="text-xs leading-relaxed text-[var(--c-muted)]">
          Chọn widget muốn hiển thị. Sau khi đóng hộp thoại, bật chế độ{" "}
          <strong className="text-[var(--c-ink)]">Sắp xếp</strong> để kéo thả vị trí và kéo góc chỉnh
          kích cỡ.{" "}
          <strong className="text-[var(--c-ink)]">
            Đang bật {draftIds.length} / {Object.keys(WIDGET_INFO).length} widget
          </strong>
        </p>

        <div className="mt-5 space-y-5">
          {GROUPS.map((group) => {
            const groupWidgets = Object.entries(WIDGET_INFO).filter(([, info]) => info.group === group);
            if (groupWidgets.length === 0) return null;

            return (
              <div key={group} className="space-y-2.5">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-[var(--c-muted)]">
                  {group}
                  <span className="rounded-full bg-[var(--c-card-2)] px-2 py-0.5 text-[10px] lowercase font-medium text-[var(--c-muted)]">
                    {groupWidgets.length} widget
                  </span>
                </div>
                <div className="space-y-2">
                  {groupWidgets.map(([id, info]) => {
                    const isChecked = draftIds.includes(id as WidgetId);
                    const size = DEFAULT_SIZE[id as WidgetId];

                    return (
                      <label
                        key={id}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-colors",
                          isChecked
                            ? "border-[var(--c-primary)]/30 bg-[var(--c-primary-soft)]"
                            : "border-[var(--c-line)] hover:bg-[var(--c-card-2)]"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => handleToggleWidgetOption(id as WidgetId, e.target.checked)}
                          className="size-4 shrink-0 cursor-pointer rounded accent-[var(--c-primary)]"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold leading-tight text-[var(--c-ink)]">
                            {info.title}
                          </div>
                          <div className="mt-0.5 truncate text-[11px] leading-tight text-[var(--c-muted)]">
                            {info.desc}
                          </div>
                        </div>
                        <span className="shrink-0 rounded bg-[var(--c-card-2)] px-2 py-1 text-[10px] font-bold text-[var(--c-muted)] tabular-nums">
                          {size.w}×{size.h}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </AdminDialog>
    </div>
  );
}
