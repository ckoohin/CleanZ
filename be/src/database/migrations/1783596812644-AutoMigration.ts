import { MigrationInterface, QueryRunner } from 'typeorm';

export class AutoMigration1783596812644 implements MigrationInterface {
  name = 'AutoMigration1783596812644';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasBaselineIncidentDecisionSchema =
      (await queryRunner.hasTable('notification_outbox')) &&
      (await queryRunner.hasTable('incident_decision_responses')) &&
      (await queryRunner.hasColumn('incidents', 'decision_status'));

    if (hasBaselineIncidentDecisionSchema) {
      return;
    }

    await queryRunner.query(
      `ALTER TABLE "customer_withdrawal_requests" DROP CONSTRAINT "FK_cwr_customer"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_withdrawal_requests" DROP CONSTRAINT "FK_cwr_wallet"`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_addons" DROP CONSTRAINT "FK_booking_addons_addon"`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_addons" DROP CONSTRAINT "FK_booking_addons_booking"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notification_outbox_status" AS ENUM('PENDING', 'SENT', 'FAILED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "notification_outbox" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "event_type" character varying(80) NOT NULL, "ref_type" character varying(40) NOT NULL, "ref_id" uuid NOT NULL, "decision_version" integer, "payload" jsonb NOT NULL, "dedupe_key" character varying(180) NOT NULL, "status" "public"."notification_outbox_status" NOT NULL DEFAULT 'PENDING', "retry_count" integer NOT NULL DEFAULT '0', "next_retry_at" TIMESTAMP, "sent_at" TIMESTAMP, "last_error" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "recipient_user_id" uuid NOT NULL, CONSTRAINT "PK_83d47c7dba1da2d038749fe757e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_notification_outbox_dedupe_key" ON "notification_outbox" ("dedupe_key") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_notification_outbox_ref" ON "notification_outbox" ("ref_type", "ref_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_notification_outbox_status_retry" ON "notification_outbox" ("status", "next_retry_at") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."incident_decision_response_type" AS ENUM('AGREE', 'DISAGREE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."incident_decision_response_review_result" AS ENUM('KEEP_DECISION', 'REVISE_DECISION')`,
    );
    await queryRunner.query(
      `CREATE TABLE "incident_decision_responses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "decision_version" integer NOT NULL, "response_type" "public"."incident_decision_response_type" NOT NULL, "content" text, "response_revision" integer NOT NULL DEFAULT '1', "submitted_at" TIMESTAMP NOT NULL DEFAULT now(), "reviewed_at" TIMESTAMP, "review_result" "public"."incident_decision_response_review_result", "admin_review_note" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "incident_id" uuid NOT NULL, "tasker_id" uuid NOT NULL, "reviewed_by_admin_id" uuid, CONSTRAINT "PK_7d81a6e732cfe8c65c27f6a2260" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_idr_incident_version_tasker" ON "incident_decision_responses" ("incident_id", "decision_version", "tasker_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_idr_incident_version" ON "incident_decision_responses" ("incident_id", "decision_version") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."incident_damage_item_verification_status" AS ENUM('PENDING', 'VERIFIED', 'REJECTED', 'NEED_MORE_EVIDENCE')`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_damage_items" ADD "verification_status" "public"."incident_damage_item_verification_status" NOT NULL DEFAULT 'PENDING'`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_evidences" ADD "storage_public_id" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_evidences" ADD "purpose" "public"."incident_evidence_purpose"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_evidences" ADD "decision_version" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_evidences" ADD "visibility" character varying(30) NOT NULL DEFAULT 'INCIDENT_PARTIES'`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_evidences" ADD "is_soft_deleted" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_evidences" ADD "soft_deleted_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_evidences" ADD "is_active_for_response" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_evidences" ADD "decision_response_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_evidences" ADD "soft_deleted_by_user_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_evidences" ADD "replaced_by_evidence_id" uuid`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."incident_decision_status" AS ENUM('NONE', 'DRAFT', 'PENDING_TASKER_RESPONSE', 'PENDING_ADMIN_APPROVAL', 'FINAL')`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ADD "decision_status" "public"."incident_decision_status" NOT NULL DEFAULT 'NONE'`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ADD "decision_version" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."incident_response_window_status" AS ENUM('NONE', 'OPEN', 'RESPONDED', 'EXPIRED', 'REVIEWED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ADD "response_window_status" "public"."incident_response_window_status" NOT NULL DEFAULT 'NONE'`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ADD "tasker_response_deadline" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ADD "tasker_response_reviewed_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ADD "tasker_response_extended_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."incident_responsibility_party" AS ENUM('TASKER', 'PLATFORM', 'SHARED', 'UNDETERMINED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ADD "responsibility_party" "public"."incident_responsibility_party"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ADD "responsibility_reason" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ADD "responsibility_decided_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ADD "internal_decision_note" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ADD "tasker_decision_reason" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ADD "customer_decision_summary" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ADD "deposit_balance_snapshot" numeric(12,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ADD "recoverable_from_deposit_amount" numeric(12,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ADD "uncovered_liability_amount" numeric(12,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ADD "second_approval_note" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ADD "second_approval_requested_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ADD "second_approval_due_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ADD "second_approved_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ADD "finalized_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ADD "policy_version" character varying(80)`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ADD "dual_approval_threshold_snapshot" numeric(12,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ADD "policy_cap_snapshot" numeric(12,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ADD "response_window_hours_snapshot" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ADD "severity_rule_snapshot" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ADD "responsibility_decided_by_admin_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ADD "decided_by_admin_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ADD "second_approved_by_admin_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ADD "finalized_by_admin_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_peak_hours" ALTER COLUMN "title" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."customer_withdrawal_requests_status_enum" RENAME TO "customer_withdrawal_requests_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."customer_withdrawal_requests_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'PROCESSED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_withdrawal_requests" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_withdrawal_requests" ALTER COLUMN "status" TYPE "public"."customer_withdrawal_requests_status_enum" USING "status"::"text"::"public"."customer_withdrawal_requests_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_withdrawal_requests" ALTER COLUMN "status" SET DEFAULT 'PENDING'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."customer_withdrawal_requests_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_withdrawal_requests" ADD CONSTRAINT "FK_e7e7121087760f30efc393f9df1" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_withdrawal_requests" ADD CONSTRAINT "FK_3024dfeca00b44594326394da7a" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_outbox" ADD CONSTRAINT "FK_a6802aba2db87fc757a8abe42a1" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_evidences" ADD CONSTRAINT "FK_1aedb2f8480dd9b424b7951eb81" FOREIGN KEY ("decision_response_id") REFERENCES "incident_decision_responses"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_evidences" ADD CONSTRAINT "FK_d03b1007ea7af65daac9d41b38b" FOREIGN KEY ("soft_deleted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_evidences" ADD CONSTRAINT "FK_4d5444d086c8dabc01afee9294c" FOREIGN KEY ("replaced_by_evidence_id") REFERENCES "incident_evidences"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_decision_responses" ADD CONSTRAINT "FK_fb5240bb2794544b8f4511ce67d" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_decision_responses" ADD CONSTRAINT "FK_6eaa00e91c7bb05bb854ae7d03d" FOREIGN KEY ("tasker_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_decision_responses" ADD CONSTRAINT "FK_0943c1e26b5ca0932e0b8a1bcc5" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ADD CONSTRAINT "FK_a5aebd24ab94f94e37ca051da52" FOREIGN KEY ("responsibility_decided_by_admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ADD CONSTRAINT "FK_f1e946da91aba411b08ea72a779" FOREIGN KEY ("decided_by_admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ADD CONSTRAINT "FK_be8206e2cc1a8906845253de32e" FOREIGN KEY ("second_approved_by_admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ADD CONSTRAINT "FK_bcef0f4101402226bfcae201177" FOREIGN KEY ("finalized_by_admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_addons" ADD CONSTRAINT "FK_d8a83c1d8844dc9ed046cd5214f" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_addons" ADD CONSTRAINT "FK_d91a378bc0dd2eef1aab443d512" FOREIGN KEY ("addon_id") REFERENCES "service_addons"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "booking_addons" DROP CONSTRAINT "FK_d91a378bc0dd2eef1aab443d512"`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_addons" DROP CONSTRAINT "FK_d8a83c1d8844dc9ed046cd5214f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP CONSTRAINT "FK_bcef0f4101402226bfcae201177"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP CONSTRAINT "FK_be8206e2cc1a8906845253de32e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP CONSTRAINT "FK_f1e946da91aba411b08ea72a779"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP CONSTRAINT "FK_a5aebd24ab94f94e37ca051da52"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_decision_responses" DROP CONSTRAINT "FK_0943c1e26b5ca0932e0b8a1bcc5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_decision_responses" DROP CONSTRAINT "FK_6eaa00e91c7bb05bb854ae7d03d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_decision_responses" DROP CONSTRAINT "FK_fb5240bb2794544b8f4511ce67d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_evidences" DROP CONSTRAINT "FK_4d5444d086c8dabc01afee9294c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_evidences" DROP CONSTRAINT "FK_d03b1007ea7af65daac9d41b38b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_evidences" DROP CONSTRAINT "FK_1aedb2f8480dd9b424b7951eb81"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_outbox" DROP CONSTRAINT "FK_a6802aba2db87fc757a8abe42a1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_withdrawal_requests" DROP CONSTRAINT "FK_3024dfeca00b44594326394da7a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_withdrawal_requests" DROP CONSTRAINT "FK_e7e7121087760f30efc393f9df1"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."customer_withdrawal_requests_status_enum_old" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'PROCESSED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_withdrawal_requests" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_withdrawal_requests" ALTER COLUMN "status" TYPE "public"."customer_withdrawal_requests_status_enum_old" USING "status"::"text"::"public"."customer_withdrawal_requests_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_withdrawal_requests" ALTER COLUMN "status" SET DEFAULT 'PENDING'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."customer_withdrawal_requests_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."customer_withdrawal_requests_status_enum_old" RENAME TO "customer_withdrawal_requests_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_peak_hours" ALTER COLUMN "title" SET DEFAULT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP COLUMN "finalized_by_admin_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP COLUMN "second_approved_by_admin_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP COLUMN "decided_by_admin_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP COLUMN "responsibility_decided_by_admin_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP COLUMN "severity_rule_snapshot"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP COLUMN "response_window_hours_snapshot"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP COLUMN "policy_cap_snapshot"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP COLUMN "dual_approval_threshold_snapshot"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP COLUMN "policy_version"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP COLUMN "finalized_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP COLUMN "second_approved_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP COLUMN "second_approval_due_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP COLUMN "second_approval_requested_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP COLUMN "second_approval_note"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP COLUMN "uncovered_liability_amount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP COLUMN "recoverable_from_deposit_amount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP COLUMN "deposit_balance_snapshot"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP COLUMN "customer_decision_summary"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP COLUMN "tasker_decision_reason"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP COLUMN "internal_decision_note"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP COLUMN "responsibility_decided_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP COLUMN "responsibility_reason"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP COLUMN "responsibility_party"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."incident_responsibility_party"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP COLUMN "tasker_response_extended_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP COLUMN "tasker_response_reviewed_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP COLUMN "tasker_response_deadline"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP COLUMN "response_window_status"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."incident_response_window_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP COLUMN "decision_version"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP COLUMN "decision_status"`,
    );
    await queryRunner.query(`DROP TYPE "public"."incident_decision_status"`);
    await queryRunner.query(
      `ALTER TABLE "incident_evidences" DROP COLUMN "replaced_by_evidence_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_evidences" DROP COLUMN "soft_deleted_by_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_evidences" DROP COLUMN "decision_response_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_evidences" DROP COLUMN "is_active_for_response"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_evidences" DROP COLUMN "soft_deleted_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_evidences" DROP COLUMN "is_soft_deleted"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_evidences" DROP COLUMN "visibility"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_evidences" DROP COLUMN "decision_version"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_evidences" DROP COLUMN "purpose"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_evidences" DROP COLUMN "storage_public_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_damage_items" DROP COLUMN "verification_status"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."incident_damage_item_verification_status"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_idr_incident_version"`);
    await queryRunner.query(
      `DROP INDEX "public"."uq_idr_incident_version_tasker"`,
    );
    await queryRunner.query(`DROP TABLE "incident_decision_responses"`);
    await queryRunner.query(
      `DROP TYPE "public"."incident_decision_response_review_result"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."incident_decision_response_type"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_notification_outbox_status_retry"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_notification_outbox_ref"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."uq_notification_outbox_dedupe_key"`,
    );
    await queryRunner.query(`DROP TABLE "notification_outbox"`);
    await queryRunner.query(`DROP TYPE "public"."notification_outbox_status"`);
    await queryRunner.query(
      `ALTER TABLE "booking_addons" ADD CONSTRAINT "FK_booking_addons_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_addons" ADD CONSTRAINT "FK_booking_addons_addon" FOREIGN KEY ("addon_id") REFERENCES "service_addons"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_withdrawal_requests" ADD CONSTRAINT "FK_cwr_wallet" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_withdrawal_requests" ADD CONSTRAINT "FK_cwr_customer" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }
}
