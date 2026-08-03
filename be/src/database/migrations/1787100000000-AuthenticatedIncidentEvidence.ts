import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Đánh dấu bằng chứng sự cố được lưu ở chế độ TRUY CẬP CÓ KÝ trên storage.
 *
 * Trước đây mọi ảnh bằng chứng đều upload ở chế độ công khai và hệ thống lưu thẳng URL đó.
 * Toàn bộ cơ chế `visibility` (ADMIN_ONLY / ADMIN_TASKER / INCIDENT_PARTIES) chỉ lọc ở tầng
 * JSON trả về, không chạm tới file: ai có link là xem được ảnh bên trong nhà khách, kể cả
 * ảnh minh chứng chuyển khoản vốn chứa thông tin tài khoản ngân hàng. `softDeleteEvidence`
 * cũng chỉ bật cờ trong DB nên ảnh "đã xoá" vẫn tải về được.
 *
 * Từ nay ảnh mới upload ở chế độ `authenticated`; URL giao hàng phải do server ký tại thời
 * điểm trả response, và chỉ ký cho bằng chứng mà người xem thực sự được phép thấy.
 *
 * Cột này để phân biệt ảnh CŨ (đã nằm sẵn ở chế độ công khai, ký sẽ 404) với ảnh MỚI. Không
 * backfill: tài sản cũ trên Cloudinary vẫn là public, đổi chế độ của chúng là thao tác ngoài
 * DB và phải làm riêng nếu muốn.
 */
export class AuthenticatedIncidentEvidence1787100000000 implements MigrationInterface {
  name = 'AuthenticatedIncidentEvidence1787100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE incident_evidences
        ADD COLUMN IF NOT EXISTS storage_type varchar(20) NOT NULL DEFAULT 'PUBLIC'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE incident_evidences DROP COLUMN IF EXISTS storage_type`,
    );
  }
}
