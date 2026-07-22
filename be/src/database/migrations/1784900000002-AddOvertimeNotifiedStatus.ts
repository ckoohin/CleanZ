import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Bổ sung state thông báo cho database đã chạy migration overtime cũ.
 * Database mới đã có state này từ migration 1784900000000.
 */
export class AddOvertimeNotifiedStatus1784900000002 implements MigrationInterface {
  name = 'AddOvertimeNotifiedStatus1784900000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."booking_overtime_request_status" ADD VALUE IF NOT EXISTS 'NOTIFIED' AFTER 'NONE'`,
    );
  }

  // PostgreSQL không hỗ trợ xóa một enum value an toàn khi có dữ liệu.
  public async down(): Promise<void> {}
}
