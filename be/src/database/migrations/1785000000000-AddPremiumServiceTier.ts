import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Gói dịch vụ Cao cấp (PREMIUM):
 * - Xác minh bộ dụng cụ chuyên dụng của tasker (điều kiện vào pool PREMIUM).
 * - Danh sách tasker yêu thích của khách (dùng để ưu tiên ghép đơn).
 * - Hạng dịch vụ + thợ chỉ định + chênh lệch giá trên booking và trên quote.
 *
 * Cột `service_tier` phải có mặt ở CẢ `bookings` lẫn `booking_quotes`: giá đã
 * khoá ở quote được ghi đè thẳng vào booking, thiếu ở một bên là sai giá ngầm.
 */
export class AddPremiumServiceTier1785000000000 implements MigrationInterface {
  name = 'AddPremiumServiceTier1785000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Xác minh dụng cụ của tasker ───────────────────────────────────────
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tasker_equipment_status') THEN
          CREATE TYPE "public"."tasker_equipment_status" AS ENUM (
            'NONE', 'PENDING', 'APPROVED', 'REJECTED'
          );
        END IF;
      END $$;
    `);

    await queryRunner.query(
      `ALTER TABLE "taskers" ADD COLUMN IF NOT EXISTS "equipment_status" "public"."tasker_equipment_status" NOT NULL DEFAULT 'NONE'`,
    );
    await queryRunner.query(
      `ALTER TABLE "taskers" ADD COLUMN IF NOT EXISTS "equipment_photo_urls" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "taskers" ADD COLUMN IF NOT EXISTS "equipment_reviewed_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "taskers" ADD COLUMN IF NOT EXISTS "equipment_reviewed_by" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "taskers" ADD COLUMN IF NOT EXISTS "equipment_note" text`,
    );

    // Pool PREMIUM luôn lọc theo equipment_status + rating → index phủ đúng
    // nhánh đó, partial để không phình trên phần lớn tasker chưa nộp dụng cụ.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_taskers_premium_pool"
         ON "taskers" ("equipment_status", "rating_avg" DESC)
         WHERE "equipment_status" = 'APPROVED'`,
    );

    // ── 2. Tasker yêu thích của khách ────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "customer_favorite_taskers" (
        "id"          uuid NOT NULL DEFAULT gen_random_uuid(),
        "customer_id" uuid NOT NULL,
        "tasker_id"   uuid NOT NULL,
        "note"        character varying(255),
        "created_at"  TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh'),
        CONSTRAINT "PK_customer_favorite_taskers" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_customer_favorite_taskers" UNIQUE ("customer_id", "tasker_id"),
        CONSTRAINT "FK_customer_favorite_taskers_customer"
          FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_customer_favorite_taskers_tasker"
          FOREIGN KEY ("tasker_id") REFERENCES "taskers"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_customer_favorite_taskers_customer_id"
         ON "customer_favorite_taskers" ("customer_id")`,
    );

    // ── 3. Hạng dịch vụ trên booking và quote ────────────────────────────────
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_service_tier') THEN
          CREATE TYPE "public"."booking_service_tier" AS ENUM ('STANDARD', 'PREMIUM');
        END IF;
      END $$;
    `);

    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "service_tier" "public"."booking_service_tier" NOT NULL DEFAULT 'STANDARD'`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "preferred_tasker_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "premium_fee" numeric(12,2) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_bookings_preferred_tasker'
        ) THEN
          ALTER TABLE "bookings"
            ADD CONSTRAINT "FK_bookings_preferred_tasker"
            FOREIGN KEY ("preferred_tasker_id") REFERENCES "taskers"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(
      `ALTER TABLE "booking_quotes" ADD COLUMN IF NOT EXISTS "service_tier" "public"."booking_service_tier" NOT NULL DEFAULT 'STANDARD'`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_quotes" ADD COLUMN IF NOT EXISTS "premium_fee" numeric(12,2) NOT NULL DEFAULT 0`,
    );

    // Lọc đơn PREMIUM chưa ai nhận (danh sách "Nhận đơn" + màn admin).
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_bookings_service_tier_status"
         ON "bookings" ("service_tier", "status")
         WHERE "service_tier" = 'PREMIUM'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_bookings_service_tier_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_quotes" DROP COLUMN IF EXISTS "premium_fee"`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_quotes" DROP COLUMN IF EXISTS "service_tier"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP CONSTRAINT IF EXISTS "FK_bookings_preferred_tasker"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN IF EXISTS "premium_fee"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN IF EXISTS "preferred_tasker_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN IF EXISTS "service_tier"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."booking_service_tier"`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_customer_favorite_taskers_customer_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "customer_favorite_taskers"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_taskers_premium_pool"`);
    await queryRunner.query(
      `ALTER TABLE "taskers" DROP COLUMN IF EXISTS "equipment_note"`,
    );
    await queryRunner.query(
      `ALTER TABLE "taskers" DROP COLUMN IF EXISTS "equipment_reviewed_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "taskers" DROP COLUMN IF EXISTS "equipment_reviewed_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "taskers" DROP COLUMN IF EXISTS "equipment_photo_urls"`,
    );
    await queryRunner.query(
      `ALTER TABLE "taskers" DROP COLUMN IF EXISTS "equipment_status"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."tasker_equipment_status"`,
    );
  }
}
