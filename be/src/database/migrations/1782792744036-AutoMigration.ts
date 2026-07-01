import { MigrationInterface, QueryRunner } from 'typeorm';

export class AutoMigration1782792744036 implements MigrationInterface {
  name = 'AutoMigration1782792744036';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."idx_service_sub_services_package_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_packages" DROP COLUMN "allow_single_service"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "service_packages" ADD "allow_single_service" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_service_sub_services_package_id" ON "service_sub_services" ("package_id") `,
    );
  }
}
