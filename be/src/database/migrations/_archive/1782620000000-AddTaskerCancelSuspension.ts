import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaskerCancelSuspension1782620000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE taskers
        ADD COLUMN IF NOT EXISTS cancel_suspended_until TIMESTAMP NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE taskers
        DROP COLUMN IF EXISTS cancel_suspended_until
    `);
  }
}
