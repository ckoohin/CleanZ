import { MigrationInterface, QueryRunner } from 'typeorm';

export class AutoMigration1783598996236 implements MigrationInterface {
  name = 'AutoMigration1783598996236';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."uq_wallet_tx_incident_compensation"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_booking_addons_booking_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_booking_addons_addon_id"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."customer_withdrawal_requests_status_enum" RENAME TO "customer_withdrawal_requests_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."customer_withdrawal_requests_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'PROCESSED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_withdrawal_requests" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_withdrawal_requests" ALTER COLUMN "status" TYPE "public"."customer_withdrawal_requests_status_enum" USING "status"::"text"::"public"."customer_withdrawal_requests_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_withdrawal_requests" ALTER COLUMN "status" SET DEFAULT 'PENDING'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."customer_withdrawal_requests_status_enum_old"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."customer_withdrawal_requests_status_enum_old" AS ENUM('APPROVED', 'PENDING', 'PROCESSED', 'REJECTED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_withdrawal_requests" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_withdrawal_requests" ALTER COLUMN "status" TYPE "public"."customer_withdrawal_requests_status_enum_old" USING "status"::"text"::"public"."customer_withdrawal_requests_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_withdrawal_requests" ALTER COLUMN "status" SET DEFAULT 'PENDING'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."customer_withdrawal_requests_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."customer_withdrawal_requests_status_enum_old" RENAME TO "customer_withdrawal_requests_status_enum"`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_booking_addons_addon_id" ON "booking_addons" ("addon_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_booking_addons_booking_id" ON "booking_addons" ("booking_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_wallet_tx_incident_compensation" ON "wallet_transactions" ("reference_id", "reference_type", "type") WHERE ((reference_type)::text ~~ 'INCIDENT_COMPENSATION:v%'::text)`,
    );
  }
}
