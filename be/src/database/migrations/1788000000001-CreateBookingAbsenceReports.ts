import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBookingAbsenceReports1788000000001 implements MigrationInterface {
  name = 'CreateBookingAbsenceReports1788000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "booking_absence_reports" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "booking_id" uuid NOT NULL
          REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "tasker_id" uuid NOT NULL
          REFERENCES "taskers"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        "customer_id" uuid
          REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "is_guest" boolean NOT NULL DEFAULT false,
        "status" "booking_absence_report_status" NOT NULL DEFAULT 'PENDING_REVIEW',
        "review_due_at" timestamp NOT NULL,
        "proof_photo_url" text NOT NULL,
        "tasker_note" text,
        "reported_at" timestamp NOT NULL,
        "waited_minutes" integer NOT NULL,
        "compensation_amount" numeric(12,2) NOT NULL,
        "subtotal_snapshot" numeric(12,2) NOT NULL,
        "policy_snapshot" jsonb NOT NULL,
        "checkin_distance_meters" numeric(10,2),
        "checkin_far" boolean NOT NULL DEFAULT false,
        "reviewed_by_admin_id" uuid
          REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "reviewed_at" timestamp,
        "review_reason" text,
        "refunded_upfront" numeric(12,2) NOT NULL DEFAULT 0,
        "debt_recovered_upfront" numeric(12,2) NOT NULL DEFAULT 0,
        "held_for_review" numeric(12,2) NOT NULL DEFAULT 0,
        "paid_from_escrow" numeric(12,2) NOT NULL DEFAULT 0,
        "paid_from_customer_wallet" numeric(12,2) NOT NULL DEFAULT 0,
        "advanced_by_platform" numeric(12,2) NOT NULL DEFAULT 0,
        "platform_borne_amount" numeric(12,2) NOT NULL DEFAULT 0,
        "refunded_on_close" numeric(12,2) NOT NULL DEFAULT 0,
        "debt_recovered_on_close" numeric(12,2) NOT NULL DEFAULT 0,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_booking_absence_status_due"
        ON "booking_absence_reports" ("status", "review_due_at")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_booking_absence_customer_status"
        ON "booking_absence_reports" ("customer_id", "status")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_booking_absence_pending"
        ON "booking_absence_reports" ("booking_id")
        WHERE "status" = 'PENDING_REVIEW'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "booking_absence_reports"`);
  }
}
