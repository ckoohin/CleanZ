import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Nâng cấp luồng phụ phí phát sinh thêm giờ:
 * - Thay cờ boolean `surcharge_pending` bằng enum `surcharge_status` để phân biệt
 *   được khách im lặng, khách từ chối và chờ tasker xác nhận đã nhận tiền mặt.
 * - Thêm state cho luồng xin khách duyệt thêm giờ TRƯỚC khi làm.
 */
export class AddBookingOvertimeApproval1784900000000 implements MigrationInterface {
  name = 'AddBookingOvertimeApproval1784900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Trạng thái phụ phí ───────────────────────────────────────────────────
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_surcharge_status') THEN
          CREATE TYPE "public"."booking_surcharge_status" AS ENUM (
            'NONE',
            'PENDING_CUSTOMER',
            'PENDING_TASKER_CONFIRM',
            'PAID',
            'WAIVED',
            'DISPUTED'
          );
        END IF;
      END $$;
    `);

    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "surcharge_status" "public"."booking_surcharge_status" NOT NULL DEFAULT 'NONE'`,
    );

    // Chuyển dữ liệu cũ: cờ bật = đang chờ khách; đơn đã hoàn thành mà có phụ phí = đã thu.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'bookings' AND column_name = 'surcharge_pending'
        ) THEN
          UPDATE "bookings" SET "surcharge_status" = 'PENDING_CUSTOMER'
            WHERE "surcharge_pending" = true;
          UPDATE "bookings" SET "surcharge_status" = 'PAID'
            WHERE "surcharge_pending" = false
              AND "waiting_fee" > 0
              AND "status" = 'COMPLETED';
        END IF;
      END $$;
    `);

    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN IF EXISTS "surcharge_pending"`,
    );

    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "surcharge_dispute_reason" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "platform_advance_amount" numeric(12,2) NOT NULL DEFAULT 0`,
    );

    // ── Luồng xin đồng ý trước ───────────────────────────────────────────────
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_overtime_request_status') THEN
          CREATE TYPE "public"."booking_overtime_request_status" AS ENUM (
            'NONE', 'NOTIFIED', 'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'
          );
        END IF;
      END $$;
    `);

    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "overtime_request_status" "public"."booking_overtime_request_status" NOT NULL DEFAULT 'NONE'`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "overtime_request_minutes" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "overtime_request_fee" numeric(12,2) NOT NULL DEFAULT 0`,
    );
    // Giờ VN theo chuẩn đã chuẩn hoá ở migration NormalizeTimestampsToVietnamTime.
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "overtime_requested_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "overtime_responded_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "approved_overtime_minutes" integer NOT NULL DEFAULT 0`,
    );

    // Admin lọc nhanh đơn đang treo / tranh chấp phụ phí.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_bookings_surcharge_status"
        ON "bookings" ("surcharge_status")
        WHERE "surcharge_status" IN ('PENDING_CUSTOMER', 'PENDING_TASKER_CONFIRM', 'DISPUTED')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_bookings_surcharge_status"`,
    );

    for (const column of [
      'approved_overtime_minutes',
      'overtime_responded_at',
      'overtime_requested_at',
      'overtime_request_fee',
      'overtime_request_minutes',
      'overtime_request_status',
      'platform_advance_amount',
      'surcharge_dispute_reason',
    ]) {
      await queryRunner.query(
        `ALTER TABLE "bookings" DROP COLUMN IF EXISTS "${column}"`,
      );
    }
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."booking_overtime_request_status"`,
    );

    // Khôi phục cờ boolean cũ từ enum trước khi bỏ enum.
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "surcharge_pending" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(`
      UPDATE "bookings" SET "surcharge_pending" = true
        WHERE "surcharge_status" IN ('PENDING_CUSTOMER', 'PENDING_TASKER_CONFIRM')
    `);
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN IF EXISTS "surcharge_status"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."booking_surcharge_status"`,
    );
  }
}
