import {
  vietnamStartOfDay,
  vietnamEndOfDayExclusive,
} from './vietnam-time.helper';

/** Kỳ lọc dạng chuỗi ngày 'YYYY-MM-DD' mà các báo cáo admin nhận từ query. */
export interface ReportRangeQuery {
  fromDate?: string;
  toDate?: string;
}

/**
 * Quy kỳ lọc về cặp mốc `[from, to)` để đưa xuống SQL.
 *
 * Cận trên KHÔNG BAO GỒM — mọi nơi dùng phải so `< to`, không phải `<=`. Xem
 * `vietnamEndOfDayExclusive` để biết vì sao mốc 23:59:59.999 là không đủ với
 * cột `timestamp` micro giây của Postgres.
 *
 * Thiếu `toDate` thì lấy "bây giờ", thiếu `fromDate` thì lùi lại `defaultDays`
 * — luôn có cận dưới để truy vấn không bao giờ quét toàn bảng khi dữ liệu lớn
 * dần.
 */
export function resolveReportRange(
  query: ReportRangeQuery,
  defaultDays: number,
): [Date, Date] {
  const to = query.toDate ? vietnamEndOfDayExclusive(query.toDate) : new Date();
  const from = query.fromDate
    ? vietnamStartOfDay(query.fromDate)
    : new Date(to.getTime() - defaultDays * 24 * 3600 * 1000);
  return [from, to];
}

/**
 * Nhãn kỳ lọc để in vào file. Cận trên là mốc KHÔNG bao gồm, in thẳng ra sẽ
 * thành "báo cáo tháng 7 … đến 01/08" — nên có chuỗi ngày người dùng chọn thì
 * dùng luôn, không có thì lùi 1ms để về lại ngày cuối kỳ thật.
 */
export function formatReportRangeLabel(
  query: ReportRangeQuery,
  range: [Date, Date],
): { from: string; to: string } {
  const asDate = (d: Date) =>
    d.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  const fromStr = (s: string) => {
    const [y, m, d] = s.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  };

  return {
    from: query.fromDate ? fromStr(query.fromDate) : asDate(range[0]),
    to: query.toDate
      ? fromStr(query.toDate)
      : asDate(new Date(range[1].getTime() - 1)),
  };
}
