import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 4 — hardening tasker:
 * - enum `ban_type` + bảng `tasker_penalties` (lịch sử kỷ luật, ghi mỗi lần ban).
 * - `taskers.ban_ends_at` (hạn mở khóa với ban có thời hạn — auto-unban).
 * - unique index từng phần trên `taskers.doc_id_number` (1 CCCD/1 tasker).
 * Additive + idempotent.
 */
export class AddTaskerPenaltiesAndBanWindow1782430000000 implements MigrationInterface {
  name = 'AddTaskerPenaltiesAndBanWindow1782430000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DO $$ BEGIN
      CREATE TYPE "ban_type" AS ENUM ('TEMPORARY', 'PERMANENT');
    EXCEPTION WHEN duplicate_object THEN null; END $$;`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tasker_penalties" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tasker_id" uuid NOT NULL,
        "type" "ban_type" NOT NULL,
        "reason" text NOT NULL,
        "ban_ends_at" timestamp NULL,
        "created_by" uuid NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "pk_tasker_penalties" PRIMARY KEY ("id"),
        CONSTRAINT "fk_tasker_penalties_tasker" FOREIGN KEY ("tasker_id")
          REFERENCES "taskers"("id") ON DELETE CASCADE
      )`);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_tasker_penalties_tasker" ON "tasker_penalties" ("tasker_id")`,
    );

    await queryRunner.query(
      `ALTER TABLE "taskers" ADD COLUMN IF NOT EXISTS "ban_ends_at" timestamp NULL`,
    );

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM "taskers"
          WHERE "doc_id_number" IS NOT NULL
          GROUP BY "doc_id_number"
          HAVING COUNT(*) > 1
        ) THEN
          CREATE UNIQUE INDEX IF NOT EXISTS "uq_taskers_doc_id_number"
            ON "taskers" ("doc_id_number")
            WHERE "doc_id_number" IS NOT NULL;
        ELSE
          RAISE NOTICE 'Skip uq_taskers_doc_id_number because duplicate doc_id_number values exist.';
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_taskers_doc_id_number"`);
    await queryRunner.query(
      `ALTER TABLE "taskers" DROP COLUMN IF EXISTS "ban_ends_at"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "tasker_penalties"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "ban_type"`);
  }
}
