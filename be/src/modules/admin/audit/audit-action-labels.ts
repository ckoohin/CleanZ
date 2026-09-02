import { AuditActionCode } from './audit-action-codes';

/**
 * Nhãn tiếng Việt cho từng mã hành động — thứ hiển thị trên trang nhật ký.
 *
 * Trước đây nhãn được ĐOÁN ở runtime: `resolveVerb` khớp regex trên tên hàm
 * handler rồi ghép với nhãn tài nguyên suy từ URL. Cách đó sai theo hai kiểu.
 * Sai nghĩa: `unlockReporter` khớp `/unlock/` nên ra "Khôi phục sự cố", trong khi
 * việc thật là gỡ khoá quyền báo cáo của một khách bị nghi khai gian. Và sai âm
 * thầm: đổi tên một method — việc refactor bình thường — là đổi luôn cách nhật ký
 * mô tả hành động đó, kể cả với các bản ghi cũ đang hiển thị lại.
 *
 * Nhãn khai báo tường minh cắt cả hai. Handler chưa có mã (`GENERIC.*`) vẫn dùng
 * cách đoán cũ — chấp nhận được vì chúng chưa được mô tả nghiệp vụ.
 */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  // ─── Tiền ───
  [AuditActionCode.WALLET_MANUAL_ADJUSTMENT]: 'Điều chỉnh số dư ví thủ công',
  [AuditActionCode.TASKER_WITHDRAWAL_REVIEW]:
    'Duyệt yêu cầu rút tiền của Tasker',
  [AuditActionCode.CUSTOMER_WITHDRAWAL_REVIEW]:
    'Duyệt yêu cầu rút tiền của Khách',

  // ─── Bồi thường sự cố ───
  [AuditActionCode.INCIDENT_COMPENSATE]: 'Chi trả bồi thường qua ví',
  [AuditActionCode.INCIDENT_COMPENSATE_MANUAL]:
    'Chi trả bồi thường bằng chuyển khoản ngoài',
  [AuditActionCode.INCIDENT_COMPENSATE_MANUAL_CORRECT]:
    'Điều chỉnh sổ chi ngoài (sửa sai chuyển khoản thủ công)',
  [AuditActionCode.INCIDENT_COMPENSATION_REVERSE]:
    'Đảo khoản bồi thường đã chi',
  [AuditActionCode.INCIDENT_DEBT_WRITE_OFF]: 'Xoá nợ bồi thường',
  [AuditActionCode.BANK_STATEMENT_IMPORT]: 'Nhập sao kê ngân hàng',
  [AuditActionCode.BANK_STATEMENT_MATCH]:
    'Đối chiếu dòng sao kê với khoản chi bồi thường',
  [AuditActionCode.BANK_STATEMENT_UNMATCH]: 'Gỡ đối chiếu dòng sao kê',
  [AuditActionCode.BANK_STATEMENT_IGNORE]:
    'Bỏ qua dòng sao kê (không liên quan bồi thường)',
  [AuditActionCode.INCIDENT_DECISION_DRAFT]: 'Soạn quyết định xử lý sự cố',
  [AuditActionCode.INCIDENT_DECISION_SEND]:
    'Gửi quyết định cho Tasker phản biện',
  [AuditActionCode.INCIDENT_DECISION_FINALIZE]: 'Chốt quyết định xử lý sự cố',
  [AuditActionCode.INCIDENT_DECISION_WITHDRAW]: 'Thu hồi quyết định đã chốt',

  // ─── Quyền hạn tài khoản ───
  [AuditActionCode.USER_CREATE]: 'Tạo tài khoản người dùng',
  [AuditActionCode.USER_UPDATE]: 'Cập nhật tài khoản người dùng',
  [AuditActionCode.USER_STATUS_CHANGE]: 'Khoá / mở khoá tài khoản',
  [AuditActionCode.USER_RESET_PASSWORD]: 'Đặt lại mật khẩu người dùng',
  [AuditActionCode.USER_DELETE]: 'Xoá tài khoản người dùng',
  [AuditActionCode.USER_RESTORE]: 'Khôi phục tài khoản người dùng',

  // ─── Booking ───
  [AuditActionCode.BOOKING_CREATE]: 'Tạo booking thủ công',
  [AuditActionCode.BOOKING_ASSIGN_TASKER]: 'Gán Tasker cho booking',
  [AuditActionCode.BOOKING_STATUS_CHANGE]: 'Can thiệp trạng thái booking',
  [AuditActionCode.BOOKING_CANCEL]: 'Huỷ booking',
  [AuditActionCode.BOOKING_CHECKIN_REVIEW]: 'Thẩm định bằng chứng check-in',
  [AuditActionCode.BOOKING_CHECKIN_OVERRIDE]: 'Xác nhận check-in thủ công',
  [AuditActionCode.BOOKING_NO_SHOW_REVIEW]: 'Kết luận Tasker không đến',
  [AuditActionCode.BOOKING_EXPIRE_OVERDUE]: 'Cho hết hạn booking quá giờ',

  // ─── Khách hàng ───
  [AuditActionCode.CUSTOMER_CREATE]: 'Tạo khách hàng',
  [AuditActionCode.CUSTOMER_UPDATE]: 'Cập nhật khách hàng',
  [AuditActionCode.CUSTOMER_STATUS_CHANGE]: 'Khoá / mở khoá khách hàng',
  [AuditActionCode.CUSTOMER_DELETE]: 'Xoá khách hàng',
  [AuditActionCode.CUSTOMER_RESTORE]: 'Khôi phục khách hàng',
  [AuditActionCode.CUSTOMER_RESEND_TEMP_PASSWORD]:
    'Gửi lại mật khẩu tạm cho khách',

  // ─── Tasker ───
  [AuditActionCode.TASKER_UPDATE]: 'Cập nhật hồ sơ Tasker',
  [AuditActionCode.TASKER_APPROVE]: 'Duyệt hồ sơ Tasker',
  [AuditActionCode.TASKER_REJECT]: 'Từ chối hồ sơ Tasker',
  [AuditActionCode.TASKER_REQUEST_INFO]: 'Yêu cầu Tasker bổ sung hồ sơ',
  [AuditActionCode.TASKER_EQUIPMENT_REVIEW]: 'Thẩm định trang thiết bị Tasker',
  [AuditActionCode.TASKER_WORK_STATUS_CHANGE]:
    'Đổi trạng thái làm việc của Tasker',
  [AuditActionCode.TASKER_BAN]: 'Khoá tài khoản Tasker',
  [AuditActionCode.TASKER_UNBAN]: 'Gỡ khoá tài khoản Tasker',
  [AuditActionCode.TASKER_REINSTATE]: 'Phục hồi tư cách Tasker',
  [AuditActionCode.TASKER_DELETE]: 'Xoá hồ sơ Tasker',
  [AuditActionCode.TASKER_SERVICE_TOGGLE]: 'Bật / tắt dịch vụ của Tasker',

  // ─── Phiếu hỗ trợ ───
  [AuditActionCode.TICKET_BULK_ASSIGN]: 'Gán hàng loạt phiếu hỗ trợ',
  [AuditActionCode.TICKET_CREATE]: 'Tạo phiếu hỗ trợ hộ khách',
  [AuditActionCode.TICKET_ASSIGN]: 'Gán phiếu hỗ trợ',
  [AuditActionCode.TICKET_STATUS_CHANGE]: 'Đổi trạng thái phiếu hỗ trợ',
  [AuditActionCode.TICKET_CATEGORY_CHANGE]: 'Phân loại lại phiếu hỗ trợ',
  [AuditActionCode.TICKET_RESOLUTION_ADD]: 'Ghi kết luận xử lý phiếu hỗ trợ',
  [AuditActionCode.TICKET_CONFIG_UPDATE]: 'Cập nhật cấu hình phiếu hỗ trợ',
  [AuditActionCode.TICKET_MESSAGE_SEND]: 'Gửi tin nhắn trong phiếu hỗ trợ',
  [AuditActionCode.TICKET_INTERNAL_NOTE]: 'Ghi chú nội bộ phiếu hỗ trợ',
  [AuditActionCode.TICKET_ATTACHMENT_UPLOAD]: 'Tải tệp đính kèm phiếu hỗ trợ',

  // ─── Sự cố: bước không đụng tiền ───
  [AuditActionCode.INCIDENT_ACCEPT]: 'Tiếp nhận thẩm định sự cố',
  [AuditActionCode.INCIDENT_CREATE_FROM_TICKET]: 'Mở sự cố từ phiếu hỗ trợ',
  [AuditActionCode.INCIDENT_CONFIG_UPDATE]: 'Cập nhật cấu hình sự cố',
  [AuditActionCode.INCIDENT_UNLOCK_REPORTER]:
    'Gỡ khoá quyền báo cáo sự cố của khách',
  [AuditActionCode.INCIDENT_RUN_HOUSEKEEPING]: 'Chạy dọn dẹp hồ sơ sự cố',
  [AuditActionCode.INCIDENT_TRANSFER_PROOF_UPLOAD]:
    'Tải minh chứng chuyển khoản bồi thường',

  // ─── Đánh giá và khuyến mãi ───
  [AuditActionCode.REVIEW_MODERATE]: 'Kiểm duyệt đánh giá',
  [AuditActionCode.REVIEW_REPORT_RESOLVE]: 'Xử lý báo cáo đánh giá',
  [AuditActionCode.VOUCHER_CREATE]: 'Tạo voucher',
  [AuditActionCode.VOUCHER_UPDATE]: 'Cập nhật voucher',
  [AuditActionCode.VOUCHER_DELETE]: 'Xoá voucher',
  [AuditActionCode.VOUCHER_ISSUE]: 'Phát voucher cho khách',

  // ─── Gửi ra ngoài ───
  [AuditActionCode.NOTIFICATION_BROADCAST]: 'Gửi thông báo hàng loạt',

  // ─── Cấu hình ảnh hưởng cách tính tiền ───
  [AuditActionCode.SYSTEM_CONFIG_UPDATE]: 'Cập nhật cấu hình hệ thống',
  [AuditActionCode.TASKER_CANCELLATION_POLICY_UPDATE]:
    'Cập nhật chính sách phạt huỷ của Tasker',
  [AuditActionCode.CHECKIN_POLICY_UPDATE]: 'Cập nhật chính sách check-in',
  [AuditActionCode.CUSTOMER_SCHEDULING_POLICY_UPDATE]:
    'Cập nhật quy tắc đặt lịch của khách',

  // ─── Đọc dữ liệu nhạy cảm ───
  [AuditActionCode.EXPORT_INCIDENTS]: 'Xuất danh sách sự cố ra Excel',
  [AuditActionCode.EXPORT_SUPPORT_TICKETS]:
    'Xuất danh sách phiếu hỗ trợ ra Excel',
  [AuditActionCode.EXPORT_ACTIVITY_LOG]: 'Xuất nhật ký kiểm toán ra CSV',
  [AuditActionCode.TASKER_KYC_VIEW]: 'Xem hồ sơ giấy tờ của Tasker',
  [AuditActionCode.CUSTOMER_FINANCE_VIEW]: 'Xem thông tin tài chính của khách',
  [AuditActionCode.WALLET_VIEW]: 'Xem chi tiết ví',
  [AuditActionCode.WALLET_TRANSACTION_VIEW]: 'Xem chi tiết giao dịch ví',
};
