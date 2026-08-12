import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Đồng bộ schema sự cố giữa hai nhánh đã từng được triển khai:
 *
 * - nhánh cũ dùng các cột `tasker_*`;
 * - nhánh tổng quát hoá dùng `respondent_*` để hỗ trợ cả Tasker và Customer.
 *
 * Migration chỉ rename/backfill hoặc thêm cột. Không xoá dữ liệu/cột cũ khi gặp một
 * database đã tồn tại đồng thời cả hai biến thể, nhờ đó rollout theo thứ tự nào cũng an
 * toàn. Các giá trị enum mới được dùng ở migration kế tiếp để PostgreSQL có một lần
 * COMMIT riêng trước khi tham chiếu chúng trong UPDATE/index.
 */
export class AlignIncidentRespondentSchema1788300000000 implements MigrationInterface {
  name = 'AlignIncidentRespondentSchema1788300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "incident_type"
        ADD VALUE IF NOT EXISTS 'CUSTOMER_UNREACHABLE'
    `);
    await queryRunner.query(`
      ALTER TYPE "incident_source"
        ADD VALUE IF NOT EXISTS 'TASKER_REPORT'
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'incident_respondent_party'
        ) THEN
          CREATE TYPE "incident_respondent_party" AS ENUM ('TASKER', 'CUSTOMER');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'incidents'
             AND column_name = 'tasker_response_deadline'
        ) THEN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public'
               AND table_name = 'incidents'
               AND column_name = 'respondent_response_deadline'
          ) THEN
            ALTER TABLE "incidents"
              RENAME COLUMN "tasker_response_deadline"
              TO "respondent_response_deadline";
          ELSE
            UPDATE "incidents"
               SET "respondent_response_deadline" =
                 COALESCE("respondent_response_deadline", "tasker_response_deadline");
          END IF;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'incidents'
             AND column_name = 'sent_tasker_borne_amount'
        ) THEN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public'
               AND table_name = 'incidents'
               AND column_name = 'sent_respondent_borne_amount'
          ) THEN
            ALTER TABLE "incidents"
              RENAME COLUMN "sent_tasker_borne_amount"
              TO "sent_respondent_borne_amount";
          ELSE
            UPDATE "incidents"
               SET "sent_respondent_borne_amount" =
                 COALESCE("sent_respondent_borne_amount", "sent_tasker_borne_amount");
          END IF;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "incidents"
        ADD COLUMN IF NOT EXISTS "respondent_response_deadline" timestamp,
        ADD COLUMN IF NOT EXISTS "sent_respondent_borne_amount" numeric(12,2),
        ADD COLUMN IF NOT EXISTS "respondent_party"
          "incident_respondent_party" NOT NULL DEFAULT 'TASKER',
        ADD COLUMN IF NOT EXISTS "wait_started_at" timestamp,
        ADD COLUMN IF NOT EXISTS "final_submission_eligible_at" timestamp,
        ADD COLUMN IF NOT EXISTS "final_report_submitted_at" timestamp,
        ADD COLUMN IF NOT EXISTS "customer_responded_at" timestamp,
        ADD COLUMN IF NOT EXISTS "verification_snapshot" jsonb,
        ADD COLUMN IF NOT EXISTS "no_show_policy_snapshot" jsonb,
        ADD COLUMN IF NOT EXISTS "travel_distance_meters" numeric(12,1),
        ADD COLUMN IF NOT EXISTS "distance_method" varchar(32),
        ADD COLUMN IF NOT EXISTS "customer_borne_amount" numeric(12,2),
        ADD COLUMN IF NOT EXISTS "platform_advance_amount" numeric(12,2),
        ADD COLUMN IF NOT EXISTS "tasker_compensated_at" timestamp,
        ADD COLUMN IF NOT EXISTS "customer_appealed_at" timestamp,
        ADD COLUMN IF NOT EXISTS "customer_appeal_resolved_at" timestamp,
        ADD COLUMN IF NOT EXISTS "customer_appeal_resolution" varchar(16),
        ADD COLUMN IF NOT EXISTS "customer_appeal_resolution_note" text
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('public.idx_incidents_tasker_response_deadline') IS NOT NULL
           AND to_regclass('public.idx_incidents_respondent_response_deadline') IS NULL
           AND NOT EXISTS (
             SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public'
                AND table_name = 'incidents'
                AND column_name = 'tasker_response_deadline'
           ) THEN
          ALTER INDEX "idx_incidents_tasker_response_deadline"
            RENAME TO "idx_incidents_respondent_response_deadline";
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_incidents_respondent_response_deadline"
        ON "incidents" ("respondent_response_deadline")
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'incident_decision_responses'
             AND column_name = 'tasker_id'
        ) THEN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public'
               AND table_name = 'incident_decision_responses'
               AND column_name = 'respondent_user_id'
          ) THEN
            ALTER TABLE "incident_decision_responses"
              RENAME COLUMN "tasker_id" TO "respondent_user_id";
          ELSE
            UPDATE "incident_decision_responses"
               SET "respondent_user_id" = COALESCE("respondent_user_id", "tasker_id");
            ALTER TABLE "incident_decision_responses"
              ALTER COLUMN "tasker_id" DROP NOT NULL;
          END IF;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "incident_decision_responses"
        ADD COLUMN IF NOT EXISTS "respondent_user_id" uuid,
        ADD COLUMN IF NOT EXISTS "respondent_party"
          "incident_respondent_party" NOT NULL DEFAULT 'TASKER'
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM "incident_decision_responses"
           WHERE "respondent_user_id" IS NULL
        ) THEN
          RAISE EXCEPTION
            'Cannot generalize incident responses: respondent_user_id contains NULL';
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      ALTER TABLE "incident_decision_responses"
        ALTER COLUMN "respondent_user_id" SET NOT NULL
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
            FROM pg_constraint c
            JOIN pg_attribute a
              ON a.attrelid = c.conrelid
             AND a.attnum = ANY(c.conkey)
           WHERE c.conrelid = 'public.incident_decision_responses'::regclass
             AND c.contype = 'f'
             AND a.attname = 'respondent_user_id'
        ) THEN
          ALTER TABLE "incident_decision_responses"
            ADD CONSTRAINT "fk_idr_respondent"
            FOREIGN KEY ("respondent_user_id") REFERENCES "users"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
            FROM "incident_decision_responses"
           GROUP BY "incident_id", "decision_version"
          HAVING COUNT(*) > 1
        ) THEN
          RAISE EXCEPTION
            'Cannot generalize incident responses: duplicate incident/version rows';
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      ALTER TABLE "incident_decision_responses"
        DROP CONSTRAINT IF EXISTS "uq_idr_incident_version_tasker"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "uq_idr_incident_version_tasker"
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_idr_incident_version"
        ON "incident_decision_responses" ("incident_id", "decision_version")
    `);
  }

  /**
   * Rollback tạo lại các alias cũ và backfill dữ liệu, nhưng cố ý giữ schema mới. Xoá
   * các cột respondent sẽ làm mất dữ liệu Customer và khiến rollback trở thành thao tác
   * phá huỷ. Sau down, binary cũ vẫn đọc/ghi được các cột tasker_*.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "incidents"
        ADD COLUMN IF NOT EXISTS "tasker_response_deadline" timestamp,
        ADD COLUMN IF NOT EXISTS "sent_tasker_borne_amount" numeric(12,2)
    `);
    await queryRunner.query(`
      UPDATE "incidents"
         SET "tasker_response_deadline" = "respondent_response_deadline",
             "sent_tasker_borne_amount" = "sent_respondent_borne_amount"
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_incidents_tasker_response_deadline"
        ON "incidents" ("tasker_response_deadline")
    `);

    await queryRunner.query(`
      ALTER TABLE "incident_decision_responses"
        ADD COLUMN IF NOT EXISTS "tasker_id" uuid
    `);
    await queryRunner.query(`
      UPDATE "incident_decision_responses"
         SET "tasker_id" = "respondent_user_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "incident_decision_responses"
        ALTER COLUMN "respondent_user_id" DROP NOT NULL,
        ALTER COLUMN "tasker_id" SET NOT NULL
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
            FROM pg_constraint c
            JOIN pg_attribute a
              ON a.attrelid = c.conrelid
             AND a.attnum = ANY(c.conkey)
           WHERE c.conrelid = 'public.incident_decision_responses'::regclass
             AND c.contype = 'f'
             AND a.attname = 'tasker_id'
        ) THEN
          ALTER TABLE "incident_decision_responses"
            ADD CONSTRAINT "fk_idr_tasker_legacy"
            FOREIGN KEY ("tasker_id") REFERENCES "users"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_idr_incident_version_tasker"
        ON "incident_decision_responses"
          ("incident_id", "decision_version", "tasker_id")
    `);
  }
}
