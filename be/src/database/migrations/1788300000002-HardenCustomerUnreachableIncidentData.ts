import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Khôi phục hai guard dữ liệu của luồng CUSTOMER_UNREACHABLE cho database đi từ
 * baseline cũ. Database đã chạy nhánh tổng quát hoá sẽ bỏ qua nhờ kiểm tra idempotent.
 */
export class HardenCustomerUnreachableIncidentData1788300000002 implements MigrationInterface {
  name = 'HardenCustomerUnreachableIncidentData1788300000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
            FROM pg_constraint
           WHERE conrelid = 'public.incidents'::regclass
             AND conname = 'CHK_incident_customer_no_show_amounts_non_negative'
        ) THEN
          ALTER TABLE "incidents"
            ADD CONSTRAINT "CHK_incident_customer_no_show_amounts_non_negative"
            CHECK (
              ("customer_borne_amount" IS NULL OR "customer_borne_amount" >= 0)
              AND ("platform_advance_amount" IS NULL OR "platform_advance_amount" >= 0)
              AND ("travel_distance_meters" IS NULL OR "travel_distance_meters" >= 0)
            );
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_incidents_customer_no_show_appeal"
        ON "incidents" ("customer_appealed_at")
        WHERE "customer_appealed_at" IS NOT NULL
    `);
  }

  /** Hai guard này chỉ tăng tính toàn vẹn và không làm binary cũ mất tương thích. */
  public down(_queryRunner: QueryRunner): Promise<void> {
    return Promise.resolve();
  }
}
