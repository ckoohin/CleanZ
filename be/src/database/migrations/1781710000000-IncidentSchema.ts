import { MigrationInterface, QueryRunner } from 'typeorm';

// Slice 1 — Incident: chuẩn hóa enum incident_status (6 nhãn) + chiều compensation_status/closure_reason,
// dựng/ mở rộng bảng incidents + incident_evidences + 4 bảng con, backfill dòng seed, seed config.
// Idempotent (guarded). Robust cho cả DB migration-based (chưa có bảng) lẫn DB seed-from-data.sql.
export class IncidentSchema1781710000000 implements MigrationInterface {
  name = 'IncidentSchema1781710000000';

  public async up(q: QueryRunner): Promise<void> {
    // 1) Enum incident_status: tạo nếu thiếu; hòa giải nếu tồn tại sai nhãn (defensive)
    await q.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='incident_status') THEN
          CREATE TYPE "incident_status" AS ENUM
            ('REPORTED','INVESTIGATING','APPROVED','REJECTED','COMPENSATED','CLOSED');
        ELSIF NOT EXISTS (
            SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid
            WHERE t.typname='incident_status' AND e.enumlabel='REPORTED'
          ) AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='incidents') THEN
          ALTER TABLE "incidents" ALTER COLUMN "status" DROP DEFAULT;
          CREATE TYPE "incident_status_new" AS ENUM
            ('REPORTED','INVESTIGATING','APPROVED','REJECTED','COMPENSATED','CLOSED');
          ALTER TABLE "incidents" ALTER COLUMN "status" TYPE "incident_status_new"
            USING (CASE "status"::text
                     WHEN 'OPEN' THEN 'REPORTED'
                     WHEN 'IN_PROGRESS' THEN 'INVESTIGATING'
                     WHEN 'RESOLVED' THEN 'CLOSED'
                     ELSE "status"::text END)::"incident_status_new";
          DROP TYPE "incident_status";
          ALTER TYPE "incident_status_new" RENAME TO "incident_status";
          ALTER TABLE "incidents" ALTER COLUMN "status" SET DEFAULT 'REPORTED';
        END IF;
      END $$;
    `);

    // 2) Enum mới (guarded)
    await q.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='incident_compensation_status') THEN
          CREATE TYPE "incident_compensation_status" AS ENUM ('NONE','PENDING','PROCESSING','RECORDED','FAILED'); END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='incident_closure_reason') THEN
          CREATE TYPE "incident_closure_reason" AS ENUM
            ('COMPENSATED','REJECTED','WITHDRAWN','DUPLICATE','INVALID_BOOKING','EXPIRED'); END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='incident_severity') THEN
          CREATE TYPE "incident_severity" AS ENUM ('CRITICAL','MAJOR','MINOR'); END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='incident_log_dimension') THEN
          CREATE TYPE "incident_log_dimension" AS ENUM ('STATUS','COMPENSATION'); END IF;
      END $$;
    `);

    // 3) Bảng incidents (tạo full To-Be nếu chưa có — DB migration-based)
    await q.query(`
      CREATE TABLE IF NOT EXISTS "incidents" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "incident_code" varchar(20),
        "booking_id" uuid NOT NULL REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "customer_id" uuid NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "tasker_id" uuid NOT NULL REFERENCES "taskers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "title" varchar(255) NOT NULL,
        "description" text NOT NULL,
        "severity" "incident_severity" DEFAULT 'MINOR',
        "status" "incident_status" DEFAULT 'REPORTED',
        "compensation_status" "incident_compensation_status" DEFAULT 'NONE',
        "closure_reason" "incident_closure_reason",
        "claimed_amount" numeric(12,2),
        "approved_compensation_amount" numeric(12,2),
        "tasker_borne_amount" numeric(12,2),
        "platform_borne_amount" numeric(12,2),
        "allocation_reason" text,
        "compensation_source" varchar(50),
        "decided_by_investigator_id" uuid REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "approved_by_checker_id" uuid REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "cooling_until" timestamp,
        "received_due_at" timestamp,
        "statement_due_at" timestamp,
        "decision_due_at" timestamp,
        "report_window_until" timestamp,
        "reported_at" timestamp DEFAULT CURRENT_TIMESTAMP,
        "resolved_at" timestamp,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );`);

    // 3b) Mở rộng incidents nếu đã tồn tại (ADD COLUMN IF NOT EXISTS).
    // Gồm cả BASE columns vì DB có thể đến từ entity stub (thiếu booking_id/claimed_amount...).
    // Thêm base dạng nullable để an toàn nếu bảng đã có dữ liệu cũ.
    const addCols = [
      `ADD COLUMN IF NOT EXISTS "booking_id" uuid`,
      `ADD COLUMN IF NOT EXISTS "customer_id" uuid`,
      `ADD COLUMN IF NOT EXISTS "tasker_id" uuid`,
      `ADD COLUMN IF NOT EXISTS "description" text`,
      `ADD COLUMN IF NOT EXISTS "claimed_amount" numeric(12,2)`,
      `ADD COLUMN IF NOT EXISTS "approved_compensation_amount" numeric(12,2)`,
      `ADD COLUMN IF NOT EXISTS "compensation_source" varchar(50)`,
      `ADD COLUMN IF NOT EXISTS "reported_at" timestamp DEFAULT CURRENT_TIMESTAMP`,
      `ADD COLUMN IF NOT EXISTS "resolved_at" timestamp`,
      `ADD COLUMN IF NOT EXISTS "incident_code" varchar(20)`,
      `ADD COLUMN IF NOT EXISTS "severity" "incident_severity" DEFAULT 'MINOR'`,
      `ADD COLUMN IF NOT EXISTS "compensation_status" "incident_compensation_status" DEFAULT 'NONE'`,
      `ADD COLUMN IF NOT EXISTS "closure_reason" "incident_closure_reason"`,
      `ADD COLUMN IF NOT EXISTS "tasker_borne_amount" numeric(12,2)`,
      `ADD COLUMN IF NOT EXISTS "platform_borne_amount" numeric(12,2)`,
      `ADD COLUMN IF NOT EXISTS "allocation_reason" text`,
      `ADD COLUMN IF NOT EXISTS "decided_by_investigator_id" uuid`,
      `ADD COLUMN IF NOT EXISTS "approved_by_checker_id" uuid`,
      `ADD COLUMN IF NOT EXISTS "cooling_until" timestamp`,
      `ADD COLUMN IF NOT EXISTS "received_due_at" timestamp`,
      `ADD COLUMN IF NOT EXISTS "statement_due_at" timestamp`,
      `ADD COLUMN IF NOT EXISTS "decision_due_at" timestamp`,
      `ADD COLUMN IF NOT EXISTS "report_window_until" timestamp`,
      `ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now()`,
      `ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now()`,
    ];
    for (const c of addCols) {
      await q.query(`ALTER TABLE "incidents" ${c};`);
    }
    await q.query(
      `ALTER TABLE "incidents" DROP COLUMN IF EXISTS "overdue_at";`,
    );

    // ràng buộc + index + FK (guarded)
    await q.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_inc_borne_nonneg') THEN
          ALTER TABLE "incidents" ADD CONSTRAINT "chk_inc_borne_nonneg" CHECK (
            (tasker_borne_amount IS NULL OR tasker_borne_amount >= 0) AND
            (platform_borne_amount IS NULL OR platform_borne_amount >= 0)); END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_inc_comp_source') THEN
          ALTER TABLE "incidents" ADD CONSTRAINT "chk_inc_comp_source" CHECK (
            compensation_source IS NULL OR compensation_source IN ('TASKER_DEPOSIT','PLATFORM_FUND','MIXED')); END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_inc_investigator') THEN
          ALTER TABLE "incidents" ADD CONSTRAINT "fk_inc_investigator"
            FOREIGN KEY ("decided_by_investigator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_inc_checker') THEN
          ALTER TABLE "incidents" ADD CONSTRAINT "fk_inc_checker"
            FOREIGN KEY ("approved_by_checker_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF;
        -- FK base (cho trường hợp incidents đến từ stub: cột vừa được ALTER ADD)
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_inc_booking') THEN
          ALTER TABLE "incidents" ADD CONSTRAINT "fk_inc_booking"
            FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_inc_customer') THEN
          ALTER TABLE "incidents" ADD CONSTRAINT "fk_inc_customer"
            FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_inc_tasker') THEN
          ALTER TABLE "incidents" ADD CONSTRAINT "fk_inc_tasker"
            FOREIGN KEY ("tasker_id") REFERENCES "taskers"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF;
      END $$;
    `);
    await q.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_incidents_code" ON "incidents" ("incident_code") WHERE "incident_code" IS NOT NULL;`,
    );
    await q.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_inc_active_per_booking" ON "incidents" ("booking_id") WHERE "status" <> 'CLOSED';`,
    );
    await q.query(
      `CREATE INDEX IF NOT EXISTS "idx_inc_status_comp" ON "incidents" ("status","compensation_status");`,
    );
    await q.query(
      `CREATE INDEX IF NOT EXISTS "idx_inc_severity_created" ON "incidents" ("severity","created_at");`,
    );
    await q.query(
      `CREATE INDEX IF NOT EXISTS "idx_inc_customer" ON "incidents" ("customer_id");`,
    );
    await q.query(
      `CREATE INDEX IF NOT EXISTS "idx_inc_tasker" ON "incidents" ("tasker_id");`,
    );

    // 4) incident_damage_items
    await q.query(`
      CREATE TABLE IF NOT EXISTS "incident_damage_items" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "incident_id" uuid NOT NULL REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "description" varchar(255) NOT NULL,
        "claimed_amount" numeric(12,2) NOT NULL,
        "verified_amount" numeric(12,2),
        "approved_amount" numeric(12,2),
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now(),
        CONSTRAINT "chk_idi_claimed_pos" CHECK ("claimed_amount" > 0),
        CONSTRAINT "chk_idi_verified_nonneg" CHECK ("verified_amount" IS NULL OR "verified_amount" >= 0),
        CONSTRAINT "chk_idi_approved_nonneg" CHECK ("approved_amount" IS NULL OR "approved_amount" >= 0)
      );`);
    await q.query(
      `CREATE INDEX IF NOT EXISTS "idx_idi_incident" ON "incident_damage_items" ("incident_id");`,
    );

    // 5) incident_evidences (tạo nếu chưa có; mở rộng nếu có từ data.sql)
    await q.query(`
      CREATE TABLE IF NOT EXISTS "incident_evidences" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "incident_id" uuid REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "damage_item_id" uuid,
        "file_url" text NOT NULL,
        "file_type" varchar(50),
        "uploaded_by_user_id" uuid,
        "created_at" timestamp DEFAULT now(),
        CONSTRAINT "chk_ie_file_type" CHECK ("file_type" IS NULL OR "file_type" IN ('IMAGE','VIDEO'))
      );`);
    // incident_id nullable — cho phép upload evidence trước khi tạo incident.
    await q.query(
      `ALTER TABLE "incident_evidences" ALTER COLUMN "incident_id" DROP NOT NULL;`,
    );
    await q.query(
      `ALTER TABLE "incident_evidences" ADD COLUMN IF NOT EXISTS "damage_item_id" uuid;`,
    );
    await q.query(
      `ALTER TABLE "incident_evidences" ADD COLUMN IF NOT EXISTS "uploaded_by_user_id" uuid;`,
    );
    await q.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_ie_uploaded_by') THEN
          ALTER TABLE "incident_evidences" ADD CONSTRAINT "fk_ie_uploaded_by"
            FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_ie_damage_item') THEN
          ALTER TABLE "incident_evidences" ADD CONSTRAINT "fk_ie_damage_item"
            FOREIGN KEY ("damage_item_id") REFERENCES "incident_damage_items"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF;
      END $$;
    `);
    await q.query(
      `CREATE INDEX IF NOT EXISTS "idx_ie_damage_item" ON "incident_evidences" ("damage_item_id");`,
    );

    // 6) incident_statements
    await q.query(`
      CREATE TABLE IF NOT EXISTS "incident_statements" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "incident_id" uuid NOT NULL REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "submitted_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "body" text NOT NULL,
        "created_at" timestamp DEFAULT now()
      );`);
    await q.query(
      `CREATE INDEX IF NOT EXISTS "idx_ist_incident" ON "incident_statements" ("incident_id","created_at");`,
    );

    // 7) incident_status_logs (2 chiều)
    await q.query(`
      CREATE TABLE IF NOT EXISTS "incident_status_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "incident_id" uuid NOT NULL REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "dimension" "incident_log_dimension" NOT NULL,
        "old_value" varchar(50),
        "new_value" varchar(50) NOT NULL,
        "changed_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "reason" text,
        "created_at" timestamp DEFAULT now()
      );`);
    await q.query(
      `CREATE INDEX IF NOT EXISTS "idx_isl_incident" ON "incident_status_logs" ("incident_id","created_at");`,
    );

    // 8) customer_incident_strikes
    await q.query(`
      CREATE TABLE IF NOT EXISTS "customer_incident_strikes" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "customer_id" uuid NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "incident_id" uuid REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "reason" text,
        "created_at" timestamp DEFAULT now()
      );`);
    await q.query(
      `CREATE INDEX IF NOT EXISTS "idx_cis_customer" ON "customer_incident_strikes" ("customer_id");`,
    );

    // 9) Cờ trên customers / taskers
    await q.query(
      `ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "reporting_locked_until" timestamp;`,
    );
    await q.query(
      `ALTER TABLE "taskers" ADD COLUMN IF NOT EXISTS "deposit_topup_due" timestamp;`,
    );

    // 10) Backfill dòng seed cũ (incident_code + created_at + 1 damage item + gắn evidence)
    await q.query(`
      UPDATE "incidents" i SET
        "incident_code" = COALESCE(i."incident_code",
          'IC-' || to_char(COALESCE(i."reported_at", now()),'YYYYMMDD') || '-' ||
          lpad((sub.rn)::text, 4, '0')),
        "created_at" = COALESCE(i."created_at", i."reported_at", now()),
        "updated_at" = COALESCE(i."updated_at", i."reported_at", now()),
        "report_window_until" = COALESCE(i."report_window_until", i."reported_at" + interval '48 hours')
      FROM (SELECT "id", row_number() OVER (ORDER BY "reported_at") AS rn FROM "incidents") sub
      WHERE i."id" = sub."id" AND i."incident_code" IS NULL;
    `);
    await q.query(`
      INSERT INTO "incident_damage_items" ("incident_id","description","claimed_amount")
      SELECT i."id", LEFT(i."description",255), GREATEST(COALESCE(i."claimed_amount",1), 1)
      FROM "incidents" i
      WHERE i."claimed_amount" IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM "incident_damage_items" d WHERE d."incident_id"=i."id");
    `);
    await q.query(`
      UPDATE "incident_evidences" e SET "damage_item_id" = d."id"
      FROM "incident_damage_items" d
      WHERE d."incident_id" = e."incident_id" AND e."damage_item_id" IS NULL;
    `);

    // 11) Seed config incident (config dịch vụ)
    await q.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='system_configs') THEN
          UPDATE system_configs SET config_value='48' WHERE config_key='INCIDENT_REPORT_WINDOW_HOURS';
          INSERT INTO system_configs (config_key, config_value, description) VALUES
            ('INCIDENT_REPORT_WINDOW_HOURS','48','Cua so bao cao su co (gio)'),
            ('INCIDENT_REPORT_WINDOW_SEVERE_HOURS','72','Cua so bao cao su co nghiem trong (gio)'),
            ('INCIDENT_SEVERE_CRITERIA','{"categories":["LOSS","DEVICE_DAMAGE","SAFETY"],"severeAmount":5000000,"majorAmount":1000000}','Tieu chi severity tu dong theo category + Sigma claimed (VND)'),
            ('INCIDENT_CLAIM_MAX_AMOUNT','20000000','Tran so tien yeu cau/hang muc (VND)'),
            ('INCIDENT_EVIDENCE_REQUIRED_THRESHOLD','1000000','Nguong bat buoc chung tu (VND)'),
            ('INCIDENT_DUAL_APPROVAL_THRESHOLD','2000000','Nguong phe duyet cap 2 maker-checker (VND)'),
            ('INCIDENT_COMPENSATION_POLICY_CAP','10000000','Tran boi thuong/su co (VND)'),
            ('INCIDENT_COOLING_PERIOD_HOURS','24','Cooling truoc khi tru coc claim lon (gio)'),
            ('INCIDENT_DEPOSIT_TOPUP_GRACE_DAYS','7','So ngay nap bo sung coc truoc khi SUSPENDED'),
            ('INCIDENT_AUTOCLOSE_HOURS','48','Gio auto-close sau RECORDED/REJECTED'),
            ('INCIDENT_REPORTED_EXPIRY_DAYS','30','Auto-close housekeeping Incident ket REPORTED qua N ngay (0=tat)'),
            ('INCIDENT_SLA_MATRIX','{"CRITICAL":{"receivedMins":240,"statementMins":1440,"decisionMins":1440,"executeMins":1440,"autocloseHours":48},"MAJOR":{"receivedMins":720,"statementMins":2160,"decisionMins":2880,"executeMins":1440,"autocloseHours":48},"MINOR":{"receivedMins":1440,"statementMins":2880,"decisionMins":4320,"executeMins":1440,"autocloseHours":48}}','Ma tran SLA incident theo muc nghiem trong'),
            ('INCIDENT_FALSE_REPORT_STRIKES','{"warn":[1,2],"lockFrom":3}','Nguong canh cao/khoa quyen bao cao khi khai gian')
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
            ('INCIDENT_REPORT_WINDOW_SEVERE_HOURS','INCIDENT_SEVERE_CRITERIA','INCIDENT_CLAIM_MAX_AMOUNT',
             'INCIDENT_EVIDENCE_REQUIRED_THRESHOLD','INCIDENT_DUAL_APPROVAL_THRESHOLD','INCIDENT_COMPENSATION_POLICY_CAP',
             'INCIDENT_COOLING_PERIOD_HOURS','INCIDENT_DEPOSIT_TOPUP_GRACE_DAYS','INCIDENT_AUTOCLOSE_HOURS',
             'INCIDENT_REPORTED_EXPIRY_DAYS','INCIDENT_SLA_MATRIX','INCIDENT_FALSE_REPORT_STRIKES');
        END IF;
      END $$;`);

    await q.query(`DROP TABLE IF EXISTS "customer_incident_strikes";`);
    await q.query(`DROP TABLE IF EXISTS "incident_status_logs";`);
    await q.query(`DROP TABLE IF EXISTS "incident_statements";`);
    await q.query(
      `ALTER TABLE "incident_evidences" DROP CONSTRAINT IF EXISTS "fk_ie_damage_item";`,
    );
    await q.query(`DROP TABLE IF EXISTS "incident_damage_items";`);

    await q.query(
      `ALTER TABLE "taskers" DROP COLUMN IF EXISTS "deposit_topup_due";`,
    );
    await q.query(
      `ALTER TABLE "customers" DROP COLUMN IF EXISTS "reporting_locked_until";`,
    );

    await q.query(`DROP INDEX IF EXISTS "uq_incidents_code";`);
    await q.query(`DROP INDEX IF EXISTS "uq_inc_active_per_booking";`);
    await q.query(`DROP INDEX IF EXISTS "idx_inc_status_comp";`);
    await q.query(`DROP INDEX IF EXISTS "idx_inc_severity_created";`);
    await q.query(`DROP INDEX IF EXISTS "idx_inc_customer";`);
    await q.query(`DROP INDEX IF EXISTS "idx_inc_tasker";`);

    // Gỡ các cột mở rộng trên incidents (giữ bảng + cột gốc data.sql)
    for (const col of [
      'incident_code',
      'severity',
      'compensation_status',
      'closure_reason',
      'tasker_borne_amount',
      'platform_borne_amount',
      'allocation_reason',
      'decided_by_investigator_id',
      'approved_by_checker_id',
      'cooling_until',
      'received_due_at',
      'statement_due_at',
      'decision_due_at',
      'report_window_until',
      'created_at',
      'updated_at',
    ]) {
      await q.query(`ALTER TABLE "incidents" DROP COLUMN IF EXISTS "${col}";`);
    }
    await q.query(
      `ALTER TABLE "incidents" DROP CONSTRAINT IF EXISTS "chk_inc_borne_nonneg";`,
    );
    await q.query(
      `ALTER TABLE "incidents" DROP CONSTRAINT IF EXISTS "chk_inc_comp_source";`,
    );
    await q.query(
      `ALTER TABLE "incidents" DROP CONSTRAINT IF EXISTS "fk_inc_investigator";`,
    );
    await q.query(
      `ALTER TABLE "incidents" DROP CONSTRAINT IF EXISTS "fk_inc_checker";`,
    );

    // Đảo evidence mở rộng
    await q.query(
      `ALTER TABLE "incident_evidences" DROP COLUMN IF EXISTS "damage_item_id";`,
    );
    await q.query(
      `ALTER TABLE "incident_evidences" DROP COLUMN IF EXISTS "uploaded_by_user_id";`,
    );

    await q.query(`DROP TYPE IF EXISTS "incident_log_dimension";`);
    await q.query(`DROP TYPE IF EXISTS "incident_severity";`);
    await q.query(`DROP TYPE IF EXISTS "incident_closure_reason";`);
    await q.query(`DROP TYPE IF EXISTS "incident_compensation_status";`);
  }
}
