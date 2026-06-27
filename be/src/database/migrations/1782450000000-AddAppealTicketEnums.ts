import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Lồng kháng cáo (appeal) cho tasker bị chấm dứt vĩnh viễn được lưu vào hệ thống
 * support-ticket sẵn có. Thêm:
 *  - ticket_category: 'APPEAL' (kháng cáo, không gắn booking).
 *  - ticket_source:   'TASKER_APPEAL' (gửi từ trang public qua link token).
 *
 * Chỉ thêm value vào enum hiện có → additive + idempotent (IF NOT EXISTS).
 * Postgres không hỗ trợ gỡ value khỏi enum nên down() là no-op.
 */
export class AddAppealTicketEnums1782450000000 implements MigrationInterface {
  name = 'AddAppealTicketEnums1782450000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "ticket_category" ADD VALUE IF NOT EXISTS 'APPEAL'`,
    );
    await queryRunner.query(
      `ALTER TYPE "ticket_source" ADD VALUE IF NOT EXISTS 'TASKER_APPEAL'`,
    );
  }

  public async down(): Promise<void> {
    // Postgres không hỗ trợ DROP VALUE khỏi enum — giữ nguyên (no-op).
  }
}
