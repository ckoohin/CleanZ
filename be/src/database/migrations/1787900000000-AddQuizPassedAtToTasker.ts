import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQuizPassedAtToTasker1787900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE taskers ADD COLUMN quiz_passed_at TIMESTAMP
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE taskers DROP COLUMN IF EXISTS quiz_passed_at
    `);
  }
}
