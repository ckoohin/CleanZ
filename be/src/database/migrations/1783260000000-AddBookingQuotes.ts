import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBookingQuotes1783260000000 implements MigrationInterface {
  name = 'AddBookingQuotes1783260000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "booking_quotes" (
        "id"               UUID          NOT NULL DEFAULT gen_random_uuid(),
        "customer_id"      UUID          NOT NULL,
        "request_hash"     VARCHAR(64)   NOT NULL,
        "package_id"       UUID          NULL,
        "pricing_tier_id"  UUID          NULL,
        "duration_hours"   NUMERIC(4,1)  NULL,
        "area_m2"          NUMERIC(7,1)  NULL,
        "base_price"       NUMERIC(12,2) NOT NULL,
        "addon_price"      NUMERIC(12,2) NOT NULL DEFAULT 0,
        "peak_fee"         NUMERIC(12,2) NOT NULL DEFAULT 0,
        "peak_breakdown"   JSONB         NULL,
        "pet_fee"          NUMERIC(12,2) NOT NULL DEFAULT 0,
        "waiting_fee"      NUMERIC(12,2) NOT NULL DEFAULT 0,
        "subtotal"         NUMERIC(12,2) NOT NULL,
        "discount_amount"  NUMERIC(12,2) NOT NULL DEFAULT 0,
        "total_price"      NUMERIC(12,2) NOT NULL,
        "voucher_id"       UUID          NULL,
        "expires_at"       TIMESTAMP     NOT NULL,
        "used_at"          TIMESTAMP     NULL,
        "created_at"       TIMESTAMP     NOT NULL DEFAULT now(),
        CONSTRAINT "PK_booking_quotes" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_booking_quotes_customer_id" ON "booking_quotes" ("customer_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_booking_quotes_expires_at" ON "booking_quotes" ("expires_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_booking_quotes_expires_at"`);
    await queryRunner.query(`DROP INDEX "IDX_booking_quotes_customer_id"`);
    await queryRunner.query(`DROP TABLE "booking_quotes"`);
  }
}
