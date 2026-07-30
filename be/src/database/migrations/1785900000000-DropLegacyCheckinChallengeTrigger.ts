import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 178570 removed the legacy check-in challenge tables, but an old
 * trigger on bookings remained in databases that had previously used that
 * flow. Any terminal status update then executed a function that referenced
 * the deleted tables and failed the whole booking transaction.
 *
 * Keep this as a separate repair migration because 178570 has already been
 * applied in existing environments.
 */
export class DropLegacyCheckinChallengeTrigger1785900000000 implements MigrationInterface {
  name = 'DropLegacyCheckinChallengeTrigger1785900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "trg_invalidate_checkin_challenge_on_booking_close"
       ON "bookings"`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS "invalidate_open_checkin_challenges_on_booking_close"()`,
    );
  }

  public async down(): Promise<void> {
    // Không khôi phục trigger: bốn bảng challenge legacy đã bị xóa có chủ đích.
  }
}
