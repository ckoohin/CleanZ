import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubscriptionDetailFields1782610000000
  implements MigrationInterface
{
  name = 'AddSubscriptionDetailFields1782610000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "service_subscriptions"
        ADD COLUMN IF NOT EXISTS "billing_cycle"      VARCHAR(20)  NOT NULL DEFAULT 'monthly',
        ADD COLUMN IF NOT EXISTS "sessions_per_cycle" INTEGER               DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS "commitment_months"  INTEGER               DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS "bonus_description"  TEXT                  DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS "is_popular"         BOOLEAN      NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS "sort_order"         INTEGER      NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "service_subscriptions"
        DROP COLUMN IF EXISTS "sort_order",
        DROP COLUMN IF EXISTS "is_popular",
        DROP COLUMN IF EXISTS "bonus_description",
        DROP COLUMN IF EXISTS "commitment_months",
        DROP COLUMN IF EXISTS "sessions_per_cycle",
        DROP COLUMN IF EXISTS "billing_cycle"
    `);
  }
}
