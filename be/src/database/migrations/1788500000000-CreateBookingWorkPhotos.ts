import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBookingWorkPhotos1788500000000 implements MigrationInterface {
  name = 'CreateBookingWorkPhotos1788500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "booking_work_photo_phase" AS ENUM ('BEFORE', 'AFTER');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE "booking_work_photos" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "booking_id" uuid NOT NULL
          REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "phase" "booking_work_photo_phase" NOT NULL,
        "file_url" text NOT NULL,
        "storage_public_id" text,
        "uploaded_by_user_id" uuid
          REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_bwp_booking_phase"
        ON "booking_work_photos" ("booking_id", "phase", "sort_order")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "booking_work_photos"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "booking_work_photo_phase"`);
  }
}
