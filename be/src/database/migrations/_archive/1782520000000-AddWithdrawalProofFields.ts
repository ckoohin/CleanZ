import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWithdrawalProofFields1782520000000 implements MigrationInterface {
  name = 'AddWithdrawalProofFields1782520000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tasker_withdrawal_requests" ADD COLUMN IF NOT EXISTS "admin_note" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasker_withdrawal_requests" ADD COLUMN IF NOT EXISTS "proof_image_url" varchar(500)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tasker_withdrawal_requests" DROP COLUMN IF EXISTS "proof_image_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasker_withdrawal_requests" DROP COLUMN IF EXISTS "admin_note"`,
    );
  }
}
