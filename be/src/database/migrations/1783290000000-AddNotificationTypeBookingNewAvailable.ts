import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationTypeBookingNewAvailable1783290000000
  implements MigrationInterface
{
  name = 'AddNotificationTypeBookingNewAvailable1783290000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Bổ sung giá trị enum còn thiếu trong DB.
    // Giá trị này đã tồn tại trong NotificationType (TS) và được emit ở
    // booking-dispatch.processor, nhưng migration gốc bị archive nên chưa chạy
    // → gây lỗi "invalid input value for enum notification_type" khi lọc/insert.
    await queryRunner.query(
      `ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'BOOKING_NEW_AVAILABLE'`,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL không hỗ trợ xóa enum value mà không rebuild type — no-op
  }
}
