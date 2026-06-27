import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Audit cho tasker: ai duyệt/xử lý hồ sơ (doc_reviewed_by) và admin tác động gần
 * nhất (updated_by) — để hiển thị "Duyệt bởi / Cập nhật bởi". Additive + idempotent.
 */
export class AddTaskerAuditColumns1782440000000 implements MigrationInterface {
  name = 'AddTaskerAuditColumns1782440000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "taskers" ADD COLUMN IF NOT EXISTS "doc_reviewed_by" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "taskers" ADD COLUMN IF NOT EXISTS "updated_by" uuid`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "taskers" DROP COLUMN IF EXISTS "updated_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "taskers" DROP COLUMN IF EXISTS "doc_reviewed_by"`,
    );
  }
}
