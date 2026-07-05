import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDurationPriceMode1782840000000 implements MigrationInterface {
  name = 'AddDurationPriceMode1782840000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "service_durations"
        ADD COLUMN IF NOT EXISTS "price_mode"  VARCHAR(20)    NOT NULL DEFAULT 'percent',
        ADD COLUMN IF NOT EXISTS "fixed_price" NUMERIC(12,2)           DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "service_durations"
        DROP COLUMN IF EXISTS "price_mode",
        DROP COLUMN IF EXISTS "fixed_price"
    `);
  }
}
