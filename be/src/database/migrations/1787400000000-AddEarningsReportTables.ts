import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Bảng kê thu nhập Tasker gửi định kỳ qua email.
 *
 * - `earnings_report_runs`: một lượt gửi (scheduler tự chạy hoặc admin bấm tay).
 *   Partial unique index `(period_type, period_start_key) WHERE trigger_source = 'SCHEDULER'`
 *   là cơ chế **claim** cho scheduler: nhiều instance cùng tick thì chỉ một INSERT
 *   thành công, số còn lại nhận lỗi unique và bỏ qua. Admin gửi tay không vướng
 *   index này nên gửi lại được tuỳ ý.
 * - `earnings_report_deliveries`: trạng thái từng Tasker trong lượt, kèm snapshot
 *   số tiền tại thời điểm gửi để đối chiếu về sau mà không phải tính lại.
 */
export class AddEarningsReportTables1787400000000 implements MigrationInterface {
  name = 'AddEarningsReportTables1787400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'earnings_report_period_type') THEN
          CREATE TYPE "earnings_report_period_type" AS ENUM ('WEEK', 'MONTH', 'YEAR');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'earnings_report_trigger_source') THEN
          CREATE TYPE "earnings_report_trigger_source" AS ENUM ('SCHEDULER', 'ADMIN');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'earnings_report_run_status') THEN
          CREATE TYPE "earnings_report_run_status" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'earnings_report_delivery_status') THEN
          CREATE TYPE "earnings_report_delivery_status" AS ENUM ('PENDING', 'SENT', 'FAILED');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "earnings_report_runs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "period_type" "earnings_report_period_type" NOT NULL,
        "period_start_key" character varying(10) NOT NULL,
        "period_start" timestamp NOT NULL,
        "period_end" timestamp NOT NULL,
        "trigger_source" "earnings_report_trigger_source" NOT NULL,
        "triggered_by_user_id" uuid,
        "status" "earnings_report_run_status" NOT NULL DEFAULT 'PENDING',
        "total_taskers" integer NOT NULL DEFAULT 0,
        "sent_count" integer NOT NULL DEFAULT 0,
        "failed_count" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_earnings_report_runs" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "earnings_report_runs"
      DROP CONSTRAINT IF EXISTS "FK_earnings_report_runs_triggered_by"
    `);
    await queryRunner.query(`
      ALTER TABLE "earnings_report_runs"
      ADD CONSTRAINT "FK_earnings_report_runs_triggered_by"
      FOREIGN KEY ("triggered_by_user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE
    `);

    // Cơ chế claim của scheduler — xem doc-comment đầu file.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_earnings_report_runs_scheduler_period"
        ON "earnings_report_runs" ("period_type", "period_start_key")
        WHERE "trigger_source" = 'SCHEDULER'
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_earnings_report_runs_trigger_source" ON "earnings_report_runs" ("trigger_source")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_earnings_report_runs_status" ON "earnings_report_runs" ("status")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "earnings_report_deliveries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "run_id" uuid NOT NULL,
        "tasker_id" uuid NOT NULL,
        "email" character varying(255) NOT NULL,
        "status" "earnings_report_delivery_status" NOT NULL DEFAULT 'PENDING',
        "sent_at" timestamp,
        "last_error" text,
        "gross_revenue" numeric(12,2) NOT NULL DEFAULT 0,
        "platform_fee" numeric(12,2) NOT NULL DEFAULT 0,
        "net_income" numeric(12,2) NOT NULL DEFAULT 0,
        "completed_bookings" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_earnings_report_deliveries" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "earnings_report_deliveries"
      DROP CONSTRAINT IF EXISTS "FK_earnings_report_deliveries_run"
    `);
    await queryRunner.query(`
      ALTER TABLE "earnings_report_deliveries"
      ADD CONSTRAINT "FK_earnings_report_deliveries_run"
      FOREIGN KEY ("run_id") REFERENCES "earnings_report_runs"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "earnings_report_deliveries"
      DROP CONSTRAINT IF EXISTS "FK_earnings_report_deliveries_tasker"
    `);
    await queryRunner.query(`
      ALTER TABLE "earnings_report_deliveries"
      ADD CONSTRAINT "FK_earnings_report_deliveries_tasker"
      FOREIGN KEY ("tasker_id") REFERENCES "taskers"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `);

    // Chốt idempotency lớp DB: một Tasker chỉ có đúng một delivery trong mỗi lượt.
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_earnings_report_deliveries_run_tasker" ON "earnings_report_deliveries" ("run_id", "tasker_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_earnings_report_deliveries_tasker_id" ON "earnings_report_deliveries" ("tasker_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_earnings_report_deliveries_status" ON "earnings_report_deliveries" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "earnings_report_deliveries" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "earnings_report_runs" CASCADE`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "earnings_report_delivery_status"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "earnings_report_run_status"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "earnings_report_trigger_source"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "earnings_report_period_type"`,
    );
  }
}
