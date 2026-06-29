import { MigrationInterface, QueryRunner } from 'typeorm';

export class AutoMigration1782576856686 implements MigrationInterface {
  name = 'AutoMigration1782576856686';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "service_durations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "package_id" uuid NOT NULL,
        "duration_hours" numeric(4,1) NOT NULL,
        "price_multiplier" numeric(5,2) NOT NULL DEFAULT '1',
        "is_popular" boolean NOT NULL DEFAULT false,
        "is_active" boolean NOT NULL DEFAULT true,
        "suggested_area" integer,
        "tasker_count" integer NOT NULL DEFAULT '1',
        "title" character varying,
        "description" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_service_durations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_service_durations_package"
          FOREIGN KEY ("package_id")
          REFERENCES "service_packages"("id")
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_service_durations_package_id"
        ON "service_durations" ("package_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "service_durations"
        ADD COLUMN IF NOT EXISTS "suggested_area" integer,
        ADD COLUMN IF NOT EXISTS "tasker_count" integer NOT NULL DEFAULT '1',
        ADD COLUMN IF NOT EXISTS "title" character varying,
        ADD COLUMN IF NOT EXISTS "description" text
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('public.service_peak_hours') IS NOT NULL THEN
          ALTER TABLE "service_peak_hours"
            ADD COLUMN IF NOT EXISTS "start_date" TIMESTAMP,
            ADD COLUMN IF NOT EXISTS "end_date" TIMESTAMP;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('public.service_peak_hours') IS NOT NULL THEN
          ALTER TABLE "service_peak_hours"
            DROP COLUMN IF EXISTS "end_date",
            DROP COLUMN IF EXISTS "start_date";
        END IF;
      END $$;
    `);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_service_durations_package_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "service_durations"`);
  }
}
