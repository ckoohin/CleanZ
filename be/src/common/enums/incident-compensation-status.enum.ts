// Chiều B — trạng thái xử lý tiền (record-only ở Phase 1 do wallet mock).
export enum IncidentCompensationStatus {
  NONE = 'NONE',
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  RECORDED = 'RECORDED',
  FAILED = 'FAILED',
}
