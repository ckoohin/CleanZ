import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * No-show là một case vận hành của booking, không phải trạng thái thanh toán:
 * customer được hoàn tiền ngay ở T+45; Tasker có quyền giải trình; Admin mới là
 * bên kết luận và chỉ khi CONFIRMED hệ thống mới cộng điểm vi phạm.
 */
export class AddBookingNoShowReviewFlow1785800000000 implements MigrationInterface {
  name = 'AddBookingNoShowReviewFlow1785800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "booking_no_show_review_status" AS ENUM (
        'NONE',
        'PENDING_REVIEW',
        'CONFIRMED',
        'EXCUSED'
      )`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings"
       ADD COLUMN "no_show_review_status" "booking_no_show_review_status"
       NOT NULL DEFAULT 'NONE'`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN "no_show_detected_at" timestamp`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN "no_show_explanation" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings"
       ADD COLUMN "no_show_explanation_submitted_at" timestamp`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings"
       ADD COLUMN "no_show_reviewed_by_admin_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN "no_show_reviewed_at" timestamp`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN "no_show_review_reason" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings"
       ADD COLUMN "no_show_warning_points" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings"
       ADD COLUMN "no_show_refund_amount" numeric(12,2) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings"
       ADD CONSTRAINT "FK_bookings_no_show_reviewed_by_admin"
       FOREIGN KEY ("no_show_reviewed_by_admin_id")
       REFERENCES "users"("id")
       ON DELETE SET NULL
       ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_bookings_no_show_review_queue"
       ON "bookings" ("no_show_review_status", "no_show_detected_at")
       WHERE "no_show_review_status" = 'PENDING_REVIEW'`,
    );

    await queryRunner.query(
      `ALTER TYPE "incident_type" ADD VALUE IF NOT EXISTS 'NO_SHOW'`,
    );
    await queryRunner.query(
      `ALTER TYPE "incident_source" ADD VALUE IF NOT EXISTS 'NO_SHOW_REVIEW'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Bảo toàn incident đã tạo bằng cách hạ về phân loại gần nhất trước khi bỏ
    // giá trị enum. Không xóa hồ sơ/bằng chứng/bồi thường.
    await queryRunner.query(
      `UPDATE "incidents"
       SET "type" = 'CHECKIN_VIOLATION'
       WHERE "type" = 'NO_SHOW'`,
    );
    await queryRunner.query(
      `UPDATE "incidents"
       SET "source" = 'CHECKIN_REVIEW'
       WHERE "source" = 'NO_SHOW_REVIEW'`,
    );

    await queryRunner.query(
      `ALTER TABLE "incidents" ALTER COLUMN "type" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TYPE "incident_type" RENAME TO "incident_type_with_no_show"`,
    );
    await queryRunner.query(
      `CREATE TYPE "incident_type" AS ENUM (
        'PROPERTY_DAMAGE',
        'CHECKIN_VIOLATION'
      )`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents"
       ALTER COLUMN "type" TYPE "incident_type"
       USING "type"::text::"incident_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents"
       ALTER COLUMN "type" SET DEFAULT 'PROPERTY_DAMAGE'`,
    );
    await queryRunner.query(`DROP TYPE "incident_type_with_no_show"`);

    await queryRunner.query(
      `ALTER TABLE "incidents" ALTER COLUMN "source" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TYPE "incident_source" RENAME TO "incident_source_with_no_show"`,
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
       ALTER COLUMN "source" TYPE "incident_source"
       USING "source"::text::"incident_source"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents"
       ALTER COLUMN "source" SET DEFAULT 'CUSTOMER_REPORT'`,
    );
    await queryRunner.query(`DROP TYPE "incident_source_with_no_show"`);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_bookings_no_show_review_queue"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings"
       DROP CONSTRAINT IF EXISTS "FK_bookings_no_show_reviewed_by_admin"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN IF EXISTS "no_show_refund_amount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN IF EXISTS "no_show_warning_points"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN IF EXISTS "no_show_review_reason"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN IF EXISTS "no_show_reviewed_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings"
       DROP COLUMN IF EXISTS "no_show_reviewed_by_admin_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings"
       DROP COLUMN IF EXISTS "no_show_explanation_submitted_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN IF EXISTS "no_show_explanation"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN IF EXISTS "no_show_detected_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN IF EXISTS "no_show_review_status"`,
    );
    await queryRunner.query(`DROP TYPE "booking_no_show_review_status"`);
  }
}
