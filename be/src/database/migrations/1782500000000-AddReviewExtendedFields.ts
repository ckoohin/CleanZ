import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReviewExtendedFields1782500000000 implements MigrationInterface {
  name = 'AddReviewExtendedFields1782500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "package_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "is_hidden" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "admin_reply" text`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "idx_reviews_booking" ON "reviews" ("booking_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_reviews_booking"`);
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP COLUMN IF EXISTS "admin_reply"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP COLUMN IF EXISTS "is_hidden"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP COLUMN IF EXISTS "package_id"`,
    );
  }
}
