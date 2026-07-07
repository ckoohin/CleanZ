import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaskerWarningPoints1782820000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE taskers
      ADD COLUMN IF NOT EXISTS warning_points INTEGER NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE taskers
      DROP COLUMN IF EXISTS warning_points
    `);
  }
}
