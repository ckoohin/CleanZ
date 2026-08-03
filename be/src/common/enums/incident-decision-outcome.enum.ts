/** Ba kết cục của một quyết định sự cố. Chỉ COMPENSATE mới chuyển tiền. */
export enum IncidentDecisionOutcome {
  /** Công nhận + bồi thường (approved > 0). */
  COMPENSATE = 'COMPENSATE',
  /** Công nhận sự cố nhưng không bồi thường (approved = 0, không strike khách). */
  NO_COMPENSATION = 'NO_COMPENSATION',
  /** Bác bỏ — báo cáo sai sự thật (approved = 0, có thể kèm strike khách). */
  REJECT = 'REJECT',
}
