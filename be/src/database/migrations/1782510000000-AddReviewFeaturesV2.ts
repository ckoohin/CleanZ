import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReviewFeaturesV2_1782510000000 implements MigrationInterface {
  name = 'AddReviewFeaturesV2_1782510000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // New columns on reviews
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "is_anonymous" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "images" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "tasker_reply" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "tasker_replied_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "report_count" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_reviews_package" ON "reviews" ("package_id")`,
    );

    // review_reports table
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "review_report_reason_enum" AS ENUM('SPAM','FAKE','INAPPROPRIATE','HARASSMENT','OTHER');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "review_report_status_enum" AS ENUM('PENDING','APPROVED','REJECTED');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "review_reports" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "review_id" uuid NOT NULL,
        "reported_by" uuid NOT NULL,
        "reason" "review_report_reason_enum" NOT NULL,
        "description" text,
        "status" "review_report_status_enum" NOT NULL DEFAULT 'PENDING',
        "reviewed_by" uuid,
        "reviewed_at" TIMESTAMP,
        "admin_note" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_review_reports" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_review_reports_review" ON "review_reports" ("review_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_review_reports_status" ON "review_reports" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_review_reports_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_review_reports_review"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "review_reports"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "review_report_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "review_report_reason_enum"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_reviews_package"`);
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP COLUMN IF EXISTS "report_count"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP COLUMN IF EXISTS "tasker_replied_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP COLUMN IF EXISTS "tasker_reply"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP COLUMN IF EXISTS "images"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP COLUMN IF EXISTS "is_anonymous"`,
    );
  }
}
