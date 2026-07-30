import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBankBinToWithdrawalRequest1782832000000
  implements MigrationInterface
{
  name = 'AddBankBinToWithdrawalRequest1782832000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tasker_withdrawal_requests" ADD COLUMN IF NOT EXISTS "bank_bin" character varying(20) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tasker_withdrawal_requests" DROP COLUMN IF EXISTS "bank_bin"`,
    );
  }
}
