export const INCIDENT_HOUSEKEEPING_INTERVAL_MS =
  'INCIDENT_HOUSEKEEPING_INTERVAL_MS';
export const INCIDENT_NOTIFICATION_OUTBOX_INTERVAL_MS =
  'INCIDENT_NOTIFICATION_OUTBOX_INTERVAL_MS';
export const INCIDENT_NOTIFICATION_OUTBOX_BATCH_SIZE =
  'INCIDENT_NOTIFICATION_OUTBOX_BATCH_SIZE';
export const INCIDENT_NOTIFICATION_OUTBOX_MAX_RETRIES =
  'INCIDENT_NOTIFICATION_OUTBOX_MAX_RETRIES';

export const IC_CONFIG_KEYS = {
  REPORT_WINDOW_HOURS: 'INCIDENT_REPORT_WINDOW_HOURS',
  REPORT_WINDOW_SEVERE_HOURS: 'INCIDENT_REPORT_WINDOW_SEVERE_HOURS',
  SEVERE_CRITERIA: 'INCIDENT_SEVERE_CRITERIA',
  CLAIM_MAX_AMOUNT: 'INCIDENT_CLAIM_MAX_AMOUNT',
  COMPENSATION_POLICY_CAP: 'INCIDENT_COMPENSATION_POLICY_CAP',
  RESPONSE_WINDOW_HOURS: 'INCIDENT_RESPONSE_WINDOW_HOURS',
  AUTOCLOSE_HOURS: 'INCIDENT_AUTOCLOSE_HOURS',
  DEBT_WRITE_OFF_AFTER_DAYS: 'INCIDENT_DEBT_WRITE_OFF_AFTER_DAYS',
  REPORTED_EXPIRY_DAYS: 'INCIDENT_REPORTED_EXPIRY_DAYS',
  EVIDENCE_ORPHAN_AFTER_HOURS: 'INCIDENT_EVIDENCE_ORPHAN_AFTER_HOURS',
  SLA_MATRIX: 'INCIDENT_SLA_MATRIX',
  FALSE_REPORT_STRIKES: 'INCIDENT_FALSE_REPORT_STRIKES',
  SYSTEM_WALLET_MIN_BALANCE: 'INCIDENT_SYSTEM_WALLET_MIN_BALANCE',
} as const;

export const IC_DEFAULTS = {
  REPORT_WINDOW_HOURS: 48,
  REPORT_WINDOW_SEVERE_HOURS: 72,
  /** Trần cho TỔNG yêu cầu của một sự cố (không phải từng hạng mục). */
  CLAIM_MAX_AMOUNT: 20_000_000,
  COMPENSATION_POLICY_CAP: 10_000_000,
  /** Một cửa sổ phản biện DUY NHẤT — không còn cơ chế gia hạn bắt buộc. */
  RESPONSE_WINDOW_HOURS: 48,
  AUTOCLOSE_HOURS: 48,
  /** Nợ để quá ngần này ngày mà không thu được thì Admin mới được xoá nợ. */
  DEBT_WRITE_OFF_AFTER_DAYS: 90,
  REPORTED_EXPIRY_DAYS: 30,
  /**
   * Ảnh đã upload nhưng chưa gắn vào sự cố nào sau ngần này giờ thì coi là bỏ dở và dọn.
   * Phải rộng rãi: người dùng upload xong có thể điền form dở rồi quay lại sau.
   */
  EVIDENCE_ORPHAN_AFTER_HOURS: 24,
  SEVERE_AMOUNT: 5_000_000,
  MAJOR_AMOUNT: 1_000_000,
  SYSTEM_WALLET_MIN_BALANCE: 5_000_000,
};

/**
 * Hạn mức VỆ SINH ĐẦU VÀO — không phải chính sách nghiệp vụ.
 *
 * Phân biệt này quan trọng: trần bồi thường và trần yêu cầu là CHÍNH SÁCH, sống trong
 * `system_configs` và do service kiểm. Những con số dưới đây chỉ để chặn payload phi lý
 * trước khi nó chạm tới DB. Trước đây `@Max(20_000_000)` trong DTO chép cứng đúng giá trị
 * của `INCIDENT_CLAIM_MAX_AMOUNT`, tạo ra hai nguồn sự thật cho cùng một hạn mức — hạ config
 * xuống thì decorator vẫn cho qua 20 triệu, và không ai nhận ra cho tới khi soi từng dòng.
 */
export const IC_INPUT_LIMITS = {
  /** Mô tả sự cố: đủ cho một tường thuật dài, chặn trước khi thành bãi rác văn bản. */
  DESCRIPTION_MAX: 5_000,
  /** Số hạng mục thiệt hại trong MỘT sự cố. */
  DAMAGE_ITEMS_MAX: 20,
  /** Ảnh cho mỗi hạng mục / mỗi lần giải trình. */
  EVIDENCE_MAX: 10,
  /** Trang lớn nhất cho danh sách sự cố — chặn `?limit=99999` vét sạch bảng. */
  PAGE_SIZE_MAX: 100,
  /**
   * Chặn số tiền phi lý ở tầng kiểu dữ liệu. KHÔNG phải trần chính sách: trần thật là
   * `INCIDENT_CLAIM_MAX_AMOUNT` / `INCIDENT_COMPENSATION_POLICY_CAP`, service kiểm trên TỔNG.
   */
  AMOUNT_SANITY_MAX: 1_000_000_000,
} as const;

export interface SevereCriteria {
  categories?: string[];
  severeAmount?: number;
  majorAmount?: number;
}
