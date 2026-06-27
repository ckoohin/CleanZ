import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Mở rộng bảng "policies"
 *  - Thêm enum type cho category
 *  - Thêm 4 cột: category, icon_emoji, is_default, sort_order
 *  - Tạo bảng join "package_policies" (M2M policy ↔ service_package)
 *
 * Tất cả thao tác đều IDEMPOTENT (IF NOT EXISTS / DO $$ … EXCEPTION).
 */
export class AddPolicyCategoryAndPackageJoin1782060000000 implements MigrationInterface {
  name = 'AddPolicyCategoryAndPackageJoin1782060000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Tạo enum type cho category (bỏ qua nếu đã tồn tại)
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."policies_category_enum" AS ENUM(
          'LEGAL',
          'CLEANING_STANDARD',
          'INCIDENT_HANDLING',
          'CANCELLATION',
          'CUSTOMER_SUPPORT',
          'PAYMENT',
          'GENERAL'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // 2. Thêm cột "category"
    await queryRunner.query(`
      ALTER TABLE "policies"
        ADD COLUMN IF NOT EXISTS "category"
          "public"."policies_category_enum"
          NOT NULL DEFAULT 'GENERAL'
    `);

    // 3. Thêm cột "icon_emoji"
    await queryRunner.query(`
      ALTER TABLE "policies"
        ADD COLUMN IF NOT EXISTS "icon_emoji"
          character varying(10)
          NOT NULL DEFAULT '📄'
    `);

    // 4. Thêm cột "is_default"
    await queryRunner.query(`
      ALTER TABLE "policies"
        ADD COLUMN IF NOT EXISTS "is_default"
          boolean
          NOT NULL DEFAULT false
    `);

    // 5. Thêm cột "sort_order"
    await queryRunner.query(`
      ALTER TABLE "policies"
        ADD COLUMN IF NOT EXISTS "sort_order"
          integer
          NOT NULL DEFAULT 0
    `);

    // 6. Tạo bảng join package_policies (M2M)
  await queryRunner.query(`
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'service_packages'
  ) THEN
    CREATE TABLE IF NOT EXISTS "package_policies" (
      "package_id" uuid NOT NULL,
      "policy_id" uuid NOT NULL,
      CONSTRAINT "PK_package_policies"
        PRIMARY KEY ("package_id", "policy_id"),
      CONSTRAINT "FK_package_policies_package"
        FOREIGN KEY ("package_id")
        REFERENCES "service_packages"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "FK_package_policies_policy"
        FOREIGN KEY ("policy_id")
        REFERENCES "policies"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
    );
  END IF;
END $$;
`);
    // 7. Index hỗ trợ lookup theo policy_id
   await queryRunner.query(`
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'package_policies'
  ) THEN
    CREATE INDEX IF NOT EXISTS "idx_package_policies_policy"
      ON "package_policies" ("policy_id");
  END IF;
END $$;
`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "package_policies"`);
    await queryRunner.query(`ALTER TABLE "policies" DROP COLUMN IF EXISTS "sort_order"`);
    await queryRunner.query(`ALTER TABLE "policies" DROP COLUMN IF EXISTS "is_default"`);
    await queryRunner.query(`ALTER TABLE "policies" DROP COLUMN IF EXISTS "icon_emoji"`);
    await queryRunner.query(`ALTER TABLE "policies" DROP COLUMN IF EXISTS "category"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."policies_category_enum"`);
  }
}
