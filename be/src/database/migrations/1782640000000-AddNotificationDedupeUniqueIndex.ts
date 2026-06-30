import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationDedupeUniqueIndex1782640000000 implements MigrationInterface {
  name = 'AddNotificationDedupeUniqueIndex1782640000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      WITH ranked AS (
        SELECT
          "id",
          ROW_NUMBER() OVER (
            PARTITION BY "dedupe_key"
            ORDER BY "created_at" ASC, "id" ASC
          ) AS rn
        FROM "notifications"
        WHERE "dedupe_key" IS NOT NULL
      )
      UPDATE "notifications" n
      SET "dedupe_key" = NULL
      FROM ranked r
      WHERE n."id" = r."id"
        AND r.rn > 1
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM "notifications"
          WHERE "dedupe_key" IS NOT NULL
          GROUP BY "dedupe_key"
          HAVING COUNT(*) > 1
        ) THEN
          RAISE EXCEPTION 'Cannot create uq_notifications_dedupe_key because duplicate notification dedupe_key values exist';
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_notifications_dedupe_key"
        ON "notifications" ("dedupe_key")
        WHERE "dedupe_key" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."uq_notifications_dedupe_key"`,
    );
  }
}
