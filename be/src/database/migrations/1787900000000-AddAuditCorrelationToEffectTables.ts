import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Gắn `audit_correlation_id` lên các bảng ghi nhận HỆ QUẢ của một thao tác admin.
 *
 * Một lệnh chi trả bồi thường sinh ra: 1 dòng `admin_activity_logs`, 1..n
 * `wallet_transactions`, 1 `incident_status_logs`, có thể 1 `tasker_debts` và vài
 * thông báo. Trước migration này, không khoá nào nối chúng lại — muốn điều tra
 * một khiếu nại tiền bạc thì phải đối chiếu tay theo `created_at`, mà `created_at`
 * của nhật ký lại được ghi SAU khi nghiệp vụ chạy xong nên thứ tự còn không đáng
 * tin. Câu hỏi "giao dịch trừ 500k này do admin nào, qua thao tác gì, vì lý do
 * gì" từ chỗ phải suy đoán trở thành một phép JOIN.
 *
 * Cột để NULL và không có khoá ngoại — có chủ đích:
 * - NULL là trạng thái hợp lệ và phổ biến: mọi bản ghi có sẵn, mọi hành động của
 *   khách/Tasker, và mọi việc do cron chạy đều không phát sinh từ thao tác admin.
 * - Không FK sang `admin_activity_logs` vì nhật ký bị dọn theo hạn lưu trữ 12
 *   tháng, còn bút toán ví thì giữ vĩnh viễn. Có FK thì job dọn log sẽ bị chặn,
 *   hoặc tệ hơn là kéo theo việc sửa dữ liệu tài chính chỉ vì log hết hạn.
 *
 * Index partial `WHERE ... IS NOT NULL`: phần lớn hàng có giá trị NULL, đưa chúng
 * vào index chỉ tốn dung lượng mà không phục vụ truy vấn nào.
 */
export class AddAuditCorrelationToEffectTables1787900000000 implements MigrationInterface {
  name = 'AddAuditCorrelationToEffectTables1787900000000';

  private readonly tables = [
    'wallet_transactions',
    'booking_status_logs',
    'incident_status_logs',
    'ticket_status_logs',
    'tasker_debts',
    'tasker_penalties',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.tables) {
      await queryRunner.query(`
        ALTER TABLE "${table}"
        ADD COLUMN IF NOT EXISTS "audit_correlation_id" uuid
      `);
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "idx_${table}_audit_correlation"
          ON "${table}" ("audit_correlation_id")
          WHERE "audit_correlation_id" IS NOT NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.tables) {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "idx_${table}_audit_correlation"`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN IF EXISTS "audit_correlation_id"`,
      );
    }
  }
}
