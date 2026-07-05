import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Chốt lại phần drift THỰC SỰ gây lỗi runtime sau khi chạy chuỗi migration lịch sử:
 * thêm lại `service_packages.allow_single_service` — các migration auto-gen cũ đã
 * lỡ drop nó, nhưng entity ServicePackage vẫn map/đọc cột này nên nếu thiếu sẽ 500.
 *
 * Các lệch còn lại mà `db:check` báo (tên FK dạng hash vs tên tay, cột PostGIS
 * `taskers.current_location` cố ý không map, vài `DROP DEFAULT`) chỉ là khác biệt
 * cosmetic — KHÔNG gây lỗi runtime nên không xử lý ở đây để tránh tạo ràng buộc trùng.
 */
export class ReconcileSchemaDrift1782850000000 implements MigrationInterface {
  name = 'ReconcileSchemaDrift1782850000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "service_packages" ADD COLUMN IF NOT EXISTS "allow_single_service" boolean NOT NULL DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "service_packages" DROP COLUMN IF EXISTS "allow_single_service"`,
    );
  }
}
