import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationTypeBookingNewAvailable1783710000000 implements MigrationInterface {
  name = 'AddNotificationTypeBookingNewAvailable1783710000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'BOOKING_NEW_AVAILABLE'`,
    );
  }

  // Postgres cannot remove a value from an enum type; rebuilding it would
  // require rewriting every dependent column, so this is intentionally a no-op.
  public async down(): Promise<void> {}
}
