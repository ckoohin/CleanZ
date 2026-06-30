import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBlogTables1782460000000 implements MigrationInterface {
  name = 'CreateBlogTables1782460000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(
      `CREATE TYPE "public"."blog_status" AS ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "blog_categories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(150) NOT NULL,
        "slug" character varying(180) NOT NULL,
        "description" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_blog_categories_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_blog_categories" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE TABLE "blog_tags" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(80) NOT NULL,
        "slug" character varying(100) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_blog_tags_name" UNIQUE ("name"),
        CONSTRAINT "UQ_blog_tags_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_blog_tags" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE TABLE "blogs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying(255) NOT NULL,
        "slug" character varying(280) NOT NULL,
        "summary" text,
        "content" text NOT NULL,
        "thumbnail_url" character varying(500),
        "category_id" uuid,
        "author_id" uuid,
        "status" "public"."blog_status" NOT NULL DEFAULT 'DRAFT',
        "view_count" integer NOT NULL DEFAULT 0,
        "published_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_blogs_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_blogs" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE TABLE "blog_tag_relations" (
        "blog_id" uuid NOT NULL,
        "tag_id" uuid NOT NULL,
        CONSTRAINT "PK_blog_tag_relations" PRIMARY KEY ("blog_id", "tag_id")
      )`,
    );
    await queryRunner.query(
      `CREATE TABLE "blog_comments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "blog_id" uuid NOT NULL,
        "user_id" uuid,
        "content" text NOT NULL,
        "is_visible" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_blog_comments" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE TABLE "blog_bookmarks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "blog_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "uq_blog_bookmarks_user_blog" UNIQUE ("user_id", "blog_id"),
        CONSTRAINT "PK_blog_bookmarks" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_blogs_status" ON "blogs" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_blogs_category" ON "blogs" ("category_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "blogs" ADD CONSTRAINT "FK_blogs_category" FOREIGN KEY ("category_id") REFERENCES "blog_categories"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "blogs" ADD CONSTRAINT "FK_blogs_author" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "blog_tag_relations" ADD CONSTRAINT "FK_blog_tag_relations_blog" FOREIGN KEY ("blog_id") REFERENCES "blogs"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "blog_tag_relations" ADD CONSTRAINT "FK_blog_tag_relations_tag" FOREIGN KEY ("tag_id") REFERENCES "blog_tags"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "blog_comments" ADD CONSTRAINT "FK_blog_comments_blog" FOREIGN KEY ("blog_id") REFERENCES "blogs"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "blog_comments" ADD CONSTRAINT "FK_blog_comments_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "blog_bookmarks" ADD CONSTRAINT "FK_blog_bookmarks_blog" FOREIGN KEY ("blog_id") REFERENCES "blogs"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "blog_bookmarks" ADD CONSTRAINT "FK_blog_bookmarks_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "blog_bookmarks" DROP CONSTRAINT "FK_blog_bookmarks_user"`);
    await queryRunner.query(`ALTER TABLE "blog_bookmarks" DROP CONSTRAINT "FK_blog_bookmarks_blog"`);
    await queryRunner.query(`ALTER TABLE "blog_comments" DROP CONSTRAINT "FK_blog_comments_user"`);
    await queryRunner.query(`ALTER TABLE "blog_comments" DROP CONSTRAINT "FK_blog_comments_blog"`);
    await queryRunner.query(`ALTER TABLE "blog_tag_relations" DROP CONSTRAINT "FK_blog_tag_relations_tag"`);
    await queryRunner.query(`ALTER TABLE "blog_tag_relations" DROP CONSTRAINT "FK_blog_tag_relations_blog"`);
    await queryRunner.query(`ALTER TABLE "blogs" DROP CONSTRAINT "FK_blogs_author"`);
    await queryRunner.query(`ALTER TABLE "blogs" DROP CONSTRAINT "FK_blogs_category"`);
    await queryRunner.query(`DROP INDEX "public"."idx_blogs_category"`);
    await queryRunner.query(`DROP INDEX "public"."idx_blogs_status"`);
    await queryRunner.query(`DROP TABLE "blog_bookmarks"`);
    await queryRunner.query(`DROP TABLE "blog_comments"`);
    await queryRunner.query(`DROP TABLE "blog_tag_relations"`);
    await queryRunner.query(`DROP TABLE "blogs"`);
    await queryRunner.query(`DROP TABLE "blog_tags"`);
    await queryRunner.query(`DROP TABLE "blog_categories"`);
    await queryRunner.query(`DROP TYPE "public"."blog_status"`);
  }
}
