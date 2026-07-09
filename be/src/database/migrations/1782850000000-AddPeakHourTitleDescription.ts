import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPeakHourTitleDescription1782850000000 implements MigrationInterface {
  name = 'AddPeakHourTitleDescription1782850000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "service_peak_hours"
        ADD COLUMN IF NOT EXISTS "title"       VARCHAR(255) DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS "description" TEXT         DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "service_peak_hours"
        DROP COLUMN IF EXISTS "title",
        DROP COLUMN IF EXISTS "description"
    `);
  }
}
