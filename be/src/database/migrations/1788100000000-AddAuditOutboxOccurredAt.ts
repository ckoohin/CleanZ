import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Bổ sung `audit_outbox.occurred_at` — thời điểm THAO TÁC xảy ra.
 *
 * Thiếu cột này thì `admin_activity_logs.created_at` rơi về giờ worker ghi: lệch
 * ít nhất một chu kỳ quét, tới vài phút nếu bản ghi phải retry, và tệ nhất là
 * SAI THỨ TỰ giữa hai thao tác khi một trong hai retry.
 *
 * Vì sao là một migration RIÊNG thay vì sửa `1788000000000`? Vì file kia đã được
 * ghi vào bảng `migrations` ở môi trường dev. TypeORM bỏ qua trọn vẹn một
 * migration đã chạy — sửa thêm bao nhiêu câu lệnh vào đó cũng vô ích, kể cả câu
 * lệnh idempotent. Đây là điểm khác biệt then chốt giữa "viết SQL idempotent" và
 * "migration chạy lại được": cái sau không tồn tại.
 */
export class AddAuditOutboxOccurredAt1788100000000 implements MigrationInterface {
  name = 'AddAuditOutboxOccurredAt1788100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // `IF NOT EXISTS` để DB mới (đã có cột từ CREATE TABLE) chạy qua không lỗi.
    await queryRunner.query(`
      ALTER TABLE "audit_outbox"
      ADD COLUMN IF NOT EXISTS "occurred_at" TIMESTAMP NOT NULL DEFAULT now()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "audit_outbox" DROP COLUMN IF EXISTS "occurred_at"
    `);
  }
}
