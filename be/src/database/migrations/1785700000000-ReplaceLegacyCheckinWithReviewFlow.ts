import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Thay luồng challenge/exception check-in cũ (code đã bị xóa) bằng:
 * - snapshot GPS + tọa độ đích ngay trên booking;
 * - hàng chờ Admin duyệt check-in bất thường;
 * - phân loại Incident để nối vi phạm check-in vào engine bồi thường hiện có.
 *
 * Bốn bảng legacy bị xóa có chủ đích. `down` không dựng lại kiến trúc cũ và
 * không thể khôi phục dữ liệu đã xóa.
 */
export class ReplaceLegacyCheckinWithReviewFlow1785700000000 implements MigrationInterface {
  name = 'ReplaceLegacyCheckinWithReviewFlow1785700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Bảng con trước, bảng cha sau — không dùng CASCADE để tránh xóa ngoài ý muốn.
    await queryRunner.query(
      `DROP TABLE IF EXISTS "booking_checkin_challenge_events"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "booking_checkin_exception_evidences"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "booking_checkin_exception_reports"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "booking_checkin_challenges"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "checkin_challenge_event"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "checkin_challenge_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "checkin_exception_reason"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "checkin_exception_status"`);

    await queryRunner.query(
      `CREATE TYPE "booking_checkin_verification_source" AS ENUM (
        'GPS',
        'GPS_WITH_PROOF',
        'NO_GPS_WITH_PROOF',
        'TARGET_MISSING_WITH_PROOF',
        'ADMIN_OVERRIDE'
      )`,
    );
    await queryRunner.query(
      `CREATE TYPE "booking_checkin_review_status" AS ENUM (
        'NOT_REQUIRED',
        'PENDING_REVIEW',
        'APPROVED',
        'REJECTED',
        'NOT_VERIFIABLE'
      )`,
    );

    await queryRunner.query(
      `ALTER TABLE "bookings"
       ADD COLUMN "checkin_accuracy_meters" numeric(10,1)`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings"
       ADD COLUMN "checkin_target_latitude" numeric(10,7)`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings"
       ADD COLUMN "checkin_target_longitude" numeric(10,7)`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings"
       ADD COLUMN "checkin_verification_source" "booking_checkin_verification_source"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings"
       ADD COLUMN "checkin_review_status" "booking_checkin_review_status"
       NOT NULL DEFAULT 'NOT_REQUIRED'`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings"
       ADD COLUMN "checkin_reviewed_by_admin_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings"
       ADD COLUMN "checkin_reviewed_at" timestamp`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings"
       ADD COLUMN "checkin_review_reason" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings"
       ADD CONSTRAINT "FK_bookings_checkin_reviewed_by_admin"
       FOREIGN KEY ("checkin_reviewed_by_admin_id")
       REFERENCES "users"("id")
       ON DELETE SET NULL
       ON UPDATE CASCADE`,
    );

    // Chốt tọa độ đích cho các check-in cũ: ưu tiên sổ địa chỉ, fallback snapshot.
    await queryRunner.query(
      `UPDATE "bookings" b
       SET "checkin_target_latitude" = COALESCE(a."latitude", b."latitude"),
           "checkin_target_longitude" = COALESCE(a."longitude", b."longitude")
       FROM "customer_addresses" a
       WHERE b."address_id" = a."id"
         AND b."checked_in_at" IS NOT NULL`,
    );
    await queryRunner.query(
      `UPDATE "bookings"
       SET "checkin_target_latitude" =
             COALESCE("checkin_target_latitude", "latitude"),
           "checkin_target_longitude" =
             COALESCE("checkin_target_longitude", "longitude")
       WHERE "checked_in_at" IS NOT NULL`,
    );

    await queryRunner.query(
      `UPDATE "bookings"
       SET "checkin_review_status" =
             CASE
               WHEN "checkin_far" = true THEN 'PENDING_REVIEW'::"booking_checkin_review_status"
               ELSE 'NOT_REQUIRED'::"booking_checkin_review_status"
             END,
           "checkin_verification_source" =
             CASE
               WHEN "checkin_far" = true
                    AND "checkin_latitude" IS NOT NULL
                    AND "checkin_longitude" IS NOT NULL
                 THEN 'GPS_WITH_PROOF'::"booking_checkin_verification_source"
               WHEN "checkin_far" = true
                 THEN 'NO_GPS_WITH_PROOF'::"booking_checkin_verification_source"
               WHEN "checkin_latitude" IS NOT NULL
                    AND "checkin_longitude" IS NOT NULL
                 THEN 'GPS'::"booking_checkin_verification_source"
               ELSE NULL
             END
       WHERE "checked_in_at" IS NOT NULL`,
    );

    await queryRunner.query(
      `CREATE INDEX "idx_bookings_checkin_review_queue"
       ON "bookings" ("checkin_review_status", "checked_in_at")
       WHERE "checkin_review_status" = 'PENDING_REVIEW'`,
    );

    await queryRunner.query(
      `CREATE TYPE "incident_type" AS ENUM (
        'PROPERTY_DAMAGE',
        'CHECKIN_VIOLATION'
      )`,
    );
    await queryRunner.query(
      `CREATE TYPE "incident_source" AS ENUM (
        'CUSTOMER_REPORT',
        'SUPPORT_TICKET',
        'CHECKIN_REVIEW'
      )`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents"
       ADD COLUMN "type" "incident_type"
       NOT NULL DEFAULT 'PROPERTY_DAMAGE'`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents"
       ADD COLUMN "source" "incident_source"
       NOT NULL DEFAULT 'CUSTOMER_REPORT'`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_incidents_type_source"
       ON "incidents" ("type", "source")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_incidents_type_source"`);
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP COLUMN IF EXISTS "source"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP COLUMN IF EXISTS "type"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "incident_source"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "incident_type"`);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_bookings_checkin_review_queue"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings"
       DROP CONSTRAINT IF EXISTS "FK_bookings_checkin_reviewed_by_admin"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN IF EXISTS "checkin_review_reason"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN IF EXISTS "checkin_reviewed_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings"
       DROP COLUMN IF EXISTS "checkin_reviewed_by_admin_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN IF EXISTS "checkin_review_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings"
       DROP COLUMN IF EXISTS "checkin_verification_source"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings"
       DROP COLUMN IF EXISTS "checkin_target_longitude"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings"
       DROP COLUMN IF EXISTS "checkin_target_latitude"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings"
       DROP COLUMN IF EXISTS "checkin_accuracy_meters"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "booking_checkin_review_status"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "booking_checkin_verification_source"`,
    );
  }
}
