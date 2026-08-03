import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tách sổ nợ Tasker ra khỏi bảng `incidents`.
 *
 * Nợ vốn sống ký sinh trên hồ sơ sự cố, khiến vòng đời sự cố và vòng đời nợ đánh nhau
 * (auto-close phải bị chặn), mọi truy vấn nợ phải đi vòng qua trạng thái sự cố, và module
 * `wallet` phải import ngược vào `incident` chỉ để mượn công thức tính nợ.
 *
 * PHÂN VAI sau khi tách:
 *  • `incidents.uncovered_liability_amount` — GIỮ. Đây là ảnh chụp tại thời điểm chi trả,
 *    thuộc hồ sơ quyết định và cần cho đối soát (`recoverable + uncovered = taskerBorne`).
 *  • `tasker_debts` — dữ liệu SỐNG: đã thu bao nhiêu, xoá bao nhiêu, còn nợ bao nhiêu.
 */
export class ExtractTaskerDebtLedger1786900000000 implements MigrationInterface {
  name = 'ExtractTaskerDebtLedger1786900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tasker_debt_source') THEN
          CREATE TYPE "tasker_debt_source" AS ENUM ('INCIDENT_COMPENSATION');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tasker_debt_status') THEN
          CREATE TYPE "tasker_debt_status" AS ENUM
            ('OUTSTANDING', 'RECOVERED', 'WRITTEN_OFF');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tasker_debts" (
        "id"                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tasker_id"           uuid NOT NULL
                              REFERENCES "taskers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "source"              "tasker_debt_source" NOT NULL,
        "source_ref_id"       uuid NOT NULL,
        "source_code"         varchar(40),
        "original_amount"     numeric(12,2) NOT NULL,
        "recovered_amount"    numeric(12,2) NOT NULL DEFAULT 0,
        "written_off_amount"  numeric(12,2) NOT NULL DEFAULT 0,
        "status"              "tasker_debt_status" NOT NULL DEFAULT 'OUTSTANDING',
        "written_off_at"      timestamp,
        "write_off_reason"    text,
        "written_off_by_admin_id" uuid
                              REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "created_at"          timestamp NOT NULL DEFAULT now(),
        "updated_at"          timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "uq_tasker_debt_source" UNIQUE ("source", "source_ref_id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_tasker_debt_outstanding"
        ON "tasker_debts" ("tasker_id", "status")
    `);

    // Chuyển dữ liệu nợ đang có sang sổ mới.
    await queryRunner.query(`
      INSERT INTO "tasker_debts" (
        "tasker_id", "source", "source_ref_id", "source_code",
        "original_amount", "recovered_amount", "written_off_amount", "status",
        "written_off_at", "write_off_reason", "written_off_by_admin_id", "created_at"
      )
      SELECT i."tasker_id",
             'INCIDENT_COMPENSATION'::"tasker_debt_source",
             i."id",
             i."incident_code",
             COALESCE(i."uncovered_liability_amount", 0),
             COALESCE(i."uncovered_recovered_amount", 0),
             COALESCE(i."uncovered_written_off_amount", 0),
             CASE
               WHEN COALESCE(i."uncovered_written_off_amount", 0) > 0
                 AND COALESCE(i."uncovered_liability_amount", 0)
                   <= COALESCE(i."uncovered_recovered_amount", 0)
                    + COALESCE(i."uncovered_written_off_amount", 0)
                 THEN 'WRITTEN_OFF'::"tasker_debt_status"
               WHEN COALESCE(i."uncovered_liability_amount", 0)
                  <= COALESCE(i."uncovered_recovered_amount", 0)
                   + COALESCE(i."uncovered_written_off_amount", 0)
                 THEN 'RECOVERED'::"tasker_debt_status"
               ELSE 'OUTSTANDING'::"tasker_debt_status"
             END,
             i."debt_written_off_at",
             i."debt_write_off_reason",
             i."debt_written_off_by_admin_id",
             COALESCE(i."resolved_at", i."created_at")
        FROM "incidents" i
       WHERE i."tasker_id" IS NOT NULL
         AND COALESCE(i."uncovered_liability_amount", 0) > 0
      ON CONFLICT ("source", "source_ref_id") DO NOTHING
    `);

    // Bỏ phần dữ liệu SỐNG khỏi bảng sự cố; giữ lại ảnh chụp `uncovered_liability_amount`.
    await queryRunner.query(`
      ALTER TABLE "incidents"
        DROP COLUMN IF EXISTS "uncovered_recovered_amount",
        DROP COLUMN IF EXISTS "uncovered_written_off_amount",
        DROP COLUMN IF EXISTS "debt_written_off_at",
        DROP COLUMN IF EXISTS "debt_write_off_reason",
        DROP COLUMN IF EXISTS "debt_written_off_by_admin_id"
    `);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_inc_tasker_outstanding_debt"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "incidents"
        ADD COLUMN IF NOT EXISTS "uncovered_recovered_amount" numeric(12,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "uncovered_written_off_amount" numeric(12,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "debt_written_off_at" timestamp,
        ADD COLUMN IF NOT EXISTS "debt_write_off_reason" text,
        ADD COLUMN IF NOT EXISTS "debt_written_off_by_admin_id" uuid
    `);
    await queryRunner.query(`
      UPDATE "incidents" i
         SET "uncovered_recovered_amount" = d."recovered_amount",
             "uncovered_written_off_amount" = d."written_off_amount",
             "debt_written_off_at" = d."written_off_at",
             "debt_write_off_reason" = d."write_off_reason",
             "debt_written_off_by_admin_id" = d."written_off_by_admin_id"
        FROM "tasker_debts" d
       WHERE d."source" = 'INCIDENT_COMPENSATION' AND d."source_ref_id" = i."id"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "tasker_debts"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tasker_debt_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tasker_debt_source"`);
  }
}
