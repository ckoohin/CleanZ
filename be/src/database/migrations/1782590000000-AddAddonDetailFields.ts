import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAddonDetailFields1782590000000 implements MigrationInterface {
  name = 'AddAddonDetailFields1782590000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "service_addons" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "package_id" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "description" text,
        "price" numeric(12,2) NOT NULL,
        "price_unit" character varying(50) DEFAULT 'per_item',
        "duration_minutes" integer,
        "max_quantity" integer,
        "sort_order" integer DEFAULT 0,
        "icon_url" character varying(500),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_service_addons" PRIMARY KEY ("id"),
        CONSTRAINT "FK_service_addons_package"
          FOREIGN KEY ("package_id")
          REFERENCES "service_packages"("id")
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_service_addons_package_id"
        ON "service_addons" ("package_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "service_addons"
        ADD COLUMN IF NOT EXISTS "price_unit"       VARCHAR(50)    NOT NULL DEFAULT 'per_item',
        ADD COLUMN IF NOT EXISTS "duration_minutes" INTEGER                 DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS "max_quantity"     INTEGER                 DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS "sort_order"       INTEGER        NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "icon_url"         VARCHAR(500)            DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_service_addons_package_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "service_addons"`);
  }
}
