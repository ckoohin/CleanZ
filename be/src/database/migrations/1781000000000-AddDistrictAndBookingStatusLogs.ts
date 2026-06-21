import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Đồng bộ schema còn thiếu so với entity:
 *  1) Thêm cột `bookings.district` (BookingEntity.district — varchar(100), nullable).
 *  2) Tạo bảng `booking_status_logs` (BookingStatusLogEntity) đang được code ghi/đọc
 *     (customer/tasker/expiration services + AdminDashboardRepository) nhưng chưa tồn tại trong DB.
 *
 * Dùng IF [NOT] EXISTS để an toàn (DB hiện đang lệch schema, không có migration trước đó).
 * Enum types `booking_status`, `cancelled_by` đã tồn tại sẵn (bookings đang dùng).
 */
export class AddDistrictAndBookingStatusLogs1781000000000
  implements MigrationInterface
{
  name = 'AddDistrictAndBookingStatusLogs1781000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Cần cho uuid_generate_v4()
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // 1) bookings.district
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "district" character varying(100)`,
    );

    // 2) booking_status_logs
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "booking_status_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "booking_id" uuid NOT NULL,
        "old_status" "booking_status",
        "new_status" "booking_status" NOT NULL,
        "changed_by_user_id" uuid,
        "note" text,
        "cancelled_by" "cancelled_by",
        "cancelled_by_user_id" uuid,
        "cancel_reason" text,
        "cancellation_fee" numeric(12,2) NOT NULL DEFAULT 0,
        "refund_amount" numeric(12,2) NOT NULL DEFAULT 0,
        "payment_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_booking_status_logs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_bsl_booking" FOREIGN KEY ("booking_id")
          REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "FK_bsl_changed_by_user" FOREIGN KEY ("changed_by_user_id")
          REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "FK_bsl_cancelled_by_user" FOREIGN KEY ("cancelled_by_user_id")
          REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
        -- FK tới "payments" tạm bỏ: bảng payments hiện chưa tồn tại trong DB (drift riêng).
        -- Cột payment_id vẫn được tạo; thêm FK sau khi bảng payments được tạo.
      )
    `);

    // Index hỗ trợ truy vấn dashboard (lọc theo booking + thời gian)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_bsl_booking_id" ON "booking_status_logs" ("booking_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_bsl_created_at" ON "booking_status_logs" ("created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "booking_status_logs"`);
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN IF EXISTS "district"`,
    );
  }
}
