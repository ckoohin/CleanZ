import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveDurationHoursFromPricing1781813000000 implements MigrationInterface {
  name = 'RemoveDurationHoursFromPricing1781813000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "pricing_configs"
      WHERE "id" IN (
        SELECT "id"
        FROM (
          SELECT
            "id",
            ROW_NUMBER() OVER (
              PARTITION BY "service_id"
              ORDER BY "created_at" DESC, "id" DESC
            ) AS "row_number"
          FROM "pricing_configs"
        ) AS "duplicated_pricing"
        WHERE "row_number" > 1
      )
    `);
    await queryRunner.query(
      `ALTER TABLE "pricing_configs" DROP CONSTRAINT IF EXISTS "uq_pricing_service_duration"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pricing_configs" DROP COLUMN IF EXISTS "duration_hours"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pricing_configs" ADD CONSTRAINT "uq_pricing_service" UNIQUE ("service_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "pricing_configs" DROP CONSTRAINT IF EXISTS "uq_pricing_service"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pricing_configs" ADD "duration_hours" numeric(4,1)`,
    );
    await queryRunner.query(`
      UPDATE "pricing_configs" AS "pricing"
      SET "duration_hours" = COALESCE("service"."base_duration_hours", 0.5)
      FROM "services" AS "service"
      WHERE "service"."id" = "pricing"."service_id"
    `);
    await queryRunner.query(
      `UPDATE "pricing_configs" SET "duration_hours" = 0.5 WHERE "duration_hours" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "pricing_configs" ALTER COLUMN "duration_hours" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "pricing_configs" ADD CONSTRAINT "uq_pricing_service_duration" UNIQUE ("service_id", "duration_hours")`,
    );
  }
}
