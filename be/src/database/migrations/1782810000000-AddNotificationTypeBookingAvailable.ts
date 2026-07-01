import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationTypeBookingAvailable1782810000000 implements MigrationInterface {
  name = 'AddNotificationTypeBookingAvailable1782810000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'BOOKING_NEW_AVAILABLE'`,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL không hỗ trợ xóa enum value mà không rebuild type — no-op
  }
}
