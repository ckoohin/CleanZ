import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Điền lại `scheduled_start` / `scheduled_end` cho các đơn đã tạo qua app khách.
 *
 * `customer-booking.service.ts` chỉ ghi cặp cột tách rời (`scheduled_start_date` +
 * `scheduled_start_time`) mà quên cột timestamp gộp — trong khi dashboard admin
 * (`getKpis`, `getGmvChart`) lọc theo đúng cột gộp đó. Hai cột nullable nên DB
 * không báo gì, chỉ dẫn tới việc mọi đơn của khách biến mất khỏi biểu đồ doanh thu
 * và khỏi KPI khi chọn một khoảng ngày cụ thể.
 *
 * Luồng tasker tạo hộ và admin tạo đơn vẫn ghi đúng, nên chỉ dữ liệu cũ của app
 * khách cần vá.
 *
 * Cột thuộc kiểu `timestamp without time zone` và toàn hệ thống lưu giờ VN, nên
 * phép `date + time` cho ra đúng mốc mong muốn, không cần đổi múi giờ.
 *
 * CHỈ điền khi đang NULL — không ghi đè giá trị sẵn có, vì bản ghi do tasker tạo
 * lưu mốc chính xác tới giây còn phép ghép chỉ có độ phân giải tới phút.
 */
export class BackfillBookingScheduledStartEnd1787700000000 implements MigrationInterface {
  name = 'BackfillBookingScheduledStartEnd1787700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "bookings"
      SET "scheduled_start" = "scheduled_start_date" + "scheduled_start_time"
      WHERE "scheduled_start" IS NULL
        AND "scheduled_start_date" IS NOT NULL
        AND "scheduled_start_time" IS NOT NULL
    `);

    await queryRunner.query(`
      UPDATE "bookings"
      SET "scheduled_end" = "scheduled_end_date" + "scheduled_end_time"
      WHERE "scheduled_end" IS NULL
        AND "scheduled_end_date" IS NOT NULL
        AND "scheduled_end_time" IS NOT NULL
    `);
  }

  public async down(): Promise<void> {
    // Không đảo ngược: xoá về NULL sẽ làm hỏng lại chính dữ liệu vừa vá, và không
    // có cách phân biệt bản ghi do migration này điền với bản ghi ứng dụng tự ghi.
  }
}
