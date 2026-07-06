import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBookingAddonIds1783270000000 implements MigrationInterface {
  name = 'AddBookingAddonIds1783270000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "addon_ids" JSONB NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN IF EXISTS "addon_ids"`,
    );
  }
}
