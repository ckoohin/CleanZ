import type { CategoryKey, WidgetId } from "../types/dashboard.types";

export const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: "overview", label: "Tổng quan" },
  { key: "finance", label: "Tài chính" },
  { key: "operations", label: "Vận hành" },
  { key: "tasker", label: "Tasker" },
  { key: "cs", label: "CS / Chăm sóc KH" },
  { key: "marketing", label: "Marketing" },
  { key: "services", label: "Báo cáo Dịch vụ" },
];

/** Bề rộng widget trên lưới 12 cột. Chỉ nhận các mốc chia hết 12. */
export type Span = 3 | 4 | 6 | 8 | 12;

/**
 * Tailwind quét class theo chuỗi tĩnh — `col-span-${n}` sẽ KHÔNG được sinh ra.
 * Phải là map literal thế này.
 */
export const SPAN_CLASS: Record<Span, string> = {
  3: "col-span-12 sm:col-span-6 xl:col-span-3",
  4: "col-span-12 md:col-span-6 xl:col-span-4",
  6: "col-span-12 lg:col-span-6",
  8: "col-span-12 lg:col-span-8",
  12: "col-span-12",
};

export interface LayoutItem {
  id: WidgetId;
  span: Span;
}

/**
 * Bố cục cố định của từng danh mục. 'services' rỗng — DashboardClient render
 * ServicePackageReportsPage thay cho lưới widget.
 */
export const CATEGORY_LAYOUT: Record<CategoryKey, LayoutItem[]> = {
  overview: [
    { id: "alerts", span: 12 },
    { id: "kpiRevenue", span: 3 },
    { id: "kpiOrders", span: 3 },
    { id: "kpiTaskers", span: 3 },
    { id: "kpiCancel", span: 3 },
    { id: "chart", span: 8 },
    { id: "reviews", span: 4 },
    { id: "statuses", span: 12 },
    { id: "recent", span: 12 },
  ],
  finance: [
    { id: "kpiRevenue", span: 3 },
    { id: "kpiGMV", span: 3 },
    { id: "kpiRefund", span: 3 },
    { id: "kpiAOV", span: 3 },
    { id: "chart", span: 12 },
    { id: "paymentMix", span: 6 },
    { id: "feeBreakdown", span: 6 },
  ],
  operations: [
    { id: "alerts", span: 12 },
    { id: "statuses", span: 12 },
    { id: "kpiTaskers", span: 4 },
    { id: "areaPerf", span: 4 },
    { id: "peakHours", span: 4 },
    { id: "cancelReasons", span: 6 },
    { id: "recurring", span: 6 },
    { id: "topTaskers", span: 6 },
    { id: "recent", span: 6 },
  ],
  tasker: [
    { id: "kpiTaskers", span: 3 },
    { id: "taskerLevels", span: 3 },
    { id: "topTaskers", span: 3 },
    { id: "docExpiry", span: 3 },
  ],
  cs: [
    { id: "alerts", span: 12 },
    { id: "kpiNPS", span: 4 },
    { id: "reviews", span: 4 },
    { id: "feedback", span: 4 },
    { id: "recent", span: 12 },
  ],
  marketing: [
    { id: "kpiNewCust", span: 3 },
    { id: "kpiRetention", span: 3 },
    { id: "voucherPerf", span: 6 },
    { id: "areaPerf", span: 6 },
    { id: "chart", span: 6 },
  ],
  services: [],
};
