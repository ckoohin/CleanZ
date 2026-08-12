import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration riêng để dùng các enum được thêm ở 1788300000000 sau khi transaction đó đã
 * COMMIT. Đồng thời tách unique index giữa sự cố thông thường và CUSTOMER_UNREACHABLE,
 * cho phép hai nghiệp vụ cùng tồn tại trên một booking nhưng vẫn chống double-submit
 * trong từng nghiệp vụ.
 */
export class BackfillIncidentRespondentScope1788300000001 implements MigrationInterface {
  name = 'BackfillIncidentRespondentScope1788300000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "incidents"
         SET "respondent_party" = CASE
           WHEN "type" = 'CUSTOMER_UNREACHABLE'::"incident_type"
             THEN 'CUSTOMER'::"incident_respondent_party"
           ELSE 'TASKER'::"incident_respondent_party"
         END
    `);
    await queryRunner.query(`
      UPDATE "incident_decision_responses" response
         SET "respondent_party" = incident."respondent_party"
        FROM "incidents" incident
       WHERE incident."id" = response."incident_id"
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS "uq_inc_active_per_booking"`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_inc_active_per_booking_generic"
        ON "incidents" ("booking_id")
        WHERE "status" <> 'CLOSED'
          AND "booking_id" IS NOT NULL
          AND "type" <> 'CUSTOMER_UNREACHABLE'
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_checkin_reconciliation_active_per_booking"
        ON "incidents" ("booking_id")
        WHERE "status" <> 'CLOSED'
          AND "booking_id" IS NOT NULL
          AND "type" = 'CUSTOMER_UNREACHABLE'
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_incidents_customer_unreachable_queue"
        ON "incidents" ("type", "status", "final_submission_eligible_at")
    `);
  }

  /**
   * Backfill và hai partial unique index là tương thích ngược, còn gộp chúng lại có thể
   * chặn một booking đang có cả hai loại hồ sơ. Vì vậy down cố ý không xoá dữ liệu/index.
   */
  public down(_queryRunner: QueryRunner): Promise<void> {
    return Promise.resolve();
  }
}
