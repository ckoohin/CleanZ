import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBankInfoToPayments1783770000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payments"
        ADD COLUMN IF NOT EXISTS "bin" varchar(10),
        ADD COLUMN IF NOT EXISTS "account_number" varchar(50),
        ADD COLUMN IF NOT EXISTS "account_name" varchar(255)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payments"
        DROP COLUMN IF EXISTS "bin",
        DROP COLUMN IF EXISTS "account_number",
        DROP COLUMN IF EXISTS "account_name"`,
    );
  }
}
