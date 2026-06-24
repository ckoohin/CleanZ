import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Bổ sung 2 bảng còn thiếu (drift) — additive + idempotent:
 *  - tasker_deposit_transactions (+ enum type, index, FK)
 *  - policies (+ enum role)
 */
export class AddPoliciesAndDepositTxn1782050000000 implements MigrationInterface {
  name = 'AddPoliciesAndDepositTxn1782050000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ── tasker_deposit_transactions ─────────────────────────────────────────
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "public"."tasker_deposit_transaction_type" AS ENUM('CASH_COMMISSION_DEDUCT', 'INCIDENT_COMPENSATION_DEDUCT', 'TOP_UP', 'TERMINATION_REFUND'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "tasker_deposit_transactions" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "type" "public"."tasker_deposit_transaction_type" NOT NULL,
      "amount" numeric(12,2) NOT NULL,
      "balance_before" numeric(12,2) NOT NULL,
      "balance_after" numeric(12,2) NOT NULL,
      "description" text,
      "created_at" TIMESTAMP NOT NULL DEFAULT now(),
      "tasker_id" uuid,
      "booking_id" uuid,
      CONSTRAINT "PK_92e3d909cd0db990f74a43c1dac" PRIMARY KEY ("id"),
      CONSTRAINT "FK_tdt_tasker" FOREIGN KEY ("tasker_id")
        REFERENCES "taskers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "FK_tdt_booking" FOREIGN KEY ("booking_id")
        REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE
    )`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_tasker_deposit_transactions_booking" ON "tasker_deposit_transactions" ("booking_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_tasker_deposit_transactions_tasker" ON "tasker_deposit_transactions" ("tasker_id")`,
    );

    // ── policies ────────────────────────────────────────────────────────────
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "public"."policies_role_enum" AS ENUM('CUSTOMER', 'TASKER', 'ALL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "policies" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "title" character varying(255) NOT NULL,
      "slug" character varying NOT NULL,
      "content" text NOT NULL,
      "role" "public"."policies_role_enum" NOT NULL DEFAULT 'ALL',
      "isActive" boolean NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_policies_slug" UNIQUE ("slug"),
      CONSTRAINT "PK_603e09f183df0108d8695c57e28" PRIMARY KEY ("id")
    )`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "policies"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."policies_role_enum"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "tasker_deposit_transactions"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."tasker_deposit_transaction_type"`,
    );
  }
}
