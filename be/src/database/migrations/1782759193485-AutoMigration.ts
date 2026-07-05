import { MigrationInterface, QueryRunner } from 'typeorm';

export class AutoMigration1782759193485 implements MigrationInterface {
  name = 'AutoMigration1782759193485';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vouchers" DROP CONSTRAINT IF EXISTS "FK_820556fd3264ae9abfe7cbc0734"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_service_sub_services_package_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_bookings_customer_status"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_bookings_tasker_status"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_bookings_scheduled_start"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_customer_vouchers_booking_status"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_customer_vouchers_customer_voucher_status"`,
    );
    // service_id bị loại bỏ trong mô hình voucher mới; customer_ids (jsonb) đã
    // được RefactorVoucherUsageRules thêm trước đó nên chỉ cần drop service_id.
    await queryRunner.query(
      `ALTER TABLE "vouchers" DROP COLUMN IF EXISTS "service_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_packages" DROP COLUMN IF EXISTS "allow_single_service"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_addons" ALTER COLUMN "price_unit" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_addons" ALTER COLUMN "sort_order" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_addons" ALTER COLUMN "icon_url" DROP DEFAULT`,
    );
    // customer_ids (jsonb) đã tồn tại từ RefactorVoucherUsageRules — không drop/add lại.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_1d629abc2acdf8bc82a73be032a'
        ) THEN
          ALTER TABLE "customer_vouchers"
            ADD CONSTRAINT "FK_1d629abc2acdf8bc82a73be032a"
            FOREIGN KEY ("booking_id") REFERENCES "bookings"("id")
            ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "customer_vouchers" DROP CONSTRAINT "FK_1d629abc2acdf8bc82a73be032a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" DROP COLUMN "customer_ids"`,
    );
    await queryRunner.query(`ALTER TABLE "vouchers" ADD "customer_ids" uuid`);
    await queryRunner.query(
      `ALTER TABLE "service_addons" ALTER COLUMN "icon_url" SET DEFAULT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_addons" ALTER COLUMN "sort_order" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_addons" ALTER COLUMN "price_unit" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_packages" ADD "allow_single_service" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" RENAME COLUMN "customer_ids" TO "service_id"`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_customer_vouchers_customer_voucher_status" ON "customer_vouchers" ("customer_id", "status", "voucher_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_customer_vouchers_booking_status" ON "customer_vouchers" ("booking_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_bookings_scheduled_start" ON "bookings" ("scheduled_start") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_bookings_tasker_status" ON "bookings" ("status", "tasker_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_bookings_customer_status" ON "bookings" ("customer_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_service_sub_services_package_id" ON "service_sub_services" ("package_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" ADD CONSTRAINT "FK_820556fd3264ae9abfe7cbc0734" FOREIGN KEY ("service_id") REFERENCES "sub_services"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }
}
