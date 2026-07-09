import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGuestBookingSupport1783290000000 implements MigrationInterface {
  name = 'AddGuestBookingSupport1783290000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Đơn offline/vãng lai do tasker tạo hộ khách CHƯA có tài khoản:
    // lưu tên + SĐT ngay trên đơn và cho phép customer_id để trống.
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "guest_name" varchar(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "guest_phone" varchar(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ALTER COLUMN "customer_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "customer_id" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Lưu ý: nếu đã tồn tại đơn guest (customer_id NULL) thì việc set lại
    // NOT NULL sẽ thất bại — cần dọn dữ liệu guest trước khi rollback.
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "customer_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ALTER COLUMN "customer_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN IF EXISTS "guest_phone"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN IF EXISTS "guest_name"`,
    );
  }
}
