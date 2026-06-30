import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddServiceIdToPricingConfigs1782630000000 implements MigrationInterface {
  name = 'AddServiceIdToPricingConfigs1782630000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "pricing_configs"
        ADD COLUMN IF NOT EXISTS "service_id" uuid
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "pricing_configs"
        DROP COLUMN IF EXISTS "service_id"
    `);
  }
}
