import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Thêm hệ thống Pricing Tier cho KingOfService:
 * 1. Tạo enum type "pricing_mode" (HOURLY | AREA_HOURLY | FIXED)
 * 2. Thêm cột "pricing_mode" vào service_packages (nullable, default HOURLY)
 * 3. Tạo bảng pricing_tiers — cấu hình mức giá theo m² / giờ / cố định
 *
 * Additive-only: không xóa bảng/cột nào cũ. An toàn với data hiện có.
 */
export class AddPricingTiers1782360000000 implements MigrationInterface {
  name = 'AddPricingTiers1782360000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Tạo enum type pricing_mode (idempotent)
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "pricing_mode" AS ENUM ('HOURLY', 'AREA_HOURLY', 'FIXED');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // 2. Thêm cột pricing_mode vào service_packages
    await queryRunner.query(`
      ALTER TABLE "service_packages"
        ADD COLUMN IF NOT EXISTS "pricing_mode" "pricing_mode" DEFAULT 'HOURLY'
    `);

    // 3. Tạo bảng pricing_tiers
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "pricing_tiers" (
        "id"            UUID NOT NULL DEFAULT uuid_generate_v4(),
        "package_id"    UUID NOT NULL,
        "name"          VARCHAR(100) NOT NULL,
        "description"   VARCHAR(255),
        "pricing_mode"  "pricing_mode" NOT NULL DEFAULT 'HOURLY',

        -- AREA_HOURLY
        "area_min_m2"   NUMERIC(7,1),
        "area_max_m2"   NUMERIC(7,1),
        "price_per_m2"  NUMERIC(12,2),

        -- HOURLY
        "price_per_hour" NUMERIC(12,2),

        -- FIXED
        "fixed_price"   NUMERIC(12,2),

        -- Common
        "min_hours"     NUMERIC(3,1) NOT NULL DEFAULT 1.0,
        "max_hours"     NUMERIC(3,1) NOT NULL DEFAULT 8.0,
        "default_hours" NUMERIC(3,1),
        "sort_order"    INT NOT NULL DEFAULT 0,
        "is_active"     BOOLEAN NOT NULL DEFAULT TRUE,
        "created_at"    TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"    TIMESTAMP NOT NULL DEFAULT now(),

        CONSTRAINT "PK_pricing_tiers" PRIMARY KEY ("id"),
        CONSTRAINT "FK_pricing_tiers_package"
          FOREIGN KEY ("package_id")
          REFERENCES "service_packages"("id")
          ON DELETE CASCADE
      )
    `);

    // 4. Index để query nhanh theo package_id
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_pricing_tiers_package_id"
        ON "pricing_tiers" ("package_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_pricing_tiers_package_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "pricing_tiers"`);
    await queryRunner.query(`
      ALTER TABLE "service_packages" DROP COLUMN IF EXISTS "pricing_mode"
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS "pricing_mode"`);
  }
}
