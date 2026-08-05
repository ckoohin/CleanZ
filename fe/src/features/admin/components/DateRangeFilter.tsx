"use client";

import { useDashboardStore } from "../stores/dashboard.store";
import { DateRangePicker } from "./DateRangePicker";

/**
 * Kỳ thống kê dùng chung cho CẢ TRANG dashboard. Mọi widget theo kỳ đều đọc
 * cùng khoảng này — nhờ đó "Xuất báo cáo" có đúng một kỳ để ghi vào file.
 *
 * Lớp mỏng nối `DateRangePicker` (bản có điều khiển, dùng được ở mọi màn hình)
 * với store dashboard.
 */
export function DateRangeFilter() {
  const range = useDashboardStore((s) => s.dateRange);
  const setDateRange = useDashboardStore((s) => s.setDateRange);

  return <DateRangePicker value={range} onChange={setDateRange} />;
}
