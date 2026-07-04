import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBlogIndexes1782830000000 implements MigrationInterface {
  name = 'AddBlogIndexes1782830000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_blogs_status" ON "blogs" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_blogs_published_at" ON "blogs" ("published_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_blogs_created_at" ON "blogs" ("created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_blogs_category" ON "blogs" ("category_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_blogs_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_blogs_published_at"`);
  }
}
