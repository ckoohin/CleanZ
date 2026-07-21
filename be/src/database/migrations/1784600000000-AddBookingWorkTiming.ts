import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBookingWorkTiming1784600000000 implements MigrationInterface {
  name = 'AddBookingWorkTiming1784600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Thời gian làm việc thực tế (check-in → check-out) và phần phát sinh / sớm.
    // Phí phát sinh tái dùng cột `waiting_fee` sẵn có nên không thêm cột tiền mới.
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "checked_out_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "overtime_minutes" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "early_minutes" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "surcharge_pending" boolean NOT NULL DEFAULT false`,
    );
    // Hỗ trợ admin lọc nhanh đơn checkout sớm bất thường / có phát sinh.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_bookings_early_minutes" ON "bookings" ("early_minutes")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_bookings_overtime_minutes" ON "bookings" ("overtime_minutes")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_bookings_overtime_minutes"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_bookings_early_minutes"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN IF EXISTS "surcharge_pending"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN IF EXISTS "early_minutes"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN IF EXISTS "overtime_minutes"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN IF EXISTS "checked_out_at"`,
    );
  }
}
