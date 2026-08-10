/**
 * Mã hành động audit — khoá nghiệp vụ ỔN ĐỊNH của một thao tác admin.
 *
 * Vì sao cần, khi đã có cột `action`? Vì `action` được ghép ở runtime từ
 * `RESOURCE_LABELS` + tên hàm handler (xem `admin-activity.interceptor.ts`), nên
 * nó đổi theo mỗi lần đổi nhãn tiếng Việt hoặc đổi tên method. Một nhật ký mà
 * khoá tra cứu tự đổi nghĩa theo thời gian thì không dựng được báo cáo hay cảnh
 * báo trên đó. `action` từ nay chỉ còn là NHÃN HIỂN THỊ; `action_code` là khoá.
 *
 * Quy ước: `MIỀN.HÀNH_ĐỘNG`, chữ hoa, không dấu. Đã phát hành thì KHÔNG sửa —
 * sửa là làm gãy toàn bộ log lịch sử đang mang mã cũ; cần nghĩa mới thì thêm mã mới.
 */
export const AuditActionCode = {
  // ─── Tiền: dịch chuyển trực tiếp ───
  WALLET_MANUAL_ADJUSTMENT: 'FINANCE.WALLET_MANUAL_ADJUSTMENT',
  TASKER_WITHDRAWAL_REVIEW: 'FINANCE.TASKER_WITHDRAWAL_REVIEW',
  CUSTOMER_WITHDRAWAL_REVIEW: 'FINANCE.CUSTOMER_WITHDRAWAL_REVIEW',

  // ─── Tiền: bồi thường sự cố ───
  INCIDENT_COMPENSATE: 'INCIDENT.COMPENSATE',
  INCIDENT_COMPENSATE_MANUAL: 'INCIDENT.COMPENSATE_MANUAL',
  INCIDENT_COMPENSATION_REVERSE: 'INCIDENT.COMPENSATION_REVERSE',
  INCIDENT_DEBT_WRITE_OFF: 'INCIDENT.DEBT_WRITE_OFF',
  INCIDENT_DECISION_DRAFT: 'INCIDENT.DECISION_DRAFT',
  INCIDENT_DECISION_SEND: 'INCIDENT.DECISION_SEND',
  INCIDENT_DECISION_FINALIZE: 'INCIDENT.DECISION_FINALIZE',
  INCIDENT_DECISION_WITHDRAW: 'INCIDENT.DECISION_WITHDRAW',

  // ─── Quyền hạn tài khoản ───
  USER_CREATE: 'IAM.USER_CREATE',
  USER_UPDATE: 'IAM.USER_UPDATE',
  USER_STATUS_CHANGE: 'IAM.USER_STATUS_CHANGE',
  USER_RESET_PASSWORD: 'IAM.USER_RESET_PASSWORD',
  USER_DELETE: 'IAM.USER_DELETE',
  USER_RESTORE: 'IAM.USER_RESTORE',

  // ─── Booking: can thiệp vận hành ───
  BOOKING_CREATE: 'BOOKING.CREATE',
  BOOKING_ASSIGN_TASKER: 'BOOKING.ASSIGN_TASKER',
  BOOKING_STATUS_CHANGE: 'BOOKING.STATUS_CHANGE',
  BOOKING_CANCEL: 'BOOKING.CANCEL',
  BOOKING_CHECKIN_REVIEW: 'BOOKING.CHECKIN_REVIEW',
  BOOKING_CHECKIN_OVERRIDE: 'BOOKING.CHECKIN_OVERRIDE',
  BOOKING_NO_SHOW_REVIEW: 'BOOKING.NO_SHOW_REVIEW',
  BOOKING_EXPIRE_OVERDUE: 'BOOKING.EXPIRE_OVERDUE',

  // ─── Khách hàng ───
  CUSTOMER_CREATE: 'CUSTOMER.CREATE',
  CUSTOMER_UPDATE: 'CUSTOMER.UPDATE',
  CUSTOMER_STATUS_CHANGE: 'CUSTOMER.STATUS_CHANGE',
  CUSTOMER_DELETE: 'CUSTOMER.DELETE',
  CUSTOMER_RESTORE: 'CUSTOMER.RESTORE',
  CUSTOMER_RESEND_TEMP_PASSWORD: 'CUSTOMER.RESEND_TEMP_PASSWORD',

  // ─── Tasker: hồ sơ và kỷ luật ───
  TASKER_UPDATE: 'TASKER.UPDATE',
  TASKER_APPROVE: 'TASKER.APPROVE',
  TASKER_REJECT: 'TASKER.REJECT',
  TASKER_REQUEST_INFO: 'TASKER.REQUEST_INFO',
  TASKER_EQUIPMENT_REVIEW: 'TASKER.EQUIPMENT_REVIEW',
  TASKER_WORK_STATUS_CHANGE: 'TASKER.WORK_STATUS_CHANGE',
  TASKER_BAN: 'TASKER.BAN',
  TASKER_UNBAN: 'TASKER.UNBAN',
  TASKER_REINSTATE: 'TASKER.REINSTATE',
  TASKER_DELETE: 'TASKER.DELETE',
  TASKER_SERVICE_TOGGLE: 'TASKER.SERVICE_TOGGLE',

  // ─── Phiếu hỗ trợ ───
  TICKET_BULK_ASSIGN: 'SUPPORT.TICKET_BULK_ASSIGN',
  TICKET_CREATE: 'SUPPORT.TICKET_CREATE',
  TICKET_ASSIGN: 'SUPPORT.TICKET_ASSIGN',
  TICKET_STATUS_CHANGE: 'SUPPORT.TICKET_STATUS_CHANGE',
  TICKET_CATEGORY_CHANGE: 'SUPPORT.TICKET_CATEGORY_CHANGE',
  TICKET_RESOLUTION_ADD: 'SUPPORT.TICKET_RESOLUTION_ADD',
  TICKET_CONFIG_UPDATE: 'SUPPORT.TICKET_CONFIG_UPDATE',

  // ─── Sự cố: các bước không đụng tiền ───
  INCIDENT_ACCEPT: 'INCIDENT.ACCEPT',
  INCIDENT_CREATE_FROM_TICKET: 'INCIDENT.CREATE_FROM_TICKET',
  INCIDENT_CONFIG_UPDATE: 'INCIDENT.CONFIG_UPDATE',
  INCIDENT_UNLOCK_REPORTER: 'INCIDENT.UNLOCK_REPORTER',
  INCIDENT_RUN_HOUSEKEEPING: 'INCIDENT.RUN_HOUSEKEEPING',

  // ─── Đánh giá và khuyến mãi ───
  REVIEW_MODERATE: 'REVIEW.MODERATE',
  REVIEW_REPORT_RESOLVE: 'REVIEW.REPORT_RESOLVE',
  VOUCHER_CREATE: 'PROMO.VOUCHER_CREATE',
  VOUCHER_UPDATE: 'PROMO.VOUCHER_UPDATE',
  VOUCHER_DELETE: 'PROMO.VOUCHER_DELETE',
  VOUCHER_ISSUE: 'PROMO.VOUCHER_ISSUE',
  TICKET_MESSAGE_SEND: 'SUPPORT.TICKET_MESSAGE_SEND',
  TICKET_INTERNAL_NOTE: 'SUPPORT.TICKET_INTERNAL_NOTE',
  TICKET_ATTACHMENT_UPLOAD: 'SUPPORT.TICKET_ATTACHMENT_UPLOAD',
  INCIDENT_TRANSFER_PROOF_UPLOAD: 'INCIDENT.TRANSFER_PROOF_UPLOAD',

  // ─── Gửi ra ngoài hệ thống ───
  NOTIFICATION_BROADCAST: 'NOTIFY.BROADCAST',

  // ─── Cấu hình ảnh hưởng tới cách tính tiền ───
  SYSTEM_CONFIG_UPDATE: 'CONFIG.SYSTEM_CONFIG_UPDATE',
  TASKER_CANCELLATION_POLICY_UPDATE: 'CONFIG.TASKER_CANCELLATION_POLICY',
  CHECKIN_POLICY_UPDATE: 'CONFIG.CHECKIN_POLICY',
  CUSTOMER_SCHEDULING_POLICY_UPDATE: 'CONFIG.CUSTOMER_SCHEDULING_POLICY',

  // ─── Đọc dữ liệu nhạy cảm ───
  //
  // CÓ CHỦ ĐÍCH HẸP. Thao tác đọc thông thường — mở danh sách khách, danh sách
  // Tasker, tra cứu booking, xem chi tiết một đơn — KHÔNG được audit: một admin
  // làm việc bình thường sẽ sinh ra hàng trăm dòng mỗi ngày với giá trị điều tra
  // gần bằng không, và chúng chôn vùi những dòng thực sự đáng đọc.
  //
  // Chỉ ba loại đọc lọt vào đây:
  //  1. Đưa dữ liệu RA KHỎI hệ thống (export).
  //  2. Xem giấy tờ tuỳ thân / hồ sơ KYC của một người cụ thể.
  //  3. Xem thông tin thanh toán của một người cụ thể.
  //
  // Nhóm này ghi AI XEM DỮ LIỆU CỦA AI, không ghi nội dung đã xem — bản thân
  // dòng nhật ký cũng là dữ liệu nhạy cảm, nên chỉ chứa định danh và phạm vi.
  EXPORT_INCIDENTS: 'READ.EXPORT_INCIDENTS',
  EXPORT_SUPPORT_TICKETS: 'READ.EXPORT_SUPPORT_TICKETS',
  /** Xuất chính nhật ký ra ngoài — thao tác này cũng phải nằm trong nhật ký. */
  EXPORT_ACTIVITY_LOG: 'READ.EXPORT_ACTIVITY_LOG',
  /** Xem hồ sơ KYC một Tasker: số căn cước, ảnh giấy tờ, tài khoản ngân hàng. */
  TASKER_KYC_VIEW: 'READ.TASKER_KYC_VIEW',
  /** Ví, giao dịch, đơn nạp, yêu cầu rút của MỘT khách cụ thể. */
  CUSTOMER_FINANCE_VIEW: 'READ.CUSTOMER_FINANCE_VIEW',
  WALLET_VIEW: 'READ.WALLET_VIEW',
  WALLET_TRANSACTION_VIEW: 'READ.WALLET_TRANSACTION_VIEW',
} as const;

export type AuditActionCodeValue =
  (typeof AuditActionCode)[keyof typeof AuditActionCode];

/**
 * Tiền tố cho handler CHƯA khai báo `@AuditAction`. Interceptor vẫn ghi log (lưới
 * nền không đổi), nhưng mã được sinh từ `Class.method` — ổn định hơn chuỗi tiếng
 * Việt, và tiền tố `GENERIC.` cho biết ngay hành động này chưa được mô tả nghiệp vụ.
 */
export const GENERIC_ACTION_CODE_PREFIX = 'GENERIC.';
