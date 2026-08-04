import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBankBinToTasker1782831000000 implements MigrationInterface {
  name = 'AddBankBinToTasker1782831000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "taskers" ADD COLUMN IF NOT EXISTS "bank_bin" character varying(20) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "taskers" DROP COLUMN IF EXISTS "bank_bin"`,
    );
  }
}
