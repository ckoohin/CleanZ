const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';
const VIETNAM_TIMEZONE_OFFSET = '+07:00';

/**
 * "Bây giờ" theo GIỜ VIỆT NAM, dạng `timestamp without time zone`.
 *
 * Toàn bộ cột timestamp trong DB lưu theo giờ VN (migration
 * NormalizeTimestampsToVietnamTime). `NOW()` trần trả timestamptz và khi so sánh
 * với cột timestamp sẽ được ép theo TimeZone của SESSION — mà session qua pooler
 * Supabase là UTC ⇒ lệch 7 tiếng. Luôn dùng hằng này thay cho `NOW()` khi so sánh
 * hoặc ghi vào cột `timestamp without time zone`.
 *
 * Ngoại lệ: cột kiểu `timestamptz` (vd. taskers.location_updated_at) thì dùng
 * `NOW()` trần vì so sánh theo mốc tuyệt đối, không phụ thuộc timezone.
 */
export const VN_NOW_SQL = `(NOW() AT TIME ZONE '${VIETNAM_TIMEZONE}')`;

export function createVietnamDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00${VIETNAM_TIMEZONE_OFFSET}`);
}

/**
 * Cận dưới của một kỳ lọc: 00:00:00.000 giờ VN của ngày `date`.
 * Nhận cả 'YYYY-MM-DD' lẫn chuỗi ISO đầy đủ.
 */
export function vietnamStartOfDay(date: string): Date {
  return new Date(
    `${date.slice(0, 10)}T00:00:00.000${VIETNAM_TIMEZONE_OFFSET}`,
  );
}

/**
 * Cận trên của một kỳ lọc: 23:59:59.999 giờ VN của ngày `date`.
 * `new Date('2026-07-31')` là nửa đêm UTC = 07:00 sáng giờ VN, nên dùng thẳng
 * làm cận trên của `BETWEEN` sẽ cắt mất gần trọn ngày cuối kỳ.
 */
export function vietnamEndOfDay(date: string): Date {
  return new Date(
    `${date.slice(0, 10)}T23:59:59.999${VIETNAM_TIMEZONE_OFFSET}`,
  );
}

/**
 * Cận trên KHÔNG bao gồm: 00:00:00.000 giờ VN của NGÀY KẾ TIẾP.
 *
 * Dùng với `< to` thay cho cặp `vietnamEndOfDay` + `<=`. Lý do: cột `timestamp`
 * của Postgres có độ chính xác MICRO giây, còn `Date` của JS chỉ tới mili giây —
 * nên mốc `23:59:59.999` vẫn để lọt mọi bản ghi rơi vào phần nghìn giây cuối
 * ngày (vd `23:59:59.9995`). Đổi toán tử `<=` thành `<` không cứu được, phải
 * đổi chính cách dựng cận trên thành khoảng nửa mở `[from, to)`.
 */
export function vietnamEndOfDayExclusive(date: string): Date {
  // Cộng thẳng 24 giờ thay vì `setDate(+1)`: `setDate` cộng theo LỊCH của múi
  // giờ tiến trình, nên nếu tiến trình chạy ở múi có DST thì bước nhảy có thể
  // là 23 hoặc 25 giờ và mốc trả về sẽ lệch. Giờ VN không có DST, một ngày
  // luôn đúng 24 giờ — cộng theo mốc tuyệt đối thì đúng ở mọi môi trường.
  return new Date(vietnamStartOfDay(date).getTime() + 24 * 60 * 60 * 1000);
}

export function formatVietnamDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: VIETNAM_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function formatVietnamTime(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: VIETNAM_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

/**
 * Chuỗi SQL expression tính mốc đầu kỳ ('day' | 'week' | 'month') theo giờ
 * Việt Nam, trả về `timestamp without time zone` để so sánh trực tiếp với các
 * cột timestamp (đã chuẩn hoá về giờ VN) và vẫn dùng được index.
 * Tuần bắt đầu thứ 2 (chuẩn DATE_TRUNC của Postgres).
 */
export function vietnamPeriodStartSqlExpr(
  unit: 'day' | 'week' | 'month',
  nowExpr = 'NOW()',
): string {
  return `DATE_TRUNC('${unit}', ${nowExpr} AT TIME ZONE '${VIETNAM_TIMEZONE}')`;
}

/** Wrapper tương thích ngược — xem vietnamPeriodStartSqlExpr. */
export function vietnamWeekStartSqlExpr(nowExpr = 'NOW()'): string {
  return vietnamPeriodStartSqlExpr('week', nowExpr);
}

/**
 * "Bây giờ" dùng để GHI vào / SO SÁNH với cột `timestamp without time zone`.
 *
 * Mọi cột timestamp trong DB lưu theo giờ VN (migration NormalizeTimestampsToVietnamTime),
 * còn driver `pg` thì tuần tự hoá một `Date` theo múi giờ của TIẾN TRÌNH. Nên `new Date()`
 * chỉ ghi đúng khi tiến trình cũng chạy ở giờ VN — deploy ở môi trường UTC là mọi hạn chót
 * do app sinh ra bị lệch 7 tiếng so với các mốc do DB sinh ra, và không có gì báo lỗi.
 *
 * Hàm này dịch mốc hiện tại sao cho khi `pg` tuần tự hoá nó theo giờ tiến trình thì ra
 * đúng giờ VN. Chạy trên máy giờ VN thì đây là phép cộng 0 — không đổi hành vi hiện có,
 * chỉ gỡ sự phụ thuộc ngầm vào `TZ` của môi trường.
 *
 * Dùng cho mốc do APP sinh; mốc lấy từ DB thì truy vấn `VN_NOW_SQL` (không lệch đồng hồ
 * giữa hai máy). Cột `timestamptz` KHÔNG dùng hàm này — chúng so theo mốc tuyệt đối.
 */
export function vietnamNow(at: Date = new Date()): Date {
  const VN_OFFSET_MINUTES = 7 * 60;
  const processOffsetMinutes = -at.getTimezoneOffset();
  return new Date(
    at.getTime() + (VN_OFFSET_MINUTES - processOffsetMinutes) * 60_000,
  );
}

/** `vietnamNow()` lùi lại `ms` — dựng mốc cắt cho các vòng quét dọn dẹp. */
export function vietnamNowMinus(ms: number): Date {
  return new Date(vietnamNow().getTime() - ms);
}
