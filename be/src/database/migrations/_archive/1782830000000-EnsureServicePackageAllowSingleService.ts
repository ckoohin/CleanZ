import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnsureServicePackageAllowSingleService1782830000000 implements MigrationInterface {
  name = 'EnsureServicePackageAllowSingleService1782830000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "service_packages"
        ADD COLUMN IF NOT EXISTS "allow_single_service" boolean
    `);

    await queryRunner.query(`
      UPDATE "service_packages"
      SET "allow_single_service" = true
      WHERE "allow_single_service" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "service_packages"
        ALTER COLUMN "allow_single_service" SET DEFAULT true,
        ALTER COLUMN "allow_single_service" SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "service_packages"
        DROP COLUMN IF EXISTS "allow_single_service"
    `);
  }
}
