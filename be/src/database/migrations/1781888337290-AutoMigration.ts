import { MigrationInterface, QueryRunner } from 'typeorm';

export class AutoMigration1781888337290 implements MigrationInterface {
  name = 'AutoMigration1781888337290';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "incident_damage_items" DROP CONSTRAINT "incident_damage_items_incident_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP CONSTRAINT "fk_inc_booking"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP CONSTRAINT "fk_inc_checker"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP CONSTRAINT "fk_inc_customer"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP CONSTRAINT "fk_inc_investigator"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP CONSTRAINT "fk_inc_tasker"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_status_logs" DROP CONSTRAINT "incident_status_logs_changed_by_user_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_status_logs" DROP CONSTRAINT "incident_status_logs_incident_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_statements" DROP CONSTRAINT "incident_statements_incident_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_statements" DROP CONSTRAINT "incident_statements_submitted_by_user_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_evidences" DROP CONSTRAINT "fk_ie_damage_item"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_evidences" DROP CONSTRAINT "fk_ie_uploaded_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_evidences" DROP CONSTRAINT "incident_evidences_incident_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_incident_strikes" DROP CONSTRAINT "customer_incident_strikes_customer_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_incident_strikes" DROP CONSTRAINT "customer_incident_strikes_incident_id_fkey"`,
    );
    await queryRunner.query(`DROP INDEX "public"."uq_incidents_code"`);
    await queryRunner.query(`DROP INDEX "public"."uq_inc_active_per_booking"`);
    await queryRunner.query(`DROP INDEX "public"."idx_inc_customer"`);
    await queryRunner.query(`DROP INDEX "public"."idx_inc_tasker"`);
    await queryRunner.query(
      `ALTER TABLE "incident_damage_items" DROP CONSTRAINT "chk_idi_claimed_pos"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_damage_items" DROP CONSTRAINT "chk_idi_verified_nonneg"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_damage_items" DROP CONSTRAINT "chk_idi_approved_nonneg"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP CONSTRAINT "chk_inc_borne_nonneg"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP CONSTRAINT "chk_inc_comp_source"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_evidences" DROP CONSTRAINT "chk_ie_file_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_damage_items" ALTER COLUMN "created_at" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_damage_items" ALTER COLUMN "updated_at" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_damage_items" ALTER COLUMN "incident_id" DROP NOT NULL`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_inc_severity_created"`);
    await queryRunner.query(`DROP INDEX "public"."idx_inc_status_comp"`);
    await queryRunner.query(
      `ALTER TABLE "incidents" ALTER COLUMN "description" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ALTER COLUMN "severity" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ALTER COLUMN "compensation_status" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ALTER COLUMN "reported_at" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ALTER COLUMN "reported_at" SET DEFAULT now()`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_isl_incident"`);
    await queryRunner.query(
      `ALTER TABLE "incident_status_logs" ALTER COLUMN "created_at" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_status_logs" ALTER COLUMN "incident_id" DROP NOT NULL`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_ist_incident"`);
    await queryRunner.query(
      `ALTER TABLE "incident_statements" ALTER COLUMN "created_at" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_statements" ALTER COLUMN "incident_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_evidences" ALTER COLUMN "created_at" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_incident_strikes" ALTER COLUMN "created_at" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_incident_strikes" ALTER COLUMN "customer_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_inc_severity_created" ON "incidents" ("severity", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_inc_status_comp" ON "incidents" ("status", "compensation_status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_isl_incident" ON "incident_status_logs" ("incident_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_ist_incident" ON "incident_statements" ("incident_id", "created_at") `,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_damage_items" ADD CONSTRAINT "FK_96f01ddfa744de86c46d8390759" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ADD CONSTRAINT "FK_1310173d16de1076b3dd63dd668" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ADD CONSTRAINT "FK_6caad38ca61ab3059e26e19187f" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ADD CONSTRAINT "FK_76969f00a2070f52ab67b130b9b" FOREIGN KEY ("tasker_id") REFERENCES "taskers"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ADD CONSTRAINT "FK_1f3ef187d743269ffd3b808fc0b" FOREIGN KEY ("decided_by_investigator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ADD CONSTRAINT "FK_ba5ec4d7426655c4c6cacd6a2c9" FOREIGN KEY ("approved_by_checker_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_status_logs" ADD CONSTRAINT "FK_729efee54e1bf7b6deeeafb010d" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_status_logs" ADD CONSTRAINT "FK_c05dc187c382b7b3b2665a45d7c" FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_statements" ADD CONSTRAINT "FK_10f1ce406fe4711c9065ba686a1" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_statements" ADD CONSTRAINT "FK_45c0a81a7809ccb528b6692c825" FOREIGN KEY ("submitted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_evidences" ADD CONSTRAINT "FK_9f09e953491c748f7455d26b614" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_evidences" ADD CONSTRAINT "FK_be9ffc7456861755ca521803469" FOREIGN KEY ("damage_item_id") REFERENCES "incident_damage_items"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_evidences" ADD CONSTRAINT "FK_8545d2fd85e9232e2e69231e1fd" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_incident_strikes" ADD CONSTRAINT "FK_9f019da92fe80de43914e9e18d2" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_incident_strikes" ADD CONSTRAINT "FK_4b05221d2a3e27b4f2acbb02c02" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "customer_incident_strikes" DROP CONSTRAINT "FK_4b05221d2a3e27b4f2acbb02c02"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_incident_strikes" DROP CONSTRAINT "FK_9f019da92fe80de43914e9e18d2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_evidences" DROP CONSTRAINT "FK_8545d2fd85e9232e2e69231e1fd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_evidences" DROP CONSTRAINT "FK_be9ffc7456861755ca521803469"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_evidences" DROP CONSTRAINT "FK_9f09e953491c748f7455d26b614"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_statements" DROP CONSTRAINT "FK_45c0a81a7809ccb528b6692c825"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_statements" DROP CONSTRAINT "FK_10f1ce406fe4711c9065ba686a1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_status_logs" DROP CONSTRAINT "FK_c05dc187c382b7b3b2665a45d7c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_status_logs" DROP CONSTRAINT "FK_729efee54e1bf7b6deeeafb010d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP CONSTRAINT "FK_ba5ec4d7426655c4c6cacd6a2c9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP CONSTRAINT "FK_1f3ef187d743269ffd3b808fc0b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP CONSTRAINT "FK_76969f00a2070f52ab67b130b9b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP CONSTRAINT "FK_6caad38ca61ab3059e26e19187f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP CONSTRAINT "FK_1310173d16de1076b3dd63dd668"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_damage_items" DROP CONSTRAINT "FK_96f01ddfa744de86c46d8390759"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_ist_incident"`);
    await queryRunner.query(`DROP INDEX "public"."idx_isl_incident"`);
    await queryRunner.query(`DROP INDEX "public"."idx_inc_status_comp"`);
    await queryRunner.query(`DROP INDEX "public"."idx_inc_severity_created"`);
    await queryRunner.query(
      `ALTER TABLE "customer_incident_strikes" ALTER COLUMN "customer_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_incident_strikes" ALTER COLUMN "created_at" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_evidences" ALTER COLUMN "created_at" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_statements" ALTER COLUMN "incident_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_statements" ALTER COLUMN "created_at" DROP NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_ist_incident" ON "incident_statements" ("created_at", "incident_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_status_logs" ALTER COLUMN "incident_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_status_logs" ALTER COLUMN "created_at" DROP NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_isl_incident" ON "incident_status_logs" ("created_at", "incident_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ALTER COLUMN "reported_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ALTER COLUMN "reported_at" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ALTER COLUMN "compensation_status" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ALTER COLUMN "severity" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ALTER COLUMN "description" DROP NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_inc_status_comp" ON "incidents" ("compensation_status", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_inc_severity_created" ON "incidents" ("created_at", "severity") `,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_damage_items" ALTER COLUMN "incident_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_damage_items" ALTER COLUMN "updated_at" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_damage_items" ALTER COLUMN "created_at" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_evidences" ADD CONSTRAINT "chk_ie_file_type" CHECK (((file_type IS NULL) OR ((file_type)::text = ANY ((ARRAY['IMAGE'::character varying, 'VIDEO'::character varying])::text[]))))`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ADD CONSTRAINT "chk_inc_comp_source" CHECK (((compensation_source IS NULL) OR ((compensation_source)::text = ANY ((ARRAY['TASKER_DEPOSIT'::character varying, 'PLATFORM_FUND'::character varying, 'MIXED'::character varying])::text[]))))`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ADD CONSTRAINT "chk_inc_borne_nonneg" CHECK ((((tasker_borne_amount IS NULL) OR (tasker_borne_amount >= (0)::numeric)) AND ((platform_borne_amount IS NULL) OR (platform_borne_amount >= (0)::numeric))))`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_damage_items" ADD CONSTRAINT "chk_idi_approved_nonneg" CHECK (((approved_amount IS NULL) OR (approved_amount >= (0)::numeric)))`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_damage_items" ADD CONSTRAINT "chk_idi_verified_nonneg" CHECK (((verified_amount IS NULL) OR (verified_amount >= (0)::numeric)))`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_damage_items" ADD CONSTRAINT "chk_idi_claimed_pos" CHECK ((claimed_amount > (0)::numeric))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_inc_tasker" ON "incidents" ("tasker_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_inc_customer" ON "incidents" ("customer_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_inc_active_per_booking" ON "incidents" ("booking_id") WHERE (status <> 'CLOSED'::incident_status)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_incidents_code" ON "incidents" ("incident_code") WHERE (incident_code IS NOT NULL)`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_incident_strikes" ADD CONSTRAINT "customer_incident_strikes_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_incident_strikes" ADD CONSTRAINT "customer_incident_strikes_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_evidences" ADD CONSTRAINT "incident_evidences_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_evidences" ADD CONSTRAINT "fk_ie_uploaded_by" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_evidences" ADD CONSTRAINT "fk_ie_damage_item" FOREIGN KEY ("damage_item_id") REFERENCES "incident_damage_items"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_statements" ADD CONSTRAINT "incident_statements_submitted_by_user_id_fkey" FOREIGN KEY ("submitted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_statements" ADD CONSTRAINT "incident_statements_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_status_logs" ADD CONSTRAINT "incident_status_logs_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_status_logs" ADD CONSTRAINT "incident_status_logs_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ADD CONSTRAINT "fk_inc_tasker" FOREIGN KEY ("tasker_id") REFERENCES "taskers"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ADD CONSTRAINT "fk_inc_investigator" FOREIGN KEY ("decided_by_investigator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ADD CONSTRAINT "fk_inc_customer" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ADD CONSTRAINT "fk_inc_checker" FOREIGN KEY ("approved_by_checker_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" ADD CONSTRAINT "fk_inc_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_damage_items" ADD CONSTRAINT "incident_damage_items_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }
}
