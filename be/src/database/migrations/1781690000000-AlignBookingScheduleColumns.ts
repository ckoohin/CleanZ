import { MigrationInterface, QueryRunner } from 'typeorm';

// Sửa lệch schema: BookingEntity dùng scheduled_start_date/time + scheduled_end_date/time (4 cột tách),
// nhưng DB (data.sql) có scheduled_start/scheduled_end (2 cột timestamp gộp) → query lỗi
// "column scheduled_start_date does not exist". Migrate DB khớp entity.
// Idempotent + backfill an toàn (nếu còn dữ liệu cũ ở cột gộp).
export class AlignBookingScheduleColumns1781690000000
  implements MigrationInterface
{
  name = 'AlignBookingScheduleColumns1781690000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Thêm 4 cột tách (nullable, khớp entity)
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "scheduled_start_date" date;`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "scheduled_start_time" time;`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "scheduled_end_date" date;`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "scheduled_end_time" time;`,
    );

    // 2) Backfill từ cột gộp (chỉ khi cột gộp còn tồn tại) — tách timestamp → date + time
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='bookings' AND column_name='scheduled_start'
        ) THEN
          UPDATE "bookings" SET
            "scheduled_start_date" = "scheduled_start"::date,
            "scheduled_start_time" = "scheduled_start"::time,
            "scheduled_end_date"   = "scheduled_end"::date,
            "scheduled_end_time"   = "scheduled_end"::time;
        END IF;
      END $$;
    `);

    // 3) Drop cột gộp + ràng buộc/index phụ thuộc (CHECK scheduled_start<scheduled_end,
    //    index idx_bookings_status_schedule) qua CASCADE
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN IF EXISTS "scheduled_start" CASCADE;`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN IF EXISTS "scheduled_end" CASCADE;`,
    );

    // 4) Tạo lại index lịch theo cột mới (thay idx_bookings_status_schedule cũ)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_bookings_status_schedule"
         ON "bookings" ("status","scheduled_start_date","scheduled_start_time");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "scheduled_start" TIMESTAMP;`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "scheduled_end" TIMESTAMP;`,
    );
    await queryRunner.query(`
      UPDATE "bookings" SET
        "scheduled_start" = ("scheduled_start_date" + "scheduled_start_time"),
        "scheduled_end"   = ("scheduled_end_date" + "scheduled_end_time")
      WHERE "scheduled_start_date" IS NOT NULL;
    `);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_bookings_status_schedule";`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN IF EXISTS "scheduled_start_date";`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN IF EXISTS "scheduled_start_time";`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN IF EXISTS "scheduled_end_date";`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN IF EXISTS "scheduled_end_time";`,
    );
  }
}
