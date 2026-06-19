import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlignPeakDayRate1781814000000 implements MigrationInterface {
  name = 'AlignPeakDayRate1781814000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "peak_day_configs" ALTER COLUMN "peak_rate" SET DEFAULT '0.1'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "peak_day_configs"."peak_rate" IS 'Peak surcharge rate (e.g. 0.1 = +10%)'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "peak_day_configs" ALTER COLUMN "peak_rate" SET DEFAULT '1'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "peak_day_configs"."peak_rate" IS 'Price multiplier >= 1.0 (e.g. 1.2 = +20%)'`,
    );
  }
}
