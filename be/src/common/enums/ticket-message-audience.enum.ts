/**
 * Phân luồng hội thoại của 1 ticket (mô hình "Admin trung gian — 2 thread tách").
 * - REPORTER: luồng Reporter ↔ Admin.
 * - COUNTERPARTY: luồng Counterparty (tasker/customer bên kia) ↔ Admin.
 * - INTERNAL: ghi chú nội bộ, CHỈ Admin thấy (thay vai trò is_internal=true).
 */
export enum TicketMessageAudience {
  REPORTER = 'REPORTER',
  COUNTERPARTY = 'COUNTERPARTY',
  INTERNAL = 'INTERNAL',
}
