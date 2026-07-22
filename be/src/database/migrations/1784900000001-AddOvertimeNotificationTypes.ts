import { MigrationInterface, QueryRunner } from 'typeorm';

const NEW_TYPES = [
  'BOOKING_OVERTIME_REQUEST',
  'BOOKING_OVERTIME_APPROVED',
  'BOOKING_OVERTIME_REJECTED',
  'BOOKING_SURCHARGE_AWAITING_RECEIPT',
  'BOOKING_SURCHARGE_DISPUTED',
];

export class AddOvertimeNotificationTypes1784900000001 implements MigrationInterface {
  name = 'AddOvertimeNotificationTypes1784900000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const type of NEW_TYPES) {
      await queryRunner.query(
        `ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS '${type}'`,
      );
    }
  }

  // Postgres không cho xoá value khỏi enum — no-op (giống các migration enum khác).
  public async down(): Promise<void> {}
}
