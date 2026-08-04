import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBankBinAndPayosRefToCustomerWithdrawal1785421006000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE customer_withdrawal_requests
        ADD COLUMN IF NOT EXISTS bank_bin VARCHAR(20) NULL,
        ADD COLUMN IF NOT EXISTS payos_reference_id VARCHAR(255) NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE customer_withdrawal_requests
        DROP COLUMN IF EXISTS payos_reference_id,
        DROP COLUMN IF EXISTS bank_bin;
    `);
  }
}
