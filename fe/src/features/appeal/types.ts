/** Thông tin trả về khi xác thực token kháng cáo (GET /appeals/verify). */
export interface AppealContext {
  taskerId: string;
  fullName: string;
  email: string;
  /** Lý do khóa đã bỏ tiền tố loại khóa. */
  banReason: string | null;
  /** Đã có kháng cáo đang được xử lý hay chưa. */
  hasOpenAppeal: boolean;
}

/** Kết quả gửi kháng cáo (POST /appeals). */
export interface SubmitAppealResult {
  ticketId: string;
}
