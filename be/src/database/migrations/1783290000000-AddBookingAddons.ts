import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBookingAddons1783290000000 implements MigrationInterface {
  name = 'AddBookingAddons1783290000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "booking_addons" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "booking_id" uuid NOT NULL,
        "addon_id" uuid NULL,
        "name" character varying(255) NOT NULL,
        "price" numeric(12,2) NOT NULL,
        "price_unit" character varying(50) NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_booking_addons" PRIMARY KEY ("id"),
        CONSTRAINT "FK_booking_addons_booking"
          FOREIGN KEY ("booking_id")
          REFERENCES "bookings"("id")
          ON DELETE CASCADE,
        CONSTRAINT "FK_booking_addons_addon"
          FOREIGN KEY ("addon_id")
          REFERENCES "service_addons"("id")
          ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_booking_addons_booking_id"
        ON "booking_addons" ("booking_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_booking_addons_addon_id"
        ON "booking_addons" ("addon_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_booking_addons_addon_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_booking_addons_booking_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "booking_addons"`);
  }
}
