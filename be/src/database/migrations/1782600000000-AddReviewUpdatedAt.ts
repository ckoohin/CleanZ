import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReviewUpdatedAt1782600000000 implements MigrationInterface {
  name = 'AddReviewUpdatedAt1782600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN IF EXISTS "updated_at"`);
  }
}
