// Lý do đóng — gom mọi nhánh đóng về CLOSED (terminal duy nhất).
export enum IncidentClosureReason {
  COMPENSATED = 'COMPENSATED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
  DUPLICATE = 'DUPLICATE',
  INVALID_BOOKING = 'INVALID_BOOKING',
  EXPIRED = 'EXPIRED',
}
