import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P2 — APPROVE_NO_COMPENSATION: ghi nhận sự cố có thật nhưng quyết định KHÔNG bồi thường.
 *  - closure reason mới `NO_COMPENSATION` (khác REJECTED = báo cáo sai).
 *  - cột `decision_outcome` để finalize phân biệt APPROVE / APPROVE_NO_COMPENSATION / REJECT
 *    (trước đây suy từ approved=0 nên nhập nhằng với REJECT).
 */
export class AddApproveNoCompensation1782950000000 implements MigrationInterface {
  name = 'AddApproveNoCompensation1782950000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "incident_closure_reason"
      ADD VALUE IF NOT EXISTS 'NO_COMPENSATION'
    `);
    await queryRunner.query(`
      ALTER TABLE "incidents"
      ADD COLUMN IF NOT EXISTS "decision_outcome" varchar(32)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP COLUMN IF EXISTS "decision_outcome"`,
    );
    // PG không hỗ trợ DROP VALUE khỏi enum — giữ nguyên (vô hại).
  }
}
