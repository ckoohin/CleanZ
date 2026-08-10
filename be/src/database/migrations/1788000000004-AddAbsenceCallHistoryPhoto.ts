import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAbsenceCallHistoryPhoto1788000000004 implements MigrationInterface {
  name = 'AddAbsenceCallHistoryPhoto1788000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "booking_absence_reports"
      ADD COLUMN "call_history_photo_url" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "booking_absence_reports"
      DROP COLUMN "call_history_photo_url"
    `);
  }
}
