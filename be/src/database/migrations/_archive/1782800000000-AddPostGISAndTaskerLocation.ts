import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPostGISAndTaskerLocation1782800000000 implements MigrationInterface {
  name = 'AddPostGISAndTaskerLocation1782800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis`);

    await queryRunner.query(`
      ALTER TABLE "taskers"
        ADD COLUMN IF NOT EXISTS "current_location" GEOGRAPHY(POINT, 4326),
        ADD COLUMN IF NOT EXISTS "location_updated_at" TIMESTAMPTZ
    `);

    // Partial spatial index: chỉ index ONLINE + ACTIVE để giảm kích thước index
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_taskers_location_online"
        ON "taskers" USING GIST("current_location")
        WHERE "presence_status" = 'ONLINE' AND "status" = 'ACTIVE'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_taskers_location_online"`,
    );
    await queryRunner.query(
      `ALTER TABLE "taskers" DROP COLUMN IF EXISTS "location_updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "taskers" DROP COLUMN IF EXISTS "current_location"`,
    );
  }
}
