import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phân biệt check-in ngoài bán kính với check-in có GPS sai số lớn để Admin
 * nhìn đúng nguyên nhân cần hậu kiểm.
 */
export class AddLowAccuracyCheckinVerificationSource1786000000000 implements MigrationInterface {
  name = 'AddLowAccuracyCheckinVerificationSource1786000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "booking_checkin_verification_source"
       ADD VALUE IF NOT EXISTS 'GPS_LOW_ACCURACY_WITH_PROOF'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "bookings"
       SET "checkin_verification_source" =
         'GPS_WITH_PROOF'::"booking_checkin_verification_source"
       WHERE "checkin_verification_source" =
         'GPS_LOW_ACCURACY_WITH_PROOF'::"booking_checkin_verification_source"`,
    );
    await queryRunner.query(
      `ALTER TYPE "booking_checkin_verification_source"
       RENAME TO "booking_checkin_verification_source_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "booking_checkin_verification_source" AS ENUM (
        'GPS',
        'GPS_WITH_PROOF',
        'NO_GPS_WITH_PROOF',
        'TARGET_MISSING_WITH_PROOF',
        'ADMIN_OVERRIDE'
      )`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings"
       ALTER COLUMN "checkin_verification_source"
       TYPE "booking_checkin_verification_source"
       USING "checkin_verification_source"::text::"booking_checkin_verification_source"`,
    );
    await queryRunner.query(
      `DROP TYPE "booking_checkin_verification_source_old"`,
    );
  }
}
