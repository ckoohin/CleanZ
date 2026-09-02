/** Chiều tiền của một dòng sao kê, nhìn từ TÀI KHOẢN CÔNG TY. */
export enum BankStatementDirection {
  /** Tiền RỜI tài khoản công ty — chiều của mọi khoản chi trả bồi thường thủ công. */
  DEBIT = 'DEBIT',
  /** Tiền VÀO tài khoản công ty (thu hồi khoản chuyển nhầm, khách hoàn lại…). */
  CREDIT = 'CREDIT',
}

export enum BankStatementEntryStatus {
  /** Đã nhập từ sao kê, chưa gắn với khoản chi nào. */
  UNMATCHED = 'UNMATCHED',
  /** Đã đối chiếu với một sự cố — đây là bằng chứng ngân hàng cho khoản chi ngoài. */
  MATCHED = 'MATCHED',
  /** Không liên quan bồi thường (lương, phí, mua sắm…) — bỏ qua có lý do. */
  IGNORED = 'IGNORED',
}
