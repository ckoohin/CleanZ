import { MigrationInterface, QueryRunner } from 'typeorm';

export class AutoMigration1781637728871 implements MigrationInterface {
  name = 'AutoMigration1781637728871';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "peak_day_configs" ALTER COLUMN "peak_rate" SET DEFAULT '0.1'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "peak_day_configs" ALTER COLUMN "peak_rate" SET DEFAULT 0.1`,
    );
  }
}
