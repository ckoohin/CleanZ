import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationTypeSurchargePending1784600000001 implements MigrationInterface {
  name = 'AddNotificationTypeSurchargePending1784600000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'BOOKING_SURCHARGE_PENDING'`,
    );
  }

  // Postgres không cho xoá value khỏi enum — no-op (giống các migration enum khác).
  public async down(): Promise<void> {}
}
