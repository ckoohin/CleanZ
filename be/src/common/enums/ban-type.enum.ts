export enum BanType {
  /** Khóa có thời hạn → tasker.status = SUSPENDED, tự mở khóa khi hết hạn. */
  TEMPORARY = 'TEMPORARY',
  /** Chấm dứt vĩnh viễn → tasker.status = TERMINATED, không tự mở khóa. */
  PERMANENT = 'PERMANENT',
}
