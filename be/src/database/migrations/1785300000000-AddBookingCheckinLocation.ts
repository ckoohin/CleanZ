import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Check-in theo vị trí thật:
 * - Lưu tọa độ GPS tasker gửi lúc bấm check-in + khoảng cách đường chim bay
 *   tới địa chỉ khách.
 * - Ngoài bán kính cho phép (50m) hoặc không có GPS thì phải kèm ảnh minh
 *   chứng (checkin_proof_photo_url) và đơn bị gắn cờ checkin_far cho admin
 *   lọc — không phạt điểm tasker.
 */
export class AddBookingCheckinLocation1785300000000 implements MigrationInterface {
  name = 'AddBookingCheckinLocation1785300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "checkin_latitude" numeric(10,7)`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "checkin_longitude" numeric(10,7)`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "checkin_distance_meters" numeric(10,1)`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "checkin_proof_photo_url" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "checkin_far" boolean NOT NULL DEFAULT false`,
    );

    // Admin lọc đơn check-in xa — partial index vì tuyệt đại đa số đơn là false.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_bookings_checkin_far"
         ON "bookings" ("checkin_far")
         WHERE "checkin_far" = true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_bookings_checkin_far"`);
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN IF EXISTS "checkin_far"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN IF EXISTS "checkin_proof_photo_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN IF EXISTS "checkin_distance_meters"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN IF EXISTS "checkin_longitude"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN IF EXISTS "checkin_latitude"`,
    );
  }
}
