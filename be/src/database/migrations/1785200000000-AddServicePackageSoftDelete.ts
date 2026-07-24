import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Xóa mềm gói dịch vụ.
 *
 * Trước đây `remove()` xóa cứng bản ghi, trong khi `bookings.package_id` vẫn trỏ
 * tới gói — xóa một gói đang có đơn sẽ làm hỏng lịch sử (mất tên gói, chính sách
 * hủy, báo cáo doanh thu theo gói). Đánh dấu `deleted_at` giữ nguyên bản ghi để
 * đơn cũ tra cứu được, đồng thời ẩn gói khỏi mọi luồng đặt đơn mới.
 *
 * Lưu ý: `package_code` vẫn UNIQUE trên toàn bảng, nên mã của gói đã xóa mềm
 * chưa được dùng lại — muốn dùng lại thì khôi phục gói cũ hoặc đặt mã khác.
 */
export class AddServicePackageSoftDelete1785200000000 implements MigrationInterface {
  name = 'AddServicePackageSoftDelete1785200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "service_packages" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "service_packages" DROP COLUMN IF EXISTS "deleted_at"`,
    );
  }
}
