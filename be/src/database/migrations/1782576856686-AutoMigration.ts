import { MigrationInterface, QueryRunner } from 'typeorm';

export class AutoMigration1782576856686 implements MigrationInterface {
  name = 'AutoMigration1782576856686';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "service_durations" ADD "suggested_area" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_durations" ADD "tasker_count" integer NOT NULL DEFAULT '1'`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_durations" ADD "title" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_durations" ADD "description" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_peak_hours" ADD "start_date" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_peak_hours" ADD "end_date" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "service_peak_hours" DROP COLUMN "end_date"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_peak_hours" DROP COLUMN "start_date"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_durations" DROP COLUMN "description"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_durations" DROP COLUMN "title"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_durations" DROP COLUMN "tasker_count"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_durations" DROP COLUMN "suggested_area"`,
    );
  }
}
