import type { DateRange, GroupBy } from "../types/dashboard.types";

/**
 * Độ mịn của trục thời gian trên biểu đồ. Backend có bản sao y hệt trong
 * `admin-dashboard-report.service.ts` — sửa một bên phải sửa cả hai, nếu không
 * mốc thời gian trong file Excel sẽ lệch với biểu đồ trên màn hình.
 */
export function calcGroupBy(fromDate: string, toDate: string): GroupBy {
  const days =
    (new Date(toDate).getTime() - new Date(fromDate).getTime()) /
    (1000 * 60 * 60 * 24);
  if (days <= 14) return "day";
  if (days <= 90) return "week";
  return "month";
}

/** Các kỳ dựng sẵn cho từng widget. `custom` = tự chọn ngày trên lịch. */
export type RangeKey =
  | "today"
  | "last7"
  | "thisWeek"
  | "last30"
  | "thisMonth"
  | "thisQuarter"
  | "thisYear"
  | "custom";

export const RANGE_OPTIONS: { key: Exclude<RangeKey, "custom">; label: string }[] = [
  { key: "today", label: "Hôm nay" },
  { key: "last7", label: "7 ngày qua" },
  { key: "thisWeek", label: "Tuần này" },
  { key: "last30", label: "30 ngày qua" },
  { key: "thisMonth", label: "Tháng này" },
  { key: "thisQuarter", label: "Quý này" },
  { key: "thisYear", label: "Năm nay" },
];

/** Định dạng theo giờ ĐỊA PHƯƠNG. Dùng toISOString() sẽ lệch 1 ngày vì nó đổi sang UTC. */
export function fmtDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function startOfWeek(now: Date): Date {
  const day = now.getDay(); // 0 = Chủ nhật
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  return monday;
}

export function rangeOf(key: Exclude<RangeKey, "custom">): DateRange {
  const now = new Date();

  switch (key) {
    case "today":
      return { fromDate: fmtDate(now), toDate: fmtDate(now) };

    case "last7": {
      const from = new Date(now);
      from.setDate(now.getDate() - 6);
      return { fromDate: fmtDate(from), toDate: fmtDate(now) };
    }

    case "thisWeek": {
      const monday = startOfWeek(now);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { fromDate: fmtDate(monday), toDate: fmtDate(sunday) };
    }

    case "last30": {
      const from = new Date(now);
      from.setDate(now.getDate() - 29);
      return { fromDate: fmtDate(from), toDate: fmtDate(now) };
    }

    case "thisMonth":
      return {
        fromDate: fmtDate(new Date(now.getFullYear(), now.getMonth(), 1)),
        toDate: fmtDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      };

    case "thisQuarter": {
      const q = Math.floor(now.getMonth() / 3);
      return {
        fromDate: fmtDate(new Date(now.getFullYear(), q * 3, 1)),
        toDate: fmtDate(new Date(now.getFullYear(), q * 3 + 3, 0)),
      };
    }

    case "thisYear":
      return {
        fromDate: fmtDate(new Date(now.getFullYear(), 0, 1)),
        toDate: fmtDate(new Date(now.getFullYear(), 11, 31)),
      };
  }
}

/** Khoảng ngày này có trùng khít một kỳ dựng sẵn nào không? */
export function matchRangeKey(range: DateRange): RangeKey {
  for (const { key } of RANGE_OPTIONS) {
    const r = rangeOf(key);
    if (r.fromDate === range.fromDate && r.toDate === range.toDate) return key;
  }
  return "custom";
}

const SHORT = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
};

/** Nhãn ngắn hiển thị trên chip của widget. */
export function rangeLabel(range: DateRange): string {
  const preset = RANGE_OPTIONS.find((o) => o.key === matchRangeKey(range));
  return preset
    ? preset.label
    : `${SHORT(range.fromDate)} – ${SHORT(range.toDate)}`;
}
