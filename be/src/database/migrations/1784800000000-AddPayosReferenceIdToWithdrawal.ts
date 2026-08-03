import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPayosReferenceIdToWithdrawal1784800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tasker_withdrawal_requests" ADD COLUMN "payos_reference_id" VARCHAR(36) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tasker_withdrawal_requests" DROP COLUMN "payos_reference_id"`,
    );
  }
}
