import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Bổ sung các cột còn thiếu (drift) so với entity — additive + idempotent:
 *  - taskers.skills (text)
 *  - services: service_code, thumbnail_url, gallery_urls, short_description,
 *    included_tasks, excluded_tasks
 */
export class AddMissingTaskerServiceColumns1782040000000
  implements MigrationInterface
{
  name = 'AddMissingTaskerServiceColumns1782040000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "taskers" ADD COLUMN IF NOT EXISTS "skills" text`,
    );

    await queryRunner.query(
      `ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "service_code" character varying(20) NOT NULL DEFAULT ('SRV-' || upper(substr(md5(random()::text), 1, 6)))`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE "services" ADD CONSTRAINT "uq_services_service_code" UNIQUE ("service_code"); EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$`,
    );
    await queryRunner.query(
      `ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "thumbnail_url" character varying(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "gallery_urls" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "short_description" character varying(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "included_tasks" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "excluded_tasks" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "services" DROP COLUMN IF EXISTS "excluded_tasks"`);
    await queryRunner.query(`ALTER TABLE "services" DROP COLUMN IF EXISTS "included_tasks"`);
    await queryRunner.query(`ALTER TABLE "services" DROP COLUMN IF EXISTS "short_description"`);
    await queryRunner.query(`ALTER TABLE "services" DROP COLUMN IF EXISTS "gallery_urls"`);
    await queryRunner.query(`ALTER TABLE "services" DROP COLUMN IF EXISTS "thumbnail_url"`);
    await queryRunner.query(`ALTER TABLE "services" DROP CONSTRAINT IF EXISTS "uq_services_service_code"`);
    await queryRunner.query(`ALTER TABLE "services" DROP COLUMN IF EXISTS "service_code"`);
    await queryRunner.query(`ALTER TABLE "taskers" DROP COLUMN IF EXISTS "skills"`);
  }
}
