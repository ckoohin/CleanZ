export enum TicketSource {
  CUSTOMER_APP = 'CUSTOMER_APP',
  TASKER_APP = 'TASKER_APP',
  /** Kháng cáo gửi từ trang public (qua link token trong email khóa tài khoản). */
  TASKER_APPEAL = 'TASKER_APPEAL',
  ADMIN = 'ADMIN',
}
