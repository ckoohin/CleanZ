import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAddonDetailFields1782590000000 implements MigrationInterface {
  name = 'AddAddonDetailFields1782590000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "service_addons"
        ADD COLUMN IF NOT EXISTS "price_unit"       VARCHAR(50)    NOT NULL DEFAULT 'per_item',
        ADD COLUMN IF NOT EXISTS "duration_minutes" INTEGER                 DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS "max_quantity"     INTEGER                 DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS "sort_order"       INTEGER        NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "icon_url"         VARCHAR(500)            DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "service_addons"
        DROP COLUMN IF EXISTS "price_unit",
        DROP COLUMN IF EXISTS "duration_minutes",
        DROP COLUMN IF EXISTS "max_quantity",
        DROP COLUMN IF EXISTS "sort_order",
        DROP COLUMN IF EXISTS "icon_url"
    `);
  }
}
