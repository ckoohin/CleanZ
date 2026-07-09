import { MigrationInterface, QueryRunner } from 'typeorm';

export class RepairBlogTables1782840000000 implements MigrationInterface {
  name = 'RepairBlogTables1782840000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'blog_status' AND n.nspname = 'public'
        ) THEN
          CREATE TYPE "public"."blog_status" AS ENUM (
            'DRAFT',
            'PUBLISHED',
            'ARCHIVED'
          );
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "blog_categories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(150) NOT NULL,
        "slug" character varying(180) NOT NULL,
        "description" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_blog_categories" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "blog_categories"
        ADD COLUMN IF NOT EXISTS "name" character varying(150) NOT NULL,
        ADD COLUMN IF NOT EXISTS "slug" character varying(180) NOT NULL,
        ADD COLUMN IF NOT EXISTS "description" text,
        ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP NOT NULL DEFAULT now()
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "blog_tags" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(80) NOT NULL,
        "slug" character varying(100) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_blog_tags" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "blog_tags"
        ADD COLUMN IF NOT EXISTS "name" character varying(80) NOT NULL,
        ADD COLUMN IF NOT EXISTS "slug" character varying(100) NOT NULL,
        ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP NOT NULL DEFAULT now()
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "blogs" (
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
        CONSTRAINT "PK_blogs" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "blogs"
        ADD COLUMN IF NOT EXISTS "title" character varying(255) NOT NULL,
        ADD COLUMN IF NOT EXISTS "slug" character varying(280) NOT NULL,
        ADD COLUMN IF NOT EXISTS "summary" text,
        ADD COLUMN IF NOT EXISTS "content" text NOT NULL,
        ADD COLUMN IF NOT EXISTS "thumbnail_url" character varying(500),
        ADD COLUMN IF NOT EXISTS "category_id" uuid,
        ADD COLUMN IF NOT EXISTS "author_id" uuid,
        ADD COLUMN IF NOT EXISTS "status" "public"."blog_status" NOT NULL DEFAULT 'DRAFT',
        ADD COLUMN IF NOT EXISTS "view_count" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "published_at" TIMESTAMP,
        ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP NOT NULL DEFAULT now()
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "blog_tag_relations" (
        "blog_id" uuid NOT NULL,
        "tag_id" uuid NOT NULL,
        CONSTRAINT "PK_blog_tag_relations" PRIMARY KEY ("blog_id", "tag_id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "blog_tag_relations"
        ADD COLUMN IF NOT EXISTS "blog_id" uuid NOT NULL,
        ADD COLUMN IF NOT EXISTS "tag_id" uuid NOT NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "blog_comments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "blog_id" uuid NOT NULL,
        "user_id" uuid,
        "content" text NOT NULL,
        "is_visible" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_blog_comments" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "blog_comments"
        ADD COLUMN IF NOT EXISTS "blog_id" uuid NOT NULL,
        ADD COLUMN IF NOT EXISTS "user_id" uuid,
        ADD COLUMN IF NOT EXISTS "content" text NOT NULL,
        ADD COLUMN IF NOT EXISTS "is_visible" boolean NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP NOT NULL DEFAULT now()
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "blog_bookmarks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "blog_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_blog_bookmarks" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "blog_bookmarks"
        ADD COLUMN IF NOT EXISTS "blog_id" uuid NOT NULL,
        ADD COLUMN IF NOT EXISTS "user_id" uuid NOT NULL,
        ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP NOT NULL DEFAULT now()
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_blog_categories_slug" ON "blog_categories" ("slug")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_blog_tags_name" ON "blog_tags" ("name")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_blog_tags_slug" ON "blog_tags" ("slug")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_blogs_slug" ON "blogs" ("slug")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_blogs_status" ON "blogs" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_blogs_category" ON "blogs" ("category_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_blog_bookmarks_user_blog" ON "blog_bookmarks" ("user_id", "blog_id")`,
    );

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_blogs_category') THEN
          ALTER TABLE "blogs"
            ADD CONSTRAINT "FK_blogs_category"
            FOREIGN KEY ("category_id") REFERENCES "blog_categories"("id")
            ON DELETE SET NULL;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_blogs_author') THEN
          ALTER TABLE "blogs"
            ADD CONSTRAINT "FK_blogs_author"
            FOREIGN KEY ("author_id") REFERENCES "users"("id")
            ON DELETE SET NULL;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_blog_tag_relations_blog') THEN
          ALTER TABLE "blog_tag_relations"
            ADD CONSTRAINT "FK_blog_tag_relations_blog"
            FOREIGN KEY ("blog_id") REFERENCES "blogs"("id")
            ON DELETE CASCADE;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_blog_tag_relations_tag') THEN
          ALTER TABLE "blog_tag_relations"
            ADD CONSTRAINT "FK_blog_tag_relations_tag"
            FOREIGN KEY ("tag_id") REFERENCES "blog_tags"("id")
            ON DELETE CASCADE;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_blog_comments_blog') THEN
          ALTER TABLE "blog_comments"
            ADD CONSTRAINT "FK_blog_comments_blog"
            FOREIGN KEY ("blog_id") REFERENCES "blogs"("id")
            ON DELETE CASCADE;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_blog_comments_user') THEN
          ALTER TABLE "blog_comments"
            ADD CONSTRAINT "FK_blog_comments_user"
            FOREIGN KEY ("user_id") REFERENCES "users"("id")
            ON DELETE SET NULL;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_blog_bookmarks_blog') THEN
          ALTER TABLE "blog_bookmarks"
            ADD CONSTRAINT "FK_blog_bookmarks_blog"
            FOREIGN KEY ("blog_id") REFERENCES "blogs"("id")
            ON DELETE CASCADE;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_blog_bookmarks_user') THEN
          ALTER TABLE "blog_bookmarks"
            ADD CONSTRAINT "FK_blog_bookmarks_user"
            FOREIGN KEY ("user_id") REFERENCES "users"("id")
            ON DELETE CASCADE;
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "blog_bookmarks" DROP CONSTRAINT IF EXISTS "FK_blog_bookmarks_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "blog_bookmarks" DROP CONSTRAINT IF EXISTS "FK_blog_bookmarks_blog"`,
    );
    await queryRunner.query(
      `ALTER TABLE "blog_comments" DROP CONSTRAINT IF EXISTS "FK_blog_comments_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "blog_comments" DROP CONSTRAINT IF EXISTS "FK_blog_comments_blog"`,
    );
    await queryRunner.query(
      `ALTER TABLE "blog_tag_relations" DROP CONSTRAINT IF EXISTS "FK_blog_tag_relations_tag"`,
    );
    await queryRunner.query(
      `ALTER TABLE "blog_tag_relations" DROP CONSTRAINT IF EXISTS "FK_blog_tag_relations_blog"`,
    );
    await queryRunner.query(
      `ALTER TABLE "blogs" DROP CONSTRAINT IF EXISTS "FK_blogs_author"`,
    );
    await queryRunner.query(
      `ALTER TABLE "blogs" DROP CONSTRAINT IF EXISTS "FK_blogs_category"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "blog_bookmarks"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "blog_comments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "blog_tag_relations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "blogs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "blog_tags"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "blog_categories"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."blog_status"`);
  }
}
