import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * B1 — Đồng bộ doc↔code: bổ sung `verification_status` cho từng hạng mục thiệt hại.
 * Cho phép finalize chỉ khi mọi item đã VERIFIED/REJECTED (không còn PENDING/NEED_MORE_EVIDENCE).
 * Backfill: item đã có verified_amount → VERIFIED (nếu >0) / REJECTED (nếu =0); còn lại PENDING.
 */
export class AddDamageItemVerificationStatus1782870000000 implements MigrationInterface {
  name = 'AddDamageItemVerificationStatus1782870000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='incident_damage_item_verification_status') THEN
          CREATE TYPE "incident_damage_item_verification_status" AS ENUM ('PENDING','VERIFIED','REJECTED','NEED_MORE_EVIDENCE');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "incident_damage_items"
      ADD COLUMN IF NOT EXISTS "verification_status" "incident_damage_item_verification_status"
      NOT NULL DEFAULT 'PENDING'
    `);

    // Backfill từ verified_amount đã có (dữ liệu cũ).
    await queryRunner.query(`
      UPDATE "incident_damage_items"
      SET "verification_status" = CASE
        WHEN "verified_amount" IS NULL THEN 'PENDING'
        WHEN "verified_amount" > 0 THEN 'VERIFIED'
        ELSE 'REJECTED'
      END::"incident_damage_item_verification_status"
      WHERE "verification_status" = 'PENDING'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "incident_damage_items" DROP COLUMN IF EXISTS "verification_status"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "incident_damage_item_verification_status"`,
    );
  }
}
