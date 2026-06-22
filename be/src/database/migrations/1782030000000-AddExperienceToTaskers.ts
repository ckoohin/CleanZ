import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Bổ sung cột `taskers.experience` (TaskerEntity.experience — text, nullable) còn thiếu
 * trong DB (drift). Additive + idempotent.
 */
export class AddExperienceToTaskers1782030000000 implements MigrationInterface {
  name = 'AddExperienceToTaskers1782030000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "taskers" ADD COLUMN IF NOT EXISTS "experience" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "taskers" DROP COLUMN IF EXISTS "experience"`,
    );
  }
}
