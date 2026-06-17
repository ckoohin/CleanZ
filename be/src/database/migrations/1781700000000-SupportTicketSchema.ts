import { MigrationInterface, QueryRunner } from 'typeorm';

// Slice 1 — mở rộng stub support_tickets thành mô hình To-Be + 5 bảng con + enum mới.
// Idempotent (guarded). Bảng support_tickets đang rỗng → an toàn đổi enum status.
export class SupportTicketSchema1781700000000 implements MigrationInterface {
  name = 'SupportTicketSchema1781700000000';

  public async up(q: QueryRunner): Promise<void> {
    // 1) Đổi enum support_ticket_status: OPEN/IN_PROGRESS/CLOSED → 5 nhãn (table rỗng)
    await q.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid
          WHERE t.typname='support_ticket_status' AND e.enumlabel='NEW'
        ) THEN
          ALTER TABLE "support_tickets" ALTER COLUMN "status" DROP DEFAULT;
          CREATE TYPE "support_ticket_status_new" AS ENUM
            ('NEW','IN_PROGRESS','PENDING','RESOLVED','CLOSED');
          ALTER TABLE "support_tickets"
            ALTER COLUMN "status" TYPE "support_ticket_status_new"
            USING (CASE "status"::text WHEN 'OPEN' THEN 'NEW'
                                       ELSE "status"::text END)::"support_ticket_status_new";
          DROP TYPE "support_ticket_status";
          ALTER TYPE "support_ticket_status_new" RENAME TO "support_ticket_status";
          ALTER TABLE "support_tickets" ALTER COLUMN "status" SET DEFAULT 'NEW';
        END IF;
      END $$;
    `);

    // 2) Enum mới (guarded)
    await q.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='ticket_category') THEN
          CREATE TYPE "ticket_category" AS ENUM
           ('SERVICE_QUALITY','TASKER_BEHAVIOR','SCHEDULING','PROPERTY_DAMAGE','PAYMENT_BILLING','ACCOUNT_TECHNICAL','OTHER'); END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='ticket_priority') THEN
          CREATE TYPE "ticket_priority" AS ENUM ('URGENT','HIGH','MEDIUM','LOW'); END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='ticket_source') THEN
          CREATE TYPE "ticket_source" AS ENUM ('CUSTOMER_APP','TASKER_APP','ADMIN'); END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='ticket_pending_reason') THEN
          CREATE TYPE "ticket_pending_reason" AS ENUM ('WAIT_CUSTOMER','WAIT_TASKER','WAIT_INTERNAL'); END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='resolution_type') THEN
          CREATE TYPE "resolution_type" AS ENUM
           ('EXPLANATION','RECLEAN','VOUCHER','REFUND','COMPENSATION','TASKER_PENALTY'); END IF;
      END $$;
    `);

    // 3) Mở rộng support_tickets
    const addCols = [
      `ADD COLUMN IF NOT EXISTS "ticket_code" varchar(20)`,
      `ADD COLUMN IF NOT EXISTS "description" text`,
      `ADD COLUMN IF NOT EXISTS "category" "ticket_category" DEFAULT 'OTHER'`,
      `ADD COLUMN IF NOT EXISTS "subtype" varchar(100)`,
      `ADD COLUMN IF NOT EXISTS "priority" "ticket_priority" DEFAULT 'MEDIUM'`,
      `ADD COLUMN IF NOT EXISTS "source" "ticket_source" DEFAULT 'CUSTOMER_APP'`,
      `ADD COLUMN IF NOT EXISTS "booking_id" uuid`,
      `ADD COLUMN IF NOT EXISTS "reporter_user_id" uuid`,
      `ADD COLUMN IF NOT EXISTS "counterparty_user_id" uuid`,
      `ADD COLUMN IF NOT EXISTS "assigned_admin_id" uuid`,
      `ADD COLUMN IF NOT EXISTS "first_response_due_at" timestamp`,
      `ADD COLUMN IF NOT EXISTS "resolution_due_at" timestamp`,
      `ADD COLUMN IF NOT EXISTS "first_responded_at" timestamp`,
      `ADD COLUMN IF NOT EXISTS "resolved_at" timestamp`,
      `ADD COLUMN IF NOT EXISTS "closed_at" timestamp`,
      `ADD COLUMN IF NOT EXISTS "sla_paused_at" timestamp`,
      `ADD COLUMN IF NOT EXISTS "sla_paused_accum_ms" bigint DEFAULT 0`,
      `ADD COLUMN IF NOT EXISTS "sla_breached" boolean DEFAULT false`,
      `ADD COLUMN IF NOT EXISTS "pending_reason" "ticket_pending_reason"`,
      `ADD COLUMN IF NOT EXISTS "incident_id" uuid`,
    ];
    for (const c of addCols) {
      await q.query(`ALTER TABLE "support_tickets" ${c};`);
    }
    await q.query(
      `ALTER TABLE "support_tickets" DROP COLUMN IF EXISTS "overdue_at";`,
    );

    await q.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_support_tickets_code"
         ON "support_tickets" ("ticket_code") WHERE "ticket_code" IS NOT NULL;`,
    );

    // FK (guarded)
    await q.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_st_booking') THEN
          ALTER TABLE "support_tickets" ADD CONSTRAINT "fk_st_booking"
            FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_st_reporter') THEN
          ALTER TABLE "support_tickets" ADD CONSTRAINT "fk_st_reporter"
            FOREIGN KEY ("reporter_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_st_counterparty') THEN
          ALTER TABLE "support_tickets" ADD CONSTRAINT "fk_st_counterparty"
            FOREIGN KEY ("counterparty_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_st_admin') THEN
          ALTER TABLE "support_tickets" ADD CONSTRAINT "fk_st_admin"
            FOREIGN KEY ("assigned_admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF;
      END $$;
    `);

    await q.query(
      `CREATE INDEX IF NOT EXISTS "idx_st_status_priority_created" ON "support_tickets" ("status","priority","created_at");`,
    );
    await q.query(
      `CREATE INDEX IF NOT EXISTS "idx_st_reporter" ON "support_tickets" ("reporter_user_id");`,
    );
    await q.query(
      `CREATE INDEX IF NOT EXISTS "idx_st_booking" ON "support_tickets" ("booking_id");`,
    );
    await q.query(
      `CREATE INDEX IF NOT EXISTS "idx_st_assigned" ON "support_tickets" ("assigned_admin_id");`,
    );

    // 4) Bảng con
    await q.query(`
      CREATE TABLE IF NOT EXISTS "ticket_messages" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "ticket_id" uuid NOT NULL REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "sender_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "body" text NOT NULL,
        "is_internal" boolean NOT NULL DEFAULT false,
        "created_at" timestamp DEFAULT now()
      );`);
    await q.query(
      `CREATE INDEX IF NOT EXISTS "idx_tm_ticket" ON "ticket_messages" ("ticket_id","created_at");`,
    );

    await q.query(`
      CREATE TABLE IF NOT EXISTS "ticket_attachments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "ticket_id" uuid NOT NULL REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "message_id" uuid REFERENCES "ticket_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "url" text NOT NULL,
        "public_id" varchar(255),
        "uploaded_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "created_at" timestamp DEFAULT now()
      );`);
    await q.query(
      `CREATE INDEX IF NOT EXISTS "idx_ta_ticket" ON "ticket_attachments" ("ticket_id");`,
    );

    await q.query(`
      CREATE TABLE IF NOT EXISTS "ticket_status_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "ticket_id" uuid NOT NULL REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "old_status" "support_ticket_status",
        "new_status" "support_ticket_status" NOT NULL,
        "changed_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "note" text,
        "created_at" timestamp DEFAULT now()
      );`);
    await q.query(
      `CREATE INDEX IF NOT EXISTS "idx_tsl_ticket" ON "ticket_status_logs" ("ticket_id","created_at");`,
    );

    await q.query(`
      CREATE TABLE IF NOT EXISTS "ticket_resolutions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "ticket_id" uuid NOT NULL REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "type" "resolution_type" NOT NULL,
        "amount" numeric(12,2),
        "voucher_id" uuid,
        "reclean_booking_id" uuid,
        "proposed_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "wallet_transaction_id" uuid,
        "note" text,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );`);
    await q.query(
      `CREATE INDEX IF NOT EXISTS "idx_tr_ticket" ON "ticket_resolutions" ("ticket_id");`,
    );

    await q.query(`
      CREATE TABLE IF NOT EXISTS "ticket_surveys" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "ticket_id" uuid NOT NULL UNIQUE REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "rating" smallint,
        "comment" text,
        "submitted_at" timestamp,
        "created_at" timestamp DEFAULT now(),
        CONSTRAINT "CHK_ticket_survey_rating" CHECK ("rating" IS NULL OR "rating" BETWEEN 1 AND 5)
      );`);

    // 5) Seed config ticket (config dịch vụ) — guard: chỉ seed nếu bảng system_configs tồn tại
    await q.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='system_configs') THEN
          INSERT INTO system_configs (config_key, config_value, description) VALUES
       ('TICKET_SLA_MATRIX', '{"URGENT":{"responseMins":15,"resolutionMins":240},"HIGH":{"responseMins":30,"resolutionMins":120},"MEDIUM":{"responseMins":120,"resolutionMins":1440},"LOW":{"responseMins":120,"resolutionMins":1440}}', 'Ma tran SLA ticket theo priority (phut)'),
       ('TICKET_CATEGORY_PRIORITY', '{"SERVICE_QUALITY":"MEDIUM","TASKER_BEHAVIOR":"HIGH","SCHEDULING":"HIGH","PROPERTY_DAMAGE":"URGENT","PAYMENT_BILLING":"MEDIUM","ACCOUNT_TECHNICAL":"LOW","OTHER":"LOW"}', 'Priority mac dinh theo category'),
       ('TICKET_AUTOCLOSE_HOURS', '48', 'Gio auto-close sau RESOLVED'),
       ('TICKET_COMPLAINT_WINDOW_DAYS', '7', 'Cua so khieu nai sau khi don COMPLETED'),
       ('TICKET_SLA_PAUSE_ON_WAIT_TASKER', 'true', 'Pause SLA khi cho tasker')
          ON CONFLICT (config_key) DO NOTHING;
        END IF;
      END $$;
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='system_configs') THEN
          DELETE FROM system_configs WHERE config_key IN
            ('TICKET_SLA_MATRIX','TICKET_CATEGORY_PRIORITY','TICKET_AUTOCLOSE_HOURS','TICKET_COMPLAINT_WINDOW_DAYS','TICKET_SLA_PAUSE_ON_WAIT_TASKER');
        END IF;
      END $$;`);
    await q.query(`DROP TABLE IF EXISTS "ticket_surveys";`);
    await q.query(`DROP TABLE IF EXISTS "ticket_resolutions";`);
    await q.query(`DROP TABLE IF EXISTS "ticket_attachments";`);
    await q.query(`DROP TABLE IF EXISTS "ticket_status_logs";`);
    await q.query(`DROP TABLE IF EXISTS "ticket_messages";`);

    await q.query(`DROP INDEX IF EXISTS "idx_st_status_priority_created";`);
    await q.query(`DROP INDEX IF EXISTS "idx_st_reporter";`);
    await q.query(`DROP INDEX IF EXISTS "idx_st_booking";`);
    await q.query(`DROP INDEX IF EXISTS "idx_st_assigned";`);
    await q.query(`DROP INDEX IF EXISTS "uq_support_tickets_code";`);
    await q.query(
      `ALTER TABLE "support_tickets" DROP CONSTRAINT IF EXISTS "fk_st_booking";`,
    );
    await q.query(
      `ALTER TABLE "support_tickets" DROP CONSTRAINT IF EXISTS "fk_st_reporter";`,
    );
    await q.query(
      `ALTER TABLE "support_tickets" DROP CONSTRAINT IF EXISTS "fk_st_counterparty";`,
    );
    await q.query(
      `ALTER TABLE "support_tickets" DROP CONSTRAINT IF EXISTS "fk_st_admin";`,
    );

    for (const col of [
      'ticket_code',
      'description',
      'category',
      'subtype',
      'priority',
      'source',
      'booking_id',
      'reporter_user_id',
      'counterparty_user_id',
      'assigned_admin_id',
      'first_response_due_at',
      'resolution_due_at',
      'first_responded_at',
      'resolved_at',
      'closed_at',
      'sla_paused_at',
      'sla_paused_accum_ms',
      'sla_breached',
      'pending_reason',
      'incident_id',
    ]) {
      await q.query(
        `ALTER TABLE "support_tickets" DROP COLUMN IF EXISTS "${col}";`,
      );
    }
    await q.query(
      `ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "overdue_at" timestamp;`,
    );

    // Đảo enum status về 3 nhãn (map NEW→OPEN)
    await q.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid
                   WHERE t.typname='support_ticket_status' AND e.enumlabel='NEW') THEN
          ALTER TABLE "support_tickets" ALTER COLUMN "status" DROP DEFAULT;
          CREATE TYPE "support_ticket_status_old" AS ENUM ('OPEN','IN_PROGRESS','CLOSED');
          ALTER TABLE "support_tickets" ALTER COLUMN "status" TYPE "support_ticket_status_old"
            USING (CASE "status"::text
                     WHEN 'NEW' THEN 'OPEN' WHEN 'PENDING' THEN 'IN_PROGRESS'
                     WHEN 'RESOLVED' THEN 'IN_PROGRESS' ELSE "status"::text END)::"support_ticket_status_old";
          DROP TYPE "support_ticket_status";
          ALTER TYPE "support_ticket_status_old" RENAME TO "support_ticket_status";
          ALTER TABLE "support_tickets" ALTER COLUMN "status" SET DEFAULT 'OPEN';
        END IF;
      END $$;
    `);

    await q.query(`DROP TYPE IF EXISTS "resolution_type";`);
    await q.query(`DROP TYPE IF EXISTS "ticket_pending_reason";`);
    await q.query(`DROP TYPE IF EXISTS "ticket_source";`);
    await q.query(`DROP TYPE IF EXISTS "ticket_priority";`);
    await q.query(`DROP TYPE IF EXISTS "ticket_category";`);
  }
}
