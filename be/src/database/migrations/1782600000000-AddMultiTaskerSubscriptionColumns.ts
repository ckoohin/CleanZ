import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Đảm bảo các cột "chọn nhiều thợ" và "gói tháng" tồn tại trong DB.
 *
 * Dùng IF NOT EXISTS / CREATE TABLE IF NOT EXISTS để idempotent:
 * - Nếu cột/bảng đã tồn tại (tạo trước bởi synchronize) → không làm gì
 * - Nếu chưa tồn tại → tạo mới
 */
export class AddMultiTaskerSubscriptionColumns1782600000000
  implements MigrationInterface
{
  name = 'AddMultiTaskerSubscriptionColumns1782600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. service_packages — các cột cho tính năng mới
    await queryRunner.query(`
      ALTER TABLE "service_packages"
        ADD COLUMN IF NOT EXISTS "base_hourly_rate"      NUMERIC(12,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "premium_hourly_rate"   NUMERIC(12,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "allow_multiple_taskers" BOOLEAN       NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS "allow_subscription"    BOOLEAN       NOT NULL DEFAULT FALSE
    `);

    // 2. service_subscriptions — bảng cấu hình gói tháng
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "service_subscriptions" (
        "id"               UUID         NOT NULL DEFAULT uuid_generate_v4(),
        "package_id"       UUID         NOT NULL,
        "name"             VARCHAR(255) NOT NULL,
        "description"      TEXT,
        "discount_percent" NUMERIC(5,2) NOT NULL DEFAULT 0,
        "is_active"        BOOLEAN      NOT NULL DEFAULT TRUE,
        "created_at"       TIMESTAMP    NOT NULL DEFAULT now(),
        "updated_at"       TIMESTAMP    NOT NULL DEFAULT now(),
        CONSTRAINT "PK_service_subscriptions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_service_subscriptions_package"
          FOREIGN KEY ("package_id")
          REFERENCES "service_packages"("id")
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_service_subscriptions_package_id"
        ON "service_subscriptions" ("package_id")
    `);

    // 3. service_peak_hours — bảng cấu hình giờ cao điểm
    //    (Đã tồn tại nếu chạy AutoMigration trước, nên dùng IF NOT EXISTS)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "service_peak_hours" (
        "id"          UUID         NOT NULL DEFAULT uuid_generate_v4(),
        "package_id"  UUID         NOT NULL,
        "day_of_week" INTEGER      NOT NULL,
        "start_hour"  VARCHAR(10)  NOT NULL,
        "end_hour"    VARCHAR(10)  NOT NULL,
        "multiplier"  NUMERIC(5,2) NOT NULL DEFAULT 1.0,
        "start_date"  TIMESTAMP,
        "end_date"    TIMESTAMP,
        "is_active"   BOOLEAN      NOT NULL DEFAULT TRUE,
        "created_at"  TIMESTAMP    NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMP    NOT NULL DEFAULT now(),
        CONSTRAINT "PK_service_peak_hours" PRIMARY KEY ("id"),
        CONSTRAINT "FK_service_peak_hours_package"
          FOREIGN KEY ("package_id")
          REFERENCES "service_packages"("id")
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_service_peak_hours_package_id"
        ON "service_peak_hours" ("package_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_service_peak_hours_package_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "service_peak_hours"`);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_service_subscriptions_package_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "service_subscriptions"`);

    await queryRunner.query(`
      ALTER TABLE "service_packages"
        DROP COLUMN IF EXISTS "allow_subscription",
        DROP COLUMN IF EXISTS "allow_multiple_taskers",
        DROP COLUMN IF EXISTS "premium_hourly_rate",
        DROP COLUMN IF EXISTS "base_hourly_rate"
    `);
  }
}
