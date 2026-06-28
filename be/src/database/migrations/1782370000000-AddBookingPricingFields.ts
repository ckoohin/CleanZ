import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Bổ sung các cột hỗ trợ tính tiền theo m²/tier vào bảng bookings
 * và thêm tracking dịch vụ con được chọn vào booking_sub_services.
 *
 * Additive-only — tất cả cột mới đều nullable hoặc có DEFAULT, không ảnh hưởng data cũ.
 */
export class AddBookingPricingFields1782370000000 implements MigrationInterface {
  name = 'AddBookingPricingFields1782370000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. bookings — thêm area_m2 và pricing_tier_id
    await queryRunner.query(`
      ALTER TABLE "bookings"
        ADD COLUMN IF NOT EXISTS "area_m2"          NUMERIC(7,1),
        ADD COLUMN IF NOT EXISTS "pricing_tier_id"  UUID
    `);

    // 2. booking_sub_services — thêm is_default, is_selected, extra_fee
    await queryRunner.query(`
      ALTER TABLE "booking_sub_services"
        ADD COLUMN IF NOT EXISTS "is_default"   BOOLEAN NOT NULL DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS "is_selected"  BOOLEAN NOT NULL DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS "extra_fee"    NUMERIC(12,2) NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "booking_sub_services"
        DROP COLUMN IF EXISTS "extra_fee",
        DROP COLUMN IF EXISTS "is_selected",
        DROP COLUMN IF EXISTS "is_default"
    `);

    await queryRunner.query(`
      ALTER TABLE "bookings"
        DROP COLUMN IF EXISTS "pricing_tier_id",
        DROP COLUMN IF EXISTS "area_m2"
    `);
  }
}
