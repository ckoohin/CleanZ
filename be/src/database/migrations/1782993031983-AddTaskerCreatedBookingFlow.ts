import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaskerCreatedBookingFlow1782993031983 implements MigrationInterface {
  name = 'AddTaskerCreatedBookingFlow1782993031983';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Extend booking_status enum
    await queryRunner.query(
      `ALTER TYPE "public"."booking_status" ADD VALUE IF NOT EXISTS 'PENDING_CUSTOMER_CONFIRMATION'`,
    );

    // 2. Extend cancelled_by enum
    await queryRunner.query(
      `ALTER TYPE "public"."cancelled_by" ADD VALUE IF NOT EXISTS 'CUSTOMER_DECLINED'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."cancelled_by" ADD VALUE IF NOT EXISTS 'SYSTEM_TIMEOUT'`,
    );

    // 3. Extend notification_type enum
    await queryRunner.query(
      `ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'BOOKING_PENDING_CONFIRMATION'`,
    );

    // 4. Create booking_source enum type
    await queryRunner.query(
      `DO $$ BEGIN
        CREATE TYPE "public"."booking_source" AS ENUM('CUSTOMER_APP', 'TASKER_CREATED');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$`,
    );

    // 5. Add source column to bookings
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "source" "public"."booking_source" NOT NULL DEFAULT 'CUSTOMER_APP'`,
    );

    // 6. Add confirmation_deadline column to bookings
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "confirmation_deadline" TIMESTAMP NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN IF EXISTS "confirmation_deadline"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN IF EXISTS "source"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."booking_source"`);
    // Note: PostgreSQL does not support removing enum values — rollback of enum extensions is not possible
  }
}
