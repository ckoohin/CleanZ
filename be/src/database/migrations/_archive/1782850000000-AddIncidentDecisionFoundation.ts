import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIncidentDecisionFoundation1782850000000 implements MigrationInterface {
  name = 'AddIncidentDecisionFoundation1782850000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await this.createEnum(queryRunner, 'incident_decision_status', [
      'NONE',
      'DRAFT',
      'PENDING_TASKER_RESPONSE',
      'PENDING_ADMIN_APPROVAL',
      'FINAL',
    ]);
    await this.createEnum(queryRunner, 'incident_responsibility_party', [
      'TASKER',
      'PLATFORM',
      'SHARED',
      'UNDETERMINED',
    ]);
    await this.createEnum(queryRunner, 'incident_response_window_status', [
      'NONE',
      'OPEN',
      'RESPONDED',
      'EXPIRED',
      'REVIEWED',
    ]);
    await this.createEnum(queryRunner, 'incident_decision_response_type', [
      'AGREE',
      'DISAGREE',
    ]);
    await this.createEnum(
      queryRunner,
      'incident_decision_response_review_result',
      ['KEEP_DECISION', 'REVISE_DECISION'],
    );
    await this.createEnum(queryRunner, 'incident_evidence_purpose', [
      'DAMAGE_PHOTO',
      'BEFORE_PHOTO',
      'PURCHASE_RECEIPT',
      'REPAIR_QUOTE',
      'TASKER_STATEMENT',
      'DECISION_RESPONSE',
      'OTHER',
    ]);
    await this.createEnum(queryRunner, 'notification_outbox_status', [
      'PENDING',
      'SENT',
      'FAILED',
    ]);

    await queryRunner.query(`
      ALTER TABLE "incidents"
        ADD COLUMN IF NOT EXISTS "decision_status" "incident_decision_status" NOT NULL DEFAULT 'NONE',
        ADD COLUMN IF NOT EXISTS "decision_version" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "response_window_status" "incident_response_window_status" NOT NULL DEFAULT 'NONE',
        ADD COLUMN IF NOT EXISTS "tasker_response_deadline" timestamp,
        ADD COLUMN IF NOT EXISTS "tasker_response_reviewed_at" timestamp,
        ADD COLUMN IF NOT EXISTS "responsibility_party" "incident_responsibility_party",
        ADD COLUMN IF NOT EXISTS "responsibility_reason" text,
        ADD COLUMN IF NOT EXISTS "responsibility_decided_by_admin_id" uuid,
        ADD COLUMN IF NOT EXISTS "responsibility_decided_at" timestamp,
        ADD COLUMN IF NOT EXISTS "internal_decision_note" text,
        ADD COLUMN IF NOT EXISTS "tasker_decision_reason" text,
        ADD COLUMN IF NOT EXISTS "customer_decision_summary" text,
        ADD COLUMN IF NOT EXISTS "deposit_balance_snapshot" numeric(12,2),
        ADD COLUMN IF NOT EXISTS "recoverable_from_deposit_amount" numeric(12,2),
        ADD COLUMN IF NOT EXISTS "uncovered_liability_amount" numeric(12,2),
        ADD COLUMN IF NOT EXISTS "decided_by_admin_id" uuid,
        ADD COLUMN IF NOT EXISTS "second_approval_note" text,
        ADD COLUMN IF NOT EXISTS "second_approval_requested_at" timestamp,
        ADD COLUMN IF NOT EXISTS "second_approval_due_at" timestamp,
        ADD COLUMN IF NOT EXISTS "second_approved_by_admin_id" uuid,
        ADD COLUMN IF NOT EXISTS "second_approved_at" timestamp,
        ADD COLUMN IF NOT EXISTS "finalized_by_admin_id" uuid,
        ADD COLUMN IF NOT EXISTS "finalized_at" timestamp,
        ADD COLUMN IF NOT EXISTS "policy_version" character varying(80),
        ADD COLUMN IF NOT EXISTS "dual_approval_threshold_snapshot" numeric(12,2),
        ADD COLUMN IF NOT EXISTS "policy_cap_snapshot" numeric(12,2),
        ADD COLUMN IF NOT EXISTS "response_window_hours_snapshot" integer,
        ADD COLUMN IF NOT EXISTS "severity_rule_snapshot" jsonb
    `);

    await this.addForeignKey(
      queryRunner,
      'incidents',
      'fk_incidents_responsibility_admin',
      'responsibility_decided_by_admin_id',
      'users',
      'id',
    );
    await this.addForeignKey(
      queryRunner,
      'incidents',
      'fk_incidents_decided_by_admin',
      'decided_by_admin_id',
      'users',
      'id',
    );
    await this.addForeignKey(
      queryRunner,
      'incidents',
      'fk_incidents_second_approved_by_admin',
      'second_approved_by_admin_id',
      'users',
      'id',
    );
    await this.addForeignKey(
      queryRunner,
      'incidents',
      'fk_incidents_finalized_by_admin',
      'finalized_by_admin_id',
      'users',
      'id',
    );

    await queryRunner.query(`
      UPDATE "incidents"
      SET "decision_status" = 'FINAL'
      WHERE "status" IN ('APPROVED', 'REJECTED', 'COMPENSATED', 'CLOSED')
        AND "decision_status" = 'NONE'
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "incident_decision_responses" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "incident_id" uuid NOT NULL,
        "decision_version" integer NOT NULL,
        "tasker_id" uuid NOT NULL,
        "response_type" "incident_decision_response_type" NOT NULL,
        "content" text,
        "response_revision" integer NOT NULL DEFAULT 1,
        "submitted_at" timestamp NOT NULL DEFAULT now(),
        "reviewed_by_admin_id" uuid,
        "reviewed_at" timestamp,
        "review_result" "incident_decision_response_review_result",
        "admin_review_note" text,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "pk_incident_decision_responses" PRIMARY KEY ("id"),
        CONSTRAINT "uq_idr_incident_version_tasker" UNIQUE ("incident_id", "decision_version", "tasker_id")
      )
    `);
    await this.addForeignKey(
      queryRunner,
      'incident_decision_responses',
      'fk_idr_incident',
      'incident_id',
      'incidents',
      'id',
      'CASCADE',
    );
    await this.addForeignKey(
      queryRunner,
      'incident_decision_responses',
      'fk_idr_tasker',
      'tasker_id',
      'users',
      'id',
      'CASCADE',
    );
    await this.addForeignKey(
      queryRunner,
      'incident_decision_responses',
      'fk_idr_reviewed_by_admin',
      'reviewed_by_admin_id',
      'users',
      'id',
    );

    await queryRunner.query(`
      ALTER TABLE "incident_evidences"
        ADD COLUMN IF NOT EXISTS "storage_public_id" text,
        ADD COLUMN IF NOT EXISTS "purpose" "incident_evidence_purpose",
        ADD COLUMN IF NOT EXISTS "decision_version" integer,
        ADD COLUMN IF NOT EXISTS "decision_response_id" uuid,
        ADD COLUMN IF NOT EXISTS "visibility" character varying(30) NOT NULL DEFAULT 'INCIDENT_PARTIES',
        ADD COLUMN IF NOT EXISTS "is_soft_deleted" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "soft_deleted_at" timestamp,
        ADD COLUMN IF NOT EXISTS "soft_deleted_by_user_id" uuid,
        ADD COLUMN IF NOT EXISTS "is_active_for_response" boolean NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS "replaced_by_evidence_id" uuid
    `);
    await this.addForeignKey(
      queryRunner,
      'incident_evidences',
      'fk_ie_decision_response',
      'decision_response_id',
      'incident_decision_responses',
      'id',
    );
    await this.addForeignKey(
      queryRunner,
      'incident_evidences',
      'fk_ie_soft_deleted_by_user',
      'soft_deleted_by_user_id',
      'users',
      'id',
    );
    await this.addForeignKey(
      queryRunner,
      'incident_evidences',
      'fk_ie_replaced_by_evidence',
      'replaced_by_evidence_id',
      'incident_evidences',
      'id',
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notification_outbox" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "event_type" character varying(80) NOT NULL,
        "ref_type" character varying(40) NOT NULL,
        "ref_id" uuid NOT NULL,
        "recipient_user_id" uuid NOT NULL,
        "decision_version" integer,
        "payload" jsonb NOT NULL,
        "dedupe_key" character varying(180) NOT NULL,
        "status" "notification_outbox_status" NOT NULL DEFAULT 'PENDING',
        "retry_count" integer NOT NULL DEFAULT 0,
        "next_retry_at" timestamp,
        "sent_at" timestamp,
        "last_error" text,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "pk_notification_outbox" PRIMARY KEY ("id"),
        CONSTRAINT "uq_notification_outbox_dedupe_key" UNIQUE ("dedupe_key")
      )
    `);
    await this.addForeignKey(
      queryRunner,
      'notification_outbox',
      'fk_notification_outbox_recipient',
      'recipient_user_id',
      'users',
      'id',
      'CASCADE',
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_incidents_decision_status" ON "incidents" ("decision_status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_incidents_tasker_response_deadline" ON "incidents" ("tasker_response_deadline")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_incidents_responsibility_party" ON "incidents" ("responsibility_party")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_idr_incident_version" ON "incident_decision_responses" ("incident_id", "decision_version")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_ie_decision_response" ON "incident_evidences" ("decision_response_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_ie_purpose_version" ON "incident_evidences" ("purpose", "decision_version")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_notification_outbox_status_retry" ON "notification_outbox" ("status", "next_retry_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_notification_outbox_ref" ON "notification_outbox" ("ref_type", "ref_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_notification_outbox_ref"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_notification_outbox_status_retry"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_ie_purpose_version"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_ie_decision_response"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_idr_incident_version"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_incidents_responsibility_party"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_incidents_tasker_response_deadline"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_incidents_decision_status"`,
    );

    await this.dropForeignKey(
      queryRunner,
      'notification_outbox',
      'fk_notification_outbox_recipient',
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_outbox"`);

    await this.dropForeignKey(
      queryRunner,
      'incident_evidences',
      'fk_ie_replaced_by_evidence',
    );
    await this.dropForeignKey(
      queryRunner,
      'incident_evidences',
      'fk_ie_soft_deleted_by_user',
    );
    await this.dropForeignKey(
      queryRunner,
      'incident_evidences',
      'fk_ie_decision_response',
    );
    await queryRunner.query(`
      ALTER TABLE "incident_evidences"
        DROP COLUMN IF EXISTS "replaced_by_evidence_id",
        DROP COLUMN IF EXISTS "is_active_for_response",
        DROP COLUMN IF EXISTS "soft_deleted_by_user_id",
        DROP COLUMN IF EXISTS "soft_deleted_at",
        DROP COLUMN IF EXISTS "is_soft_deleted",
        DROP COLUMN IF EXISTS "visibility",
        DROP COLUMN IF EXISTS "decision_response_id",
        DROP COLUMN IF EXISTS "decision_version",
        DROP COLUMN IF EXISTS "purpose",
        DROP COLUMN IF EXISTS "storage_public_id"
    `);

    await this.dropForeignKey(
      queryRunner,
      'incident_decision_responses',
      'fk_idr_reviewed_by_admin',
    );
    await this.dropForeignKey(
      queryRunner,
      'incident_decision_responses',
      'fk_idr_tasker',
    );
    await this.dropForeignKey(
      queryRunner,
      'incident_decision_responses',
      'fk_idr_incident',
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "incident_decision_responses"`,
    );

    await this.dropForeignKey(
      queryRunner,
      'incidents',
      'fk_incidents_finalized_by_admin',
    );
    await this.dropForeignKey(
      queryRunner,
      'incidents',
      'fk_incidents_second_approved_by_admin',
    );
    await this.dropForeignKey(
      queryRunner,
      'incidents',
      'fk_incidents_decided_by_admin',
    );
    await this.dropForeignKey(
      queryRunner,
      'incidents',
      'fk_incidents_responsibility_admin',
    );
    await queryRunner.query(`
      ALTER TABLE "incidents"
        DROP COLUMN IF EXISTS "severity_rule_snapshot",
        DROP COLUMN IF EXISTS "response_window_hours_snapshot",
        DROP COLUMN IF EXISTS "policy_cap_snapshot",
        DROP COLUMN IF EXISTS "dual_approval_threshold_snapshot",
        DROP COLUMN IF EXISTS "policy_version",
        DROP COLUMN IF EXISTS "finalized_at",
        DROP COLUMN IF EXISTS "finalized_by_admin_id",
        DROP COLUMN IF EXISTS "second_approved_at",
        DROP COLUMN IF EXISTS "second_approved_by_admin_id",
        DROP COLUMN IF EXISTS "second_approval_due_at",
        DROP COLUMN IF EXISTS "second_approval_requested_at",
        DROP COLUMN IF EXISTS "second_approval_note",
        DROP COLUMN IF EXISTS "decided_by_admin_id",
        DROP COLUMN IF EXISTS "uncovered_liability_amount",
        DROP COLUMN IF EXISTS "recoverable_from_deposit_amount",
        DROP COLUMN IF EXISTS "deposit_balance_snapshot",
        DROP COLUMN IF EXISTS "customer_decision_summary",
        DROP COLUMN IF EXISTS "tasker_decision_reason",
        DROP COLUMN IF EXISTS "internal_decision_note",
        DROP COLUMN IF EXISTS "responsibility_decided_at",
        DROP COLUMN IF EXISTS "responsibility_decided_by_admin_id",
        DROP COLUMN IF EXISTS "responsibility_reason",
        DROP COLUMN IF EXISTS "responsibility_party",
        DROP COLUMN IF EXISTS "tasker_response_reviewed_at",
        DROP COLUMN IF EXISTS "tasker_response_deadline",
        DROP COLUMN IF EXISTS "response_window_status",
        DROP COLUMN IF EXISTS "decision_version",
        DROP COLUMN IF EXISTS "decision_status"
    `);

    await this.dropEnum(queryRunner, 'notification_outbox_status');
    await this.dropEnum(queryRunner, 'incident_evidence_purpose');
    await this.dropEnum(
      queryRunner,
      'incident_decision_response_review_result',
    );
    await this.dropEnum(queryRunner, 'incident_decision_response_type');
    await this.dropEnum(queryRunner, 'incident_response_window_status');
    await this.dropEnum(queryRunner, 'incident_responsibility_party');
    await this.dropEnum(queryRunner, 'incident_decision_status');
  }

  private async createEnum(
    queryRunner: QueryRunner,
    enumName: string,
    values: string[],
  ): Promise<void> {
    const escapedValues = values.map((value) => `'${value}'`).join(', ');
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${enumName}') THEN
          CREATE TYPE "${enumName}" AS ENUM (${escapedValues});
        END IF;
      END
      $$;
    `);
  }

  private async dropEnum(
    queryRunner: QueryRunner,
    enumName: string,
  ): Promise<void> {
    await queryRunner.query(`DROP TYPE IF EXISTS "${enumName}"`);
  }

  private async addForeignKey(
    queryRunner: QueryRunner,
    tableName: string,
    constraintName: string,
    columnName: string,
    referencedTable: string,
    referencedColumn: string,
    onDelete = 'SET NULL',
  ): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = '${constraintName}'
        ) THEN
          ALTER TABLE "${tableName}"
          ADD CONSTRAINT "${constraintName}"
          FOREIGN KEY ("${columnName}")
          REFERENCES "${referencedTable}"("${referencedColumn}")
          ON DELETE ${onDelete}
          ON UPDATE CASCADE;
        END IF;
      END
      $$;
    `);
  }

  private async dropForeignKey(
    queryRunner: QueryRunner,
    tableName: string,
    constraintName: string,
  ): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "${tableName}"
      DROP CONSTRAINT IF EXISTS "${constraintName}"
    `);
  }
}
