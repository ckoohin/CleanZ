"use client";

import React from "react";
import {
  LayoutGrid,
  Settings2,
  Download,
  GripVertical,
  Minus,
  Plus,
  X,
  RotateCcw,
  Check,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { useDashboardStore, PRESETS } from "../stores/dashboard.store";
import type { WidgetId, PresetKey } from "../types/dashboard.types";

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

const COL_SPAN_CLASS: Record<number, string> = {
  2: "col-span-12 lg:col-span-4", // 1/3 width
  3: "col-span-12 lg:col-span-6", // 1/2 width
  4: "col-span-12 lg:col-span-8", // 2/3 width
  6: "col-span-12",               // full width
};

const WIDGET_INFO: Record<WidgetId, { title: string; desc: string; defaultColSpan: 2 | 3 | 4 | 6; group: string }> = {
  alerts: { title: "Cần xử lý ngay", desc: "Việc tồn đọng cần hành động khẩn cấp", defaultColSpan: 6, group: "Cảnh báo" },
  kpiRevenue: { title: "KPI · Doanh thu hoa hồng", desc: "Hoa hồng nền tảng (bookings × rate)", defaultColSpan: 2, group: "Tài chính" },
  kpiGMV: { title: "KPI · GMV", desc: "Tổng giá trị giao dịch (bookings.total_price)", defaultColSpan: 2, group: "Tài chính" },
  kpiAOV: { title: "KPI · Giá trị đơn TB", desc: "GMV / số đơn hoàn tất", defaultColSpan: 2, group: "Tài chính" },
  kpiRefund: { title: "KPI · Tiền hoàn", desc: "payments REFUNDED + cancellation refund", defaultColSpan: 2, group: "Tài chính" },
  kpiOrders: { title: "KPI · Đơn hàng", desc: "Tổng đơn trong kỳ", defaultColSpan: 2, group: "Đơn hàng" },
  kpiCancel: { title: "KPI · Tỉ lệ huỷ", desc: "(cancelled + expired) / tổng", defaultColSpan: 2, group: "Đơn hàng" },
  kpiTaskers: { title: "KPI · Tasker online", desc: "taskers ACTIVE đang online", defaultColSpan: 2, group: "Tasker" },
  kpiNewCust: { title: "KPI · Khách mới", desc: "customers tạo trong kỳ", defaultColSpan: 2, group: "Khách hàng" },
  kpiRetention: { title: "KPI · Tỉ lệ quay lại", desc: "customers có total_bookings ≥ 2", defaultColSpan: 2, group: "Khách hàng" },
  kpiNPS: { title: "KPI · NPS", desc: "Net Promoter Score từ reviews", defaultColSpan: 2, group: "Chất lượng" },
  chart: { title: "Biểu đồ GMV & số đơn", desc: "Xu hướng 7 ngày · bookings theo ngày", defaultColSpan: 4, group: "Đơn hàng" },
  statuses: { title: "Đơn theo trạng thái", desc: "Ảnh chụp hiện tại · bookings.status", defaultColSpan: 6, group: "Đơn hàng" },
  recent: { title: "Đơn hàng gần đây", desc: "Bảng đơn mới nhất", defaultColSpan: 3, group: "Đơn hàng" },
  recurring: { title: "Đơn định kỳ", desc: "bookings.is_recurring = true", defaultColSpan: 3, group: "Đơn hàng" },
  cancelReasons: { title: "Lý do huỷ đơn", desc: "cancellation_logs theo cancelled_by", defaultColSpan: 3, group: "Đơn hàng" },
  paymentMix: { title: "Cơ cấu thanh toán", desc: "payments theo method", defaultColSpan: 3, group: "Tài chính" },
  feeBreakdown: { title: "Phân tích phụ phí", desc: "peak_fee / pet_fee / waiting_fee", defaultColSpan: 3, group: "Tài chính" },
  taskerLevels: { title: "Phân bố level Tasker", desc: "taskers theo tasker_levels", defaultColSpan: 3, group: "Tasker" },
  topTaskers: { title: "Top Tasker", desc: "taskers theo rating & số ca", defaultColSpan: 3, group: "Tasker" },
  docExpiry: { title: "Giấy tờ sắp hết hạn", desc: "tasker_documents.expired_date gần", defaultColSpan: 3, group: "Tasker" },
  reviews: { title: "Đánh giá", desc: "reviews · điểm & 4 tiêu chí", defaultColSpan: 3, group: "Chất lượng" },
  feedback: { title: "Feedback mới nhất", desc: "reviews.comment gần đây", defaultColSpan: 3, group: "Chất lượng" },
  voucherPerf: { title: "Hiệu quả voucher", desc: "vouchers · used_count / usage_limit", defaultColSpan: 3, group: "Marketing" },
  areaPerf: { title: "Đơn theo khu vực", desc: "bookings theo service_areas", defaultColSpan: 3, group: "Vận hành" },
  peakHours: { title: "Khung giờ cao điểm", desc: "bookings theo scheduled_start", defaultColSpan: 3, group: "Vận hành" },
  extras: { title: "Chỉ số phụ", desc: "AOV, khách mới, voucher, ticket…", defaultColSpan: 6, group: "Khác" },
};

const GROUPS = ["Cảnh báo", "Tài chính", "Đơn hàng", "Tasker", "Khách hàng", "Chất lượng", "Marketing", "Vận hành", "Khác"];

function ExtrasWidget() {
  const m = [
    ["Giá trị đơn TB", "2,67M đ"],
    ["Khách mới hôm nay", "18"],
    ["Voucher đã dùng", "64"],
    ["Xử lý ticket TB", "3,2h"],
    ["Đơn định kỳ", "37"],
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

type WidgetConfig = { id: WidgetId; colSpan: 2 | 3 | 4 | 6 };

export function DashboardClient() {
  const {
    currentPreset,
    dateRange,
    isEditMode,
    presets,
    setEditMode,
    reorderWidgets,
    resizeWidget,
    hideWidget,
    applyCustomLayout,
    resetPreset,
  } = useDashboardStore();

  const [isCustomizeOpen, setIsCustomizeOpen] = React.useState(false);
  const [draftLayout, setDraftLayout] = React.useState<WidgetConfig[]>([]);

  const layout = presets[currentPreset] || { label: "", widgets: [] };
  const visibleWidgets = layout.widgets;

  // Track the index of the element being dragged
  const [draggedIdx, setDraggedIdx] = React.useState<number | null>(null);

  const handleOpenCustomize = () => {
    setDraftLayout([...visibleWidgets]);
    setIsCustomizeOpen(true);
  };

  const handleToggleWidgetOption = (id: WidgetId, checked: boolean) => {
    if (checked) {
      if (!draftLayout.some((w) => w.id === id)) {
        setDraftLayout([...draftLayout, { id, colSpan: WIDGET_INFO[id].defaultColSpan }]);
      }
    } else {
      setDraftLayout(draftLayout.filter((w) => w.id !== id));
    }
  };

  const handlePickSize = (id: WidgetId, span: 2 | 3 | 4 | 6) => {
    setDraftLayout(
      draftLayout.map((w) => (w.id === id ? { ...w, colSpan: span } : w))
    );
  };

  const handleApplyCustomize = () => {
    applyCustomLayout(draftLayout);
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
            Đang ở chế độ sắp xếp — kéo thả widget để đổi vị trí, dùng nút trên mỗi widget để thay đổi kích cỡ hoặc ẩn. Thay đổi sẽ tự động lưu lại.
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
      <div className="grid grid-cols-12 gap-5">
        {visibleWidgets.map(({ id, colSpan }, idx) => {
          const isDraggingThis = draggedIdx === idx;
          return (
            <div
              key={id}
              draggable={isEditMode}
              onDragStart={(e) => {
                setDraggedIdx(idx);
                e.dataTransfer.setData("text/plain", String(idx));
              }}
              onDragEnd={() => {
                setDraggedIdx(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                const fromIdx = Number(e.dataTransfer.getData("text/plain"));
                if (fromIdx !== idx) {
                  reorderWidgets(fromIdx, idx);
                }
              }}
              className={cn(
                COL_SPAN_CLASS[colSpan] ?? "col-span-12",
                "relative group transition-all duration-200",
                isEditMode && "cursor-grab border-dashed border-2 border-muted-foreground/35 rounded-2xl active:cursor-grabbing",
                isDraggingThis && "opacity-30 scale-[0.98]"
              )}
            >
              {/* Widget Action Tools */}
              {isEditMode && (
                <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1 bg-background/90 backdrop-blur border border-border p-1 rounded-lg shadow-sm">
                  <span className="cursor-grab text-muted-foreground/60 p-1 hover:text-foreground">
                    <GripVertical className="w-3.5 h-3.5" />
                  </span>
                  <button
                    title="Hẹp hơn"
                    onClick={() => resizeWidget(id, -1)}
                    className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    title="Rộng hơn"
                    onClick={() => resizeWidget(id, 1)}
                    className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
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
              {WIDGET_MAP[id]}
            </div>
          );
        })}
      </div>

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
                Chọn widget muốn hiển thị và độ rộng tương ứng. Bạn cũng có thể kéo thả để sắp xếp vị trí sau khi đóng hộp thoại.{" "}
                <strong className="text-foreground">
                  Đang bật {draftLayout.length} / {Object.keys(WIDGET_INFO).length} widget
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
                          const config = draftLayout.find((w) => w.id === id);
                          const isChecked = !!config;
                          const currentSpan = config ? config.colSpan : info.defaultColSpan;

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
                              {/* Size Picker */}
                              <div
                                className={cn(
                                  "flex gap-1 shrink-0 transition-opacity",
                                  !isChecked && "opacity-35 pointer-events-none"
                                )}
                              >
                                {([2, 3, 4, 6] as const).map((s) => {
                                  const label = { 2: "⅓", 3: "½", 4: "⅔", 6: "Cả hàng" }[s];
                                  return (
                                    <button
                                      key={s}
                                      onClick={() => handlePickSize(id as WidgetId, s)}
                                      className={cn(
                                        "text-[10px] font-bold px-2 py-1 border border-border rounded bg-background text-muted-foreground hover:bg-muted transition-colors",
                                        isChecked && currentSpan === s && "bg-primary text-primary-foreground border-primary hover:bg-primary/95 shadow-sm"
                                      )}
                                    >
                                      {label}
                                    </button>
                                  );
                                })}
                              </div>
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
