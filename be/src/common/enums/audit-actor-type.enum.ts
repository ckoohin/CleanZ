/**
 * Ai đã gây ra một bản ghi lịch sử nghiệp vụ.
 *
 * Tồn tại để tách "hệ thống tự làm" khỏi "không rõ ai làm" — trước đây cả hai
 * đều là `changed_by_user_id = NULL`, và khi điều tra thì đó là hai kết luận
 * hoàn toàn khác nhau.
 */
export enum AuditActorType {
  /** Admin thao tác trực tiếp. Có `correlation_id` nối sang nhật ký kiểm toán. */
  ADMIN = 'ADMIN',
  /** Chính chủ thao tác: Khách hoặc Tasker trên tài khoản của mình. */
  USER = 'USER',
  /** Cron, worker, hoặc quy tắc nghiệp vụ tự kích hoạt. Không có người nào bấm. */
  SYSTEM = 'SYSTEM',
}
