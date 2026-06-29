import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorVoucherUsageRules1782710000000
  implements MigrationInterface
{
  name = 'RefactorVoucherUsageRules1782710000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "vouchers"
        ADD COLUMN IF NOT EXISTS "per_customer_limit" integer,
        ADD COLUMN IF NOT EXISTS "reserved_count" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "package_ids" jsonb,
        ADD COLUMN IF NOT EXISTS "customer_ids" jsonb
    `);

    await queryRunner.query(`
      ALTER TABLE "customer_vouchers"
        ADD COLUMN IF NOT EXISTS "status" character varying(20) NOT NULL DEFAULT 'ISSUED',
        ADD COLUMN IF NOT EXISTS "booking_id" uuid,
        ADD COLUMN IF NOT EXISTS "reserved_at" TIMESTAMP,
        ADD COLUMN IF NOT EXISTS "used_at" TIMESTAMP
    `);

    await queryRunner.query(`
      UPDATE "customer_vouchers"
      SET "status" = CASE WHEN "is_used" = true THEN 'USED' ELSE "status" END,
          "used_at" = CASE WHEN "is_used" = true AND "used_at" IS NULL THEN "created_at" ELSE "used_at" END
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_customer_vouchers_booking_status"
        ON "customer_vouchers" ("booking_id", "status")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_customer_vouchers_customer_voucher_status"
        ON "customer_vouchers" ("customer_id", "voucher_id", "status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_customer_vouchers_customer_voucher_status"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_customer_vouchers_booking_status"`,
    );
    await queryRunner.query(`
      ALTER TABLE "customer_vouchers"
        DROP COLUMN IF EXISTS "used_at",
        DROP COLUMN IF EXISTS "reserved_at",
        DROP COLUMN IF EXISTS "booking_id",
        DROP COLUMN IF EXISTS "status"
    `);
    await queryRunner.query(`
      ALTER TABLE "vouchers"
        DROP COLUMN IF EXISTS "customer_ids",
        DROP COLUMN IF EXISTS "package_ids",
        DROP COLUMN IF EXISTS "reserved_count",
        DROP COLUMN IF EXISTS "per_customer_limit"
    `);
  }
}
