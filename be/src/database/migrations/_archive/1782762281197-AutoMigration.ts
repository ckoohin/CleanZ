import { MigrationInterface, QueryRunner } from 'typeorm';

export class AutoMigration1782762281197 implements MigrationInterface {
  name = 'AutoMigration1782762281197';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "customer_vouchers" DROP CONSTRAINT "FK_1d629abc2acdf8bc82a73be032a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_vouchers" DROP CONSTRAINT "FK_280dc2ff901ba4b305398f7c2d1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_tokens_user_type_expires"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."uq_notifications_dedupe_key"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_vouchers" DROP COLUMN "status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_vouchers" DROP COLUMN "booking_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_vouchers" DROP COLUMN "reserved_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" DROP COLUMN "per_customer_limit"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" DROP COLUMN "reserved_count"`,
    );
    await queryRunner.query(`ALTER TABLE "vouchers" DROP COLUMN "package_ids"`);
    await queryRunner.query(
      `ALTER TABLE "vouchers" DROP COLUMN "customer_ids"`,
    );
    await queryRunner.query(
      `ALTER TABLE "taskers" DROP COLUMN "cancel_suspended_until"`,
    );
    await queryRunner.query(`ALTER TABLE "vouchers" ADD "service_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "service_packages" ADD "allow_single_service" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_customer_vouchers_voucher_id" ON "customer_vouchers" ("voucher_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_vouchers" ADD CONSTRAINT "uq_customer_voucher" UNIQUE ("customer_id", "voucher_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" ADD CONSTRAINT "FK_820556fd3264ae9abfe7cbc0734" FOREIGN KEY ("service_id") REFERENCES "sub_services"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vouchers" DROP CONSTRAINT "FK_820556fd3264ae9abfe7cbc0734"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_vouchers" DROP CONSTRAINT "uq_customer_voucher"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_customer_vouchers_voucher_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_packages" DROP COLUMN "allow_single_service"`,
    );
    await queryRunner.query(`ALTER TABLE "vouchers" DROP COLUMN "service_id"`);
    await queryRunner.query(
      `ALTER TABLE "taskers" ADD "cancel_suspended_until" TIMESTAMP`,
    );
    await queryRunner.query(`ALTER TABLE "vouchers" ADD "customer_ids" jsonb`);
    await queryRunner.query(`ALTER TABLE "vouchers" ADD "package_ids" jsonb`);
    await queryRunner.query(
      `ALTER TABLE "vouchers" ADD "reserved_count" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" ADD "per_customer_limit" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_vouchers" ADD "reserved_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_vouchers" ADD "booking_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_vouchers" ADD "status" character varying(20) NOT NULL DEFAULT 'ISSUED'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_notifications_dedupe_key" ON "notifications" ("dedupe_key") WHERE (dedupe_key IS NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_tokens_user_type_expires" ON "tokens" ("expires_at", "type", "userId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_vouchers" ADD CONSTRAINT "FK_280dc2ff901ba4b305398f7c2d1" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_vouchers" ADD CONSTRAINT "FK_1d629abc2acdf8bc82a73be032a" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }
}
