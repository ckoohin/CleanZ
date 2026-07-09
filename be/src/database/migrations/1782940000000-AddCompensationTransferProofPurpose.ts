import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P0.4 — Fallback quỹ thủ công: thêm purpose COMPENSATION_TRANSFER_PROOF cho ảnh
 * minh chứng chuyển khoản. PG12+: ADD VALUE chạy được trong transaction miễn là
 * không dùng value mới trong cùng transaction (migration này chỉ ADD).
 */
export class AddCompensationTransferProofPurpose1782940000000 implements MigrationInterface {
  name = 'AddCompensationTransferProofPurpose1782940000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "incident_evidence_purpose"
      ADD VALUE IF NOT EXISTS 'COMPENSATION_TRANSFER_PROOF' BEFORE 'OTHER'
    `);
  }

  public async down(): Promise<void> {
    // PG không hỗ trợ DROP VALUE khỏi enum — giữ nguyên (vô hại).
  }
}
