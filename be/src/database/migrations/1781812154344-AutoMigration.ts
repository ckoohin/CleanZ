import { MigrationInterface, QueryRunner } from "typeorm";

export class AutoMigration1781812154344 implements MigrationInterface {
    name = 'AutoMigration1781812154344'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "pricing_configs" DROP CONSTRAINT "FK_664f4525629e6c2874ba6a36b15"`);
        await queryRunner.query(`ALTER TABLE "vouchers" DROP CONSTRAINT "FK_820556fd3264ae9abfe7cbc0734"`);
        await queryRunner.query(`CREATE TYPE "public"."tasker_withdrawal_requests_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'PROCESSED')`);
        await queryRunner.query(`CREATE TABLE "tasker_withdrawal_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tasker_id" uuid NOT NULL, "wallet_id" uuid NOT NULL, "amount" numeric(12,2) NOT NULL, "status" "public"."tasker_withdrawal_requests_status_enum" NOT NULL DEFAULT 'PENDING', "bank_account" character varying(255), "bank_name" character varying(100), "note" text, "reviewed_at" TIMESTAMP, "processed_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_346777f85c4f5d033047d178fbe" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_tasker_withdrawal_tasker_id" ON "tasker_withdrawal_requests" ("tasker_id") `);
        await queryRunner.query(`CREATE INDEX "idx_tasker_withdrawal_wallet_id" ON "tasker_withdrawal_requests" ("wallet_id") `);
        await queryRunner.query(`CREATE INDEX "idx_tasker_withdrawal_status" ON "tasker_withdrawal_requests" ("status") `);
        await queryRunner.query(`CREATE TABLE "customer_vouchers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "customer_id" uuid NOT NULL, "voucher_id" uuid NOT NULL, "is_used" boolean NOT NULL DEFAULT false, "used_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "uq_customer_voucher" UNIQUE ("customer_id", "voucher_id"), CONSTRAINT "PK_ae417e91ab934d36629f77ce065" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_customer_vouchers_voucher_id" ON "customer_vouchers" ("voucher_id") `);
        await queryRunner.query(`CREATE TABLE "ticket_surveys" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "rating" smallint, "comment" text, "submitted_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "ticket_id" uuid, CONSTRAINT "REL_7724c54f5ad18c6850d9416c15" UNIQUE ("ticket_id"), CONSTRAINT "CHK_ticket_survey_rating" CHECK ("rating" BETWEEN 1 AND 5), CONSTRAINT "PK_2e61bb81b9754cc165badc790ce" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "ticket_status_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "old_status" "public"."support_ticket_status", "new_status" "public"."support_ticket_status" NOT NULL, "note" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "ticket_id" uuid, "changed_by_user_id" uuid, CONSTRAINT "PK_7c6d819f63bf300128f720048dc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_tsl_ticket" ON "ticket_status_logs" ("ticket_id", "created_at") `);
        await queryRunner.query(`CREATE TYPE "public"."resolution_type" AS ENUM('EXPLANATION', 'RECLEAN', 'VOUCHER', 'REFUND', 'COMPENSATION', 'TASKER_PENALTY')`);
        await queryRunner.query(`CREATE TABLE "ticket_resolutions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" "public"."resolution_type" NOT NULL, "amount" numeric(12,2), "voucher_id" uuid, "reclean_booking_id" uuid, "wallet_transaction_id" uuid, "note" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "ticket_id" uuid, "proposed_by_user_id" uuid, CONSTRAINT "PK_8d660124143985f4c7944c2ae23" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_tr_ticket" ON "ticket_resolutions" ("ticket_id") `);
        await queryRunner.query(`CREATE TABLE "ticket_messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "body" text NOT NULL, "is_internal" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "ticket_id" uuid, "sender_user_id" uuid, CONSTRAINT "PK_37beb692dedf7eccb4e519ccec1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_tm_ticket" ON "ticket_messages" ("ticket_id", "created_at") `);
        await queryRunner.query(`CREATE TABLE "ticket_attachments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "url" text NOT NULL, "public_id" character varying(255), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "ticket_id" uuid, "message_id" uuid, "uploaded_by_user_id" uuid, CONSTRAINT "PK_7e5011f87f95e78fe4bd7d982a3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_ta_ticket" ON "ticket_attachments" ("ticket_id") `);
        await queryRunner.query(`ALTER TABLE "support_tickets" DROP COLUMN "overdue_at"`);
        await queryRunner.query(`ALTER TABLE "pricing_configs" ADD "duration_hours" numeric(4,1)`);
        await queryRunner.query(`
          UPDATE "pricing_configs" AS "pricing"
          SET "duration_hours" = "service"."base_duration_hours"
          FROM "services" AS "service"
          WHERE "service"."id" = "pricing"."service_id"
            AND "pricing"."duration_hours" IS NULL
        `);
        await queryRunner.query(`
          UPDATE "pricing_configs"
          SET "duration_hours" = 0.5
          WHERE "duration_hours" IS NULL
        `);
        await queryRunner.query(`ALTER TABLE "pricing_configs" ALTER COLUMN "duration_hours" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ADD "ticket_code" character varying(20)`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ADD "description" text`);
        await queryRunner.query(`CREATE TYPE "public"."ticket_category" AS ENUM('SERVICE_QUALITY', 'TASKER_BEHAVIOR', 'SCHEDULING', 'PROPERTY_DAMAGE', 'PAYMENT_BILLING', 'ACCOUNT_TECHNICAL', 'OTHER')`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ADD "category" "public"."ticket_category" NOT NULL DEFAULT 'OTHER'`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ADD "subtype" character varying(100)`);
        await queryRunner.query(`CREATE TYPE "public"."ticket_priority" AS ENUM('URGENT', 'HIGH', 'MEDIUM', 'LOW')`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ADD "priority" "public"."ticket_priority" NOT NULL DEFAULT 'MEDIUM'`);
        await queryRunner.query(`CREATE TYPE "public"."ticket_source" AS ENUM('CUSTOMER_APP', 'TASKER_APP', 'ADMIN')`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ADD "source" "public"."ticket_source" NOT NULL DEFAULT 'CUSTOMER_APP'`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ADD "first_response_due_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ADD "resolution_due_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ADD "first_responded_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ADD "resolved_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ADD "closed_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ADD "sla_paused_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ADD "sla_paused_accum_ms" bigint NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ADD "sla_breached" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`CREATE TYPE "public"."ticket_pending_reason" AS ENUM('WAIT_CUSTOMER', 'WAIT_TASKER', 'WAIT_INTERNAL')`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ADD "pending_reason" "public"."ticket_pending_reason"`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ADD "incident_id" uuid`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ADD "booking_id" uuid`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ADD "reporter_user_id" uuid`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ADD "counterparty_user_id" uuid`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ADD "assigned_admin_id" uuid`);
        await queryRunner.query(`ALTER TYPE "public"."cancelled_by" RENAME TO "cancelled_by_old"`);
        await queryRunner.query(`CREATE TYPE "public"."cancelled_by" AS ENUM('CUSTOMER', 'TASKER', 'SYSTEM', 'ADMIN')`);
        await queryRunner.query(`ALTER TABLE "bookings" ALTER COLUMN "cancelled_by" TYPE "public"."cancelled_by" USING "cancelled_by"::"text"::"public"."cancelled_by"`);
        await queryRunner.query(`ALTER TABLE "booking_status_logs" ALTER COLUMN "cancelled_by" TYPE "public"."cancelled_by" USING "cancelled_by"::"text"::"public"."cancelled_by"`);
        await queryRunner.query(`DROP TYPE "public"."cancelled_by_old"`);
        await queryRunner.query(`ALTER TABLE "wallets" DROP CONSTRAINT IF EXISTS "chk_wallet_owner"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."uq_wallets_system"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_wallets_owner_type"`);
        await queryRunner.query(`ALTER TYPE "public"."wallet_owner_type" RENAME TO "wallet_owner_type_old"`);
        await queryRunner.query(`CREATE TYPE "public"."wallets_owner_type_enum" AS ENUM('CUSTOMER', 'TASKER', 'SYSTEM')`);
        await queryRunner.query(`ALTER TABLE "wallets" ALTER COLUMN "owner_type" TYPE "public"."wallets_owner_type_enum" USING "owner_type"::"text"::"public"."wallets_owner_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."wallet_owner_type_old"`);
        await queryRunner.query(`CREATE INDEX "idx_wallets_owner_type" ON "wallets" ("owner_type")`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_wallets_system" ON "wallets" ("owner_type") WHERE "owner_type" = 'SYSTEM'`);
        await queryRunner.query(`
          ALTER TABLE "wallets"
          ADD CONSTRAINT "chk_wallet_owner"
          CHECK (
            ("owner_type" = 'CUSTOMER' AND "customer_id" IS NOT NULL AND "tasker_id" IS NULL)
            OR ("owner_type" = 'TASKER' AND "tasker_id" IS NOT NULL AND "customer_id" IS NULL)
            OR ("owner_type" = 'SYSTEM' AND "customer_id" IS NULL AND "tasker_id" IS NULL)
          )
        `);
        await queryRunner.query(`ALTER TABLE "pricing_configs" ALTER COLUMN "service_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "services" DROP COLUMN "coverage_area"`);
        await queryRunner.query(`ALTER TABLE "services" ADD "coverage_area" text`);
        await queryRunner.query(`ALTER TYPE "public"."voucher_type" RENAME TO "voucher_type_old"`);
        await queryRunner.query(`CREATE TYPE "public"."vouchers_type_enum" AS ENUM('PERCENT', 'FIXED')`);
        await queryRunner.query(`ALTER TABLE "vouchers" ALTER COLUMN "type" TYPE "public"."vouchers_type_enum" USING "type"::"text"::"public"."vouchers_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."voucher_type_old"`);
        await queryRunner.query(`ALTER TYPE "public"."support_ticket_status" RENAME TO "support_ticket_status_old"`);
        await queryRunner.query(`CREATE TYPE "public"."support_ticket_status" AS ENUM('NEW', 'IN_PROGRESS', 'PENDING', 'RESOLVED', 'CLOSED')`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ALTER COLUMN "status" TYPE "public"."support_ticket_status" USING "status"::"text"::"public"."support_ticket_status"`);
        await queryRunner.query(`ALTER TABLE "ticket_status_logs" ALTER COLUMN "old_status" TYPE "public"."support_ticket_status" USING "old_status"::"text"::"public"."support_ticket_status"`);
        await queryRunner.query(`ALTER TABLE "ticket_status_logs" ALTER COLUMN "new_status" TYPE "public"."support_ticket_status" USING "new_status"::"text"::"public"."support_ticket_status"`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ALTER COLUMN "status" SET DEFAULT 'NEW'`);
        await queryRunner.query(`DROP TYPE "public"."support_ticket_status_old"`);
        await queryRunner.query(`ALTER TABLE "peak_day_configs" ALTER COLUMN "peak_rate" TYPE numeric(5,2)`);
        await queryRunner.query(`COMMENT ON COLUMN "peak_day_configs"."peak_rate" IS 'Price multiplier >= 1.0 (e.g. 1.2 = +20%)'`);
        await queryRunner.query(`ALTER TABLE "peak_day_configs" ALTER COLUMN "peak_rate" SET DEFAULT '1'`);
        await queryRunner.query(`CREATE INDEX "idx_services_is_active" ON "services" ("is_active") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_voucher_code" ON "vouchers" ("code") `);
        await queryRunner.query(`CREATE INDEX "idx_vouchers_active_dates" ON "vouchers" ("start_date") `);
        await queryRunner.query(`CREATE INDEX "idx_st_assigned" ON "support_tickets" ("assigned_admin_id") `);
        await queryRunner.query(`CREATE INDEX "idx_st_booking" ON "support_tickets" ("booking_id") `);
        await queryRunner.query(`CREATE INDEX "idx_st_reporter" ON "support_tickets" ("reporter_user_id") `);
        await queryRunner.query(`CREATE INDEX "idx_st_status_priority_created" ON "support_tickets" ("status", "priority", "created_at") `);
        await queryRunner.query(`CREATE INDEX "idx_peak_day_configs_range" ON "peak_day_configs" ("start_at") `);
        await queryRunner.query(`ALTER TABLE "peak_day_configs" ADD CONSTRAINT "chk_peak_day_range" CHECK ("start_at" < "end_at")`);
        await queryRunner.query(`
          DELETE FROM "pricing_configs"
          WHERE "id" IN (
            SELECT "id"
            FROM (
              SELECT
                "id",
                ROW_NUMBER() OVER (
                  PARTITION BY "service_id", "duration_hours"
                  ORDER BY "created_at" DESC, "id" DESC
                ) AS "row_number"
              FROM "pricing_configs"
            ) AS "duplicated_pricing"
            WHERE "row_number" > 1
          )
        `);
        await queryRunner.query(`ALTER TABLE "pricing_configs" ADD CONSTRAINT "uq_pricing_service_duration" UNIQUE ("service_id", "duration_hours")`);
        await queryRunner.query(`ALTER TABLE "tasker_withdrawal_requests" ADD CONSTRAINT "FK_2af50fc317b474555af1647ba68" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pricing_configs" ADD CONSTRAINT "FK_664f4525629e6c2874ba6a36b15" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vouchers" ADD CONSTRAINT "FK_820556fd3264ae9abfe7cbc0734" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "customer_vouchers" ADD CONSTRAINT "FK_5d66d730e4a014373f201fe8a99" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ADD CONSTRAINT "FK_a8c6ccffa5d66547c61ef7e2924" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ADD CONSTRAINT "FK_6605ed8112884d5d8efae3cdc6c" FOREIGN KEY ("reporter_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ADD CONSTRAINT "FK_be6405cc25bdd470590fc37ec2e" FOREIGN KEY ("counterparty_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ADD CONSTRAINT "FK_a1f62770508fc8eff38c11c81ea" FOREIGN KEY ("assigned_admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "ticket_surveys" ADD CONSTRAINT "FK_7724c54f5ad18c6850d9416c15b" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "ticket_status_logs" ADD CONSTRAINT "FK_f0ad6a4b582b013bcfd321121e7" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "ticket_status_logs" ADD CONSTRAINT "FK_2ef7187d2b0f411cea0b0498481" FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "ticket_resolutions" ADD CONSTRAINT "FK_15a380c71fb7affe74eead88c64" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "ticket_resolutions" ADD CONSTRAINT "FK_1ba9b12bfbdf15b296fadfcd156" FOREIGN KEY ("proposed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "ticket_messages" ADD CONSTRAINT "FK_75b3a5f421dbf7b73778da519cb" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "ticket_messages" ADD CONSTRAINT "FK_c5a611c7a231d6e899422720607" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "ticket_attachments" ADD CONSTRAINT "FK_0301cfaf908edba6ce419eb66b0" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "ticket_attachments" ADD CONSTRAINT "FK_0571b827b74076e72e0221d13de" FOREIGN KEY ("message_id") REFERENCES "ticket_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "ticket_attachments" ADD CONSTRAINT "FK_e3aca48b83066a74970d8391d5c" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket_attachments" DROP CONSTRAINT "FK_e3aca48b83066a74970d8391d5c"`);
        await queryRunner.query(`ALTER TABLE "ticket_attachments" DROP CONSTRAINT "FK_0571b827b74076e72e0221d13de"`);
        await queryRunner.query(`ALTER TABLE "ticket_attachments" DROP CONSTRAINT "FK_0301cfaf908edba6ce419eb66b0"`);
        await queryRunner.query(`ALTER TABLE "ticket_messages" DROP CONSTRAINT "FK_c5a611c7a231d6e899422720607"`);
        await queryRunner.query(`ALTER TABLE "ticket_messages" DROP CONSTRAINT "FK_75b3a5f421dbf7b73778da519cb"`);
        await queryRunner.query(`ALTER TABLE "ticket_resolutions" DROP CONSTRAINT "FK_1ba9b12bfbdf15b296fadfcd156"`);
        await queryRunner.query(`ALTER TABLE "ticket_resolutions" DROP CONSTRAINT "FK_15a380c71fb7affe74eead88c64"`);
        await queryRunner.query(`ALTER TABLE "ticket_status_logs" DROP CONSTRAINT "FK_2ef7187d2b0f411cea0b0498481"`);
        await queryRunner.query(`ALTER TABLE "ticket_status_logs" DROP CONSTRAINT "FK_f0ad6a4b582b013bcfd321121e7"`);
        await queryRunner.query(`ALTER TABLE "ticket_surveys" DROP CONSTRAINT "FK_7724c54f5ad18c6850d9416c15b"`);
        await queryRunner.query(`ALTER TABLE "support_tickets" DROP CONSTRAINT "FK_a1f62770508fc8eff38c11c81ea"`);
        await queryRunner.query(`ALTER TABLE "support_tickets" DROP CONSTRAINT "FK_be6405cc25bdd470590fc37ec2e"`);
        await queryRunner.query(`ALTER TABLE "support_tickets" DROP CONSTRAINT "FK_6605ed8112884d5d8efae3cdc6c"`);
        await queryRunner.query(`ALTER TABLE "support_tickets" DROP CONSTRAINT "FK_a8c6ccffa5d66547c61ef7e2924"`);
        await queryRunner.query(`ALTER TABLE "customer_vouchers" DROP CONSTRAINT "FK_5d66d730e4a014373f201fe8a99"`);
        await queryRunner.query(`ALTER TABLE "vouchers" DROP CONSTRAINT "FK_820556fd3264ae9abfe7cbc0734"`);
        await queryRunner.query(`ALTER TABLE "pricing_configs" DROP CONSTRAINT "FK_664f4525629e6c2874ba6a36b15"`);
        await queryRunner.query(`ALTER TABLE "tasker_withdrawal_requests" DROP CONSTRAINT "FK_2af50fc317b474555af1647ba68"`);
        await queryRunner.query(`ALTER TABLE "pricing_configs" DROP CONSTRAINT "uq_pricing_service_duration"`);
        await queryRunner.query(`ALTER TABLE "peak_day_configs" DROP CONSTRAINT "chk_peak_day_range"`);
        await queryRunner.query(`DROP INDEX "public"."idx_peak_day_configs_range"`);
        await queryRunner.query(`DROP INDEX "public"."idx_st_status_priority_created"`);
        await queryRunner.query(`DROP INDEX "public"."idx_st_reporter"`);
        await queryRunner.query(`DROP INDEX "public"."idx_st_booking"`);
        await queryRunner.query(`DROP INDEX "public"."idx_st_assigned"`);
        await queryRunner.query(`DROP INDEX "public"."idx_vouchers_active_dates"`);
        await queryRunner.query(`DROP INDEX "public"."uq_voucher_code"`);
        await queryRunner.query(`DROP INDEX "public"."idx_services_is_active"`);
        await queryRunner.query(`CREATE TYPE "public"."cancelled_by_old" AS ENUM('CUSTOMER', 'TASKER', 'SYSTEM')`);
        await queryRunner.query(`ALTER TABLE "booking_status_logs" ALTER COLUMN "cancelled_by" TYPE "public"."cancelled_by_old" USING "cancelled_by"::"text"::"public"."cancelled_by_old"`);
        await queryRunner.query(`ALTER TABLE "bookings" ALTER COLUMN "cancelled_by" TYPE "public"."cancelled_by_old" USING "cancelled_by"::"text"::"public"."cancelled_by_old"`);
        await queryRunner.query(`DROP TYPE "public"."cancelled_by"`);
        await queryRunner.query(`ALTER TYPE "public"."cancelled_by_old" RENAME TO "cancelled_by"`);
        await queryRunner.query(`ALTER TABLE "peak_day_configs" ALTER COLUMN "peak_rate" SET DEFAULT 0.1`);
        await queryRunner.query(`COMMENT ON COLUMN "peak_day_configs"."peak_rate" IS NULL`);
        await queryRunner.query(`ALTER TABLE "peak_day_configs" ALTER COLUMN "peak_rate" TYPE numeric(5,4)`);
        await queryRunner.query(`ALTER TABLE "peak_day_configs" ALTER COLUMN "end_at" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "peak_day_configs" ALTER COLUMN "start_at" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "peak_day_configs" ALTER COLUMN "end_time" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "peak_day_configs" ALTER COLUMN "start_time" DROP NOT NULL`);
        await queryRunner.query(`CREATE TYPE "public"."support_ticket_status_old" AS ENUM('OPEN', 'IN_PROGRESS', 'CLOSED')`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ALTER COLUMN "status" TYPE "public"."support_ticket_status_old" USING "status"::"text"::"public"."support_ticket_status_old"`);
        await queryRunner.query(`ALTER TABLE "ticket_status_logs" ALTER COLUMN "old_status" TYPE "public"."support_ticket_status_old" USING "old_status"::"text"::"public"."support_ticket_status_old"`);
        await queryRunner.query(`ALTER TABLE "ticket_status_logs" ALTER COLUMN "new_status" TYPE "public"."support_ticket_status_old" USING "new_status"::"text"::"public"."support_ticket_status_old"`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ALTER COLUMN "status" SET DEFAULT 'OPEN'`);
        await queryRunner.query(`DROP TYPE "public"."support_ticket_status"`);
        await queryRunner.query(`ALTER TYPE "public"."support_ticket_status_old" RENAME TO "support_ticket_status"`);
        await queryRunner.query(`CREATE TYPE "public"."voucher_type_old" AS ENUM('PERCENT', 'FIXED')`);
        await queryRunner.query(`ALTER TABLE "vouchers" ALTER COLUMN "type" TYPE "public"."voucher_type_old" USING "type"::"text"::"public"."voucher_type_old"`);
        await queryRunner.query(`DROP TYPE "public"."vouchers_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."voucher_type_old" RENAME TO "voucher_type"`);
        await queryRunner.query(`ALTER TABLE "services" DROP COLUMN "coverage_area"`);
        await queryRunner.query(`ALTER TABLE "services" ADD "coverage_area" geometry(MULTIPOLYGON,4326)`);
        await queryRunner.query(`ALTER TABLE "pricing_configs" ALTER COLUMN "service_id" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "wallets" DROP CONSTRAINT IF EXISTS "chk_wallet_owner"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."uq_wallets_system"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_wallets_owner_type"`);
        await queryRunner.query(`CREATE TYPE "public"."wallet_owner_type_old" AS ENUM('CUSTOMER', 'TASKER', 'SYSTEM')`);
        await queryRunner.query(`ALTER TABLE "wallets" ALTER COLUMN "owner_type" TYPE "public"."wallet_owner_type_old" USING "owner_type"::"text"::"public"."wallet_owner_type_old"`);
        await queryRunner.query(`DROP TYPE "public"."wallets_owner_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."wallet_owner_type_old" RENAME TO "wallet_owner_type"`);
        await queryRunner.query(`CREATE INDEX "idx_wallets_owner_type" ON "wallets" ("owner_type")`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_wallets_system" ON "wallets" ("owner_type") WHERE "owner_type" = 'SYSTEM'`);
        await queryRunner.query(`
          ALTER TABLE "wallets"
          ADD CONSTRAINT "chk_wallet_owner"
          CHECK (
            ("owner_type" = 'CUSTOMER' AND "customer_id" IS NOT NULL AND "tasker_id" IS NULL)
            OR ("owner_type" = 'TASKER' AND "tasker_id" IS NOT NULL AND "customer_id" IS NULL)
            OR ("owner_type" = 'SYSTEM' AND "customer_id" IS NULL AND "tasker_id" IS NULL)
          )
        `);
        await queryRunner.query(`ALTER TABLE "support_tickets" DROP COLUMN "assigned_admin_id"`);
        await queryRunner.query(`ALTER TABLE "support_tickets" DROP COLUMN "counterparty_user_id"`);
        await queryRunner.query(`ALTER TABLE "support_tickets" DROP COLUMN "reporter_user_id"`);
        await queryRunner.query(`ALTER TABLE "support_tickets" DROP COLUMN "booking_id"`);
        await queryRunner.query(`ALTER TABLE "support_tickets" DROP COLUMN "incident_id"`);
        await queryRunner.query(`ALTER TABLE "support_tickets" DROP COLUMN "pending_reason"`);
        await queryRunner.query(`DROP TYPE "public"."ticket_pending_reason"`);
        await queryRunner.query(`ALTER TABLE "support_tickets" DROP COLUMN "sla_breached"`);
        await queryRunner.query(`ALTER TABLE "support_tickets" DROP COLUMN "sla_paused_accum_ms"`);
        await queryRunner.query(`ALTER TABLE "support_tickets" DROP COLUMN "sla_paused_at"`);
        await queryRunner.query(`ALTER TABLE "support_tickets" DROP COLUMN "closed_at"`);
        await queryRunner.query(`ALTER TABLE "support_tickets" DROP COLUMN "resolved_at"`);
        await queryRunner.query(`ALTER TABLE "support_tickets" DROP COLUMN "first_responded_at"`);
        await queryRunner.query(`ALTER TABLE "support_tickets" DROP COLUMN "resolution_due_at"`);
        await queryRunner.query(`ALTER TABLE "support_tickets" DROP COLUMN "first_response_due_at"`);
        await queryRunner.query(`ALTER TABLE "support_tickets" DROP COLUMN "source"`);
        await queryRunner.query(`DROP TYPE "public"."ticket_source"`);
        await queryRunner.query(`ALTER TABLE "support_tickets" DROP COLUMN "priority"`);
        await queryRunner.query(`DROP TYPE "public"."ticket_priority"`);
        await queryRunner.query(`ALTER TABLE "support_tickets" DROP COLUMN "subtype"`);
        await queryRunner.query(`ALTER TABLE "support_tickets" DROP COLUMN "category"`);
        await queryRunner.query(`DROP TYPE "public"."ticket_category"`);
        await queryRunner.query(`ALTER TABLE "support_tickets" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "support_tickets" DROP COLUMN "ticket_code"`);
        await queryRunner.query(`ALTER TABLE "pricing_configs" DROP COLUMN "duration_hours"`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ADD "overdue_at" TIMESTAMP`);
        await queryRunner.query(`DROP INDEX "public"."idx_ta_ticket"`);
        await queryRunner.query(`DROP TABLE "ticket_attachments"`);
        await queryRunner.query(`DROP INDEX "public"."idx_tm_ticket"`);
        await queryRunner.query(`DROP TABLE "ticket_messages"`);
        await queryRunner.query(`DROP INDEX "public"."idx_tr_ticket"`);
        await queryRunner.query(`DROP TABLE "ticket_resolutions"`);
        await queryRunner.query(`DROP TYPE "public"."resolution_type"`);
        await queryRunner.query(`DROP INDEX "public"."idx_tsl_ticket"`);
        await queryRunner.query(`DROP TABLE "ticket_status_logs"`);
        await queryRunner.query(`DROP TABLE "ticket_surveys"`);
        await queryRunner.query(`DROP INDEX "public"."idx_customer_vouchers_voucher_id"`);
        await queryRunner.query(`DROP TABLE "customer_vouchers"`);
        await queryRunner.query(`DROP INDEX "public"."idx_tasker_withdrawal_status"`);
        await queryRunner.query(`DROP INDEX "public"."idx_tasker_withdrawal_wallet_id"`);
        await queryRunner.query(`DROP INDEX "public"."idx_tasker_withdrawal_tasker_id"`);
        await queryRunner.query(`DROP TABLE "tasker_withdrawal_requests"`);
        await queryRunner.query(`DROP TYPE "public"."tasker_withdrawal_requests_status_enum"`);
        await queryRunner.query(`ALTER TABLE "vouchers" ADD CONSTRAINT "FK_820556fd3264ae9abfe7cbc0734" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "pricing_configs" ADD CONSTRAINT "FK_664f4525629e6c2874ba6a36b15" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

}
