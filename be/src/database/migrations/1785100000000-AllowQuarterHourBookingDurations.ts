import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Customer có thể chọn thời lượng theo block 15 phút (1.25h, 1.5h, 1.75h...).
 *
 * NUMERIC(4,1) làm tròn 1.25 thành 1.3, khiến lịch kết thúc, báo giá và dữ liệu
 * booking lệch nhau. Hai bảng quote/booking phải dùng cùng độ chính xác vì
 * quote được khóa rồi dùng lại khi tạo booking.
 */
export class AllowQuarterHourBookingDurations1785100000000 implements MigrationInterface {
  name = 'AllowQuarterHourBookingDurations1785100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "booking_quotes" ALTER COLUMN "duration_hours" TYPE numeric(5,2) USING "duration_hours"::numeric(5,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ALTER COLUMN "duration_hours" TYPE numeric(5,2) USING "duration_hours"::numeric(5,2)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "bookings" ALTER COLUMN "duration_hours" TYPE numeric(4,1) USING "duration_hours"::numeric(4,1)`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_quotes" ALTER COLUMN "duration_hours" TYPE numeric(4,1) USING "duration_hours"::numeric(4,1)`,
    );
  }
}
