import { MigrationInterface, QueryRunner } from 'typeorm';

export class AutoMigration1782969489734 implements MigrationInterface {
  name = 'AutoMigration1782969489734';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "pricing_configs" DROP CONSTRAINT IF EXISTS "FK_664f4525629e6c2874ba6a36b15"`,
    );
    await queryRunner.query(
      `ALTER TABLE "blog_bookmarks" DROP CONSTRAINT IF EXISTS "FK_blog_bookmarks_blog"`,
    );
    await queryRunner.query(
      `ALTER TABLE "blog_bookmarks" DROP CONSTRAINT IF EXISTS "FK_blog_bookmarks_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "blog_comments" DROP CONSTRAINT IF EXISTS "FK_blog_comments_blog"`,
    );
    await queryRunner.query(
      `ALTER TABLE "blog_comments" DROP CONSTRAINT IF EXISTS "FK_blog_comments_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "blog_tag_relations" DROP CONSTRAINT IF EXISTS "FK_blog_tag_relations_blog"`,
    );
    await queryRunner.query(
      `ALTER TABLE "blog_tag_relations" DROP CONSTRAINT IF EXISTS "FK_blog_tag_relations_tag"`,
    );
    await queryRunner.query(
      `ALTER TABLE "blogs" DROP CONSTRAINT IF EXISTS "FK_blogs_author"`,
    );
    await queryRunner.query(
      `ALTER TABLE "blogs" DROP CONSTRAINT IF EXISTS "FK_blogs_category"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_taskers_location_online"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_blogs_category"`);
    await queryRunner.query(
      `ALTER TABLE "taskers" DROP COLUMN IF EXISTS "current_location"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_packages" ADD COLUMN IF NOT EXISTS "allow_single_service" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "pricing_configs" ALTER COLUMN "service_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "pricing_configs" DROP CONSTRAINT IF EXISTS "uq_pricing_service"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasker_deposit_transactions" DROP CONSTRAINT IF EXISTS "FK_tasker_deposit_transactions_tasker"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasker_deposit_transactions" ALTER COLUMN "tasker_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_blogs_slug" ON "blogs" ("slug") `,
    );
    await queryRunner.query(
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_c92c31706d11eb49f9b1d2e69c2'
            AND conrelid = 'tasker_withdrawal_requests'::regclass
        ) THEN
          ALTER TABLE "tasker_withdrawal_requests" ADD CONSTRAINT "FK_c92c31706d11eb49f9b1d2e69c2" FOREIGN KEY ("tasker_id") REFERENCES "taskers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_tasker_deposit_transactions_tasker'
            AND conrelid = 'tasker_deposit_transactions'::regclass
        ) THEN
          ALTER TABLE "tasker_deposit_transactions" ADD CONSTRAINT "FK_tasker_deposit_transactions_tasker" FOREIGN KEY ("tasker_id") REFERENCES "taskers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_688486d0822ef9f55ac92e7955e'
            AND conrelid = 'blog_bookmarks'::regclass
        ) THEN
          ALTER TABLE "blog_bookmarks" ADD CONSTRAINT "FK_688486d0822ef9f55ac92e7955e" FOREIGN KEY ("blog_id") REFERENCES "blogs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_8a0174b87f749f0e3e77709e7b7'
            AND conrelid = 'blog_bookmarks'::regclass
        ) THEN
          ALTER TABLE "blog_bookmarks" ADD CONSTRAINT "FK_8a0174b87f749f0e3e77709e7b7" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_044ee27753221b2b8860f8926c7'
            AND conrelid = 'blog_comments'::regclass
        ) THEN
          ALTER TABLE "blog_comments" ADD CONSTRAINT "FK_044ee27753221b2b8860f8926c7" FOREIGN KEY ("blog_id") REFERENCES "blogs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_c34a2a0bf1dcc3687871de1ff1e'
            AND conrelid = 'blog_comments'::regclass
        ) THEN
          ALTER TABLE "blog_comments" ADD CONSTRAINT "FK_c34a2a0bf1dcc3687871de1ff1e" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_a76f9dd3f00bf649a91c58dd439'
            AND conrelid = 'blog_tag_relations'::regclass
        ) THEN
          ALTER TABLE "blog_tag_relations" ADD CONSTRAINT "FK_a76f9dd3f00bf649a91c58dd439" FOREIGN KEY ("blog_id") REFERENCES "blogs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_3d2389394e7061828e97908eb56'
            AND conrelid = 'blog_tag_relations'::regclass
        ) THEN
          ALTER TABLE "blog_tag_relations" ADD CONSTRAINT "FK_3d2389394e7061828e97908eb56" FOREIGN KEY ("tag_id") REFERENCES "blog_tags"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_1f073a9f9720fe731423f1064cc'
            AND conrelid = 'blogs'::regclass
        ) THEN
          ALTER TABLE "blogs" ADD CONSTRAINT "FK_1f073a9f9720fe731423f1064cc" FOREIGN KEY ("category_id") REFERENCES "blog_categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_b324119dcb71e877cee411f7929'
            AND conrelid = 'blogs'::regclass
        ) THEN
          ALTER TABLE "blogs" ADD CONSTRAINT "FK_b324119dcb71e877cee411f7929" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$;`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "blogs" DROP CONSTRAINT "FK_b324119dcb71e877cee411f7929"`,
    );
    await queryRunner.query(
      `ALTER TABLE "blogs" DROP CONSTRAINT "FK_1f073a9f9720fe731423f1064cc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "blog_tag_relations" DROP CONSTRAINT "FK_3d2389394e7061828e97908eb56"`,
    );
    await queryRunner.query(
      `ALTER TABLE "blog_tag_relations" DROP CONSTRAINT "FK_a76f9dd3f00bf649a91c58dd439"`,
    );
    await queryRunner.query(
      `ALTER TABLE "blog_comments" DROP CONSTRAINT "FK_c34a2a0bf1dcc3687871de1ff1e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "blog_comments" DROP CONSTRAINT "FK_044ee27753221b2b8860f8926c7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "blog_bookmarks" DROP CONSTRAINT "FK_8a0174b87f749f0e3e77709e7b7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "blog_bookmarks" DROP CONSTRAINT "FK_688486d0822ef9f55ac92e7955e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasker_deposit_transactions" DROP CONSTRAINT "FK_tasker_deposit_transactions_tasker"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasker_withdrawal_requests" DROP CONSTRAINT "FK_c92c31706d11eb49f9b1d2e69c2"`,
    );
    await queryRunner.query(`DROP INDEX "public"."uq_blogs_slug"`);
    await queryRunner.query(
      `ALTER TABLE "tasker_deposit_transactions" ALTER COLUMN "tasker_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasker_deposit_transactions" ADD CONSTRAINT "FK_tasker_deposit_transactions_tasker" FOREIGN KEY ("tasker_id") REFERENCES "taskers"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "pricing_configs" ADD CONSTRAINT "uq_pricing_service" UNIQUE ("service_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "pricing_configs" ALTER COLUMN "service_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_packages" DROP COLUMN "allow_single_service"`,
    );
    await queryRunner.query(
      `ALTER TABLE "taskers" ADD "current_location" geography(Point,4326)`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_blogs_category" ON "blogs" ("category_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_taskers_location_online" ON "taskers" USING GiST ("current_location") WHERE ((presence_status = 'ONLINE'::tasker_presence_status) AND (status = 'ACTIVE'::tasker_status))`,
    );
    await queryRunner.query(
      `ALTER TABLE "blogs" ADD CONSTRAINT "FK_blogs_category" FOREIGN KEY ("category_id") REFERENCES "blog_categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "blogs" ADD CONSTRAINT "FK_blogs_author" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "blog_tag_relations" ADD CONSTRAINT "FK_blog_tag_relations_tag" FOREIGN KEY ("tag_id") REFERENCES "blog_tags"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "blog_tag_relations" ADD CONSTRAINT "FK_blog_tag_relations_blog" FOREIGN KEY ("blog_id") REFERENCES "blogs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "blog_comments" ADD CONSTRAINT "FK_blog_comments_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "blog_comments" ADD CONSTRAINT "FK_blog_comments_blog" FOREIGN KEY ("blog_id") REFERENCES "blogs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "blog_bookmarks" ADD CONSTRAINT "FK_blog_bookmarks_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "blog_bookmarks" ADD CONSTRAINT "FK_blog_bookmarks_blog" FOREIGN KEY ("blog_id") REFERENCES "blogs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "pricing_configs" ADD CONSTRAINT "FK_664f4525629e6c2874ba6a36b15" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
