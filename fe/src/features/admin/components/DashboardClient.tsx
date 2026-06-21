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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
    <Card className="border border-border bg-card shadow-sm rounded-2xl h-full flex flex-col justify-between">
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-[15px] font-semibold text-foreground">Chỉ số phụ</h3>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-3">
          {m.map((x) => (
            <div key={x[0]} className="bg-muted/40 rounded-xl p-3">
              <div className="text-[11.5px] text-muted-foreground truncate font-medium">
                {x[0]}
              </div>
              <div className="text-lg font-bold text-foreground mt-1">
                {x[1]}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
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
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Dashboard · Dịch vụ dọn dẹp
          </h1>
          <p className="text-xs text-muted-foreground mt-1 font-medium">
            {dateRange.fromDate} — {dateRange.toDate} · Hà Nội &amp; TP. HCM
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <PresetSelect />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditMode(!isEditMode)}
            className={cn("h-9 px-4 text-xs font-semibold rounded-xl gap-1.5 shadow-sm", isEditMode && "bg-primary text-primary-foreground hover:bg-primary/95")}
          >
            {isEditMode ? (
              <>
                <Check className="w-4 h-4" /> Xong sắp xếp
              </>
            ) : (
              <>
                <LayoutGrid className="w-4 h-4" /> Sắp xếp
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenCustomize}
            className="h-9 px-4 text-xs font-semibold rounded-xl gap-1.5 shadow-sm"
          >
            <Settings2 className="w-4 h-4" /> Tuỳ chỉnh
          </Button>
          <DateRangeFilter />
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 px-4 text-xs font-semibold rounded-xl gap-1.5 shadow-sm"
            onClick={() => toast.success("Đang xuất báo cáo...")}
          >
            <Download className="w-4 h-4" /> Xuất báo cáo
          </Button>
        </div>
      </div>

      {/* Edit Mode Banner */}
      {isEditMode && (
        <div className="flex items-center gap-2 bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs py-3 px-4 rounded-xl shadow-sm animate-in slide-in-from-top-2 duration-300">
          <LayoutGrid className="w-4 h-4 shrink-0" />
          <span>
            Đang ở chế độ sắp xếp — kéo thả để đổi vị trí, kéo góc dưới-phải để chỉnh kích cỡ (cả rộng lẫn cao). Thay đổi tự động lưu lại.
          </span>
          <Button
            size="sm"
            variant="outline"
            className="ml-auto h-7 px-3 text-[11px] rounded-lg bg-background font-semibold"
            onClick={() => setEditMode(false)}
          >
            Xong
          </Button>
        </div>
      )}

      {/* Widgets Grid */}
      {mounted && (
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
                "relative group overflow-hidden rounded-2xl transition-shadow",
                isEditMode &&
                  "cursor-grab active:cursor-grabbing border-2 border-dashed border-muted-foreground/35"
              )}
            >
              {/* Widget Action Tools */}
              {isEditMode && (
                <div className="widget-no-drag absolute top-2.5 right-2.5 z-20 flex items-center gap-1 bg-background/90 backdrop-blur border border-border p-1 rounded-lg shadow-sm">
                  <span className="cursor-grab text-muted-foreground/60 p-1">
                    <GripVertical className="w-3.5 h-3.5" />
                  </span>
                  <button
                    title="Ẩn"
                    onClick={() => {
                      hideWidget(id);
                      toast(`Đã ẩn widget · có thể bật lại trong mục Tuỳ chỉnh`);
                    }}
                    className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <div className="h-full w-full overflow-auto">{WIDGET_MAP[id]}</div>
            </div>
          ))}
        </GridResponsive>
      )}

      {/* Customize Layout Modal */}
      {isCustomizeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 border-b border-border bg-card">
              <h2 className="text-[17px] font-semibold text-foreground">Tuỳ chỉnh dashboard</h2>
              <button
                onClick={() => setIsCustomizeOpen(false)}
                className="text-muted-foreground hover:text-foreground text-xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Chọn widget muốn hiển thị. Sau khi đóng hộp thoại, bật chế độ{" "}
                <strong className="text-foreground">Sắp xếp</strong> để kéo thả vị trí và kéo góc chỉnh
                kích cỡ.{" "}
                <strong className="text-foreground">
                  Đang bật {draftIds.length} / {Object.keys(WIDGET_INFO).length} widget
                </strong>
              </p>

              {/* Grouped Widgets List */}
              <div className="space-y-5">
                {GROUPS.map((group) => {
                  const groupWidgets = Object.entries(WIDGET_INFO).filter(
                    ([, info]) => info.group === group
                  );
                  if (groupWidgets.length === 0) return null;

                  return (
                    <div key={group} className="space-y-2.5">
                      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        {group}
                        <span className="bg-muted px-2 py-0.5 rounded-full text-[10px] lowercase text-muted-foreground font-medium">
                          {groupWidgets.length} widget
                        </span>
                      </div>
                      <div className="space-y-2">
                        {groupWidgets.map(([id, info]) => {
                          const isChecked = draftIds.includes(id as WidgetId);
                          const size = DEFAULT_SIZE[id as WidgetId];

                          return (
                            <div
                              key={id}
                              className={cn(
                                "flex items-center gap-3 p-3.5 border border-border rounded-xl transition-colors",
                                isChecked && "bg-primary/5 border-primary/20"
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => handleToggleWidgetOption(id as WidgetId, e.target.checked)}
                                className="w-4 h-4 accent-primary cursor-pointer shrink-0 rounded"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold text-foreground leading-tight">
                                  {info.title}
                                </div>
                                <div className="text-[11px] text-muted-foreground truncate mt-0.5 leading-tight">
                                  {info.desc}
                                </div>
                              </div>
                              <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-1 rounded shrink-0">
                                {size.w}×{size.h}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center p-4 border-t border-border bg-card gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetPreset}
                className="text-xs font-semibold h-9 rounded-xl gap-1.5 shadow-sm shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Khôi phục mặc định
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCustomizeOpen(false)}
                  className="text-xs font-semibold h-9 rounded-xl px-4"
                >
                  Huỷ
                </Button>
                <Button
                  size="sm"
                  onClick={handleApplyCustomize}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold h-9 rounded-xl px-4 shadow-sm"
                >
                  Áp dụng
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
