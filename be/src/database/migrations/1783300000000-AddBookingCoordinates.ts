import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBookingCoordinates1783300000000 implements MigrationInterface {
  name = 'AddBookingCoordinates1783300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Đơn guest không có addressRef (không lưu vào sổ địa chỉ) → giữ toạ độ
    // ngay trên đơn để tracking (bản đồ chỉ đường cho tasker) hoạt động.
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "latitude" numeric(10,7)`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "longitude" numeric(10,7)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN IF EXISTS "longitude"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN IF EXISTS "latitude"`,
    );
  }
}
