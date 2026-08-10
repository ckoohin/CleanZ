import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Bổ sung ngữ nghĩa nghiệp vụ cho `admin_activity_logs`.
 *
 * Bảng cũ trả lời được "ai gọi endpoint nào, field nào đổi giá trị", nhưng không
 * trả lời được "thao tác này là nghiệp vụ gì, hệ trọng tới đâu, vì lý do gì, và
 * nó đã kéo theo những thay đổi dữ liệu nào ở bảng khác". Bốn câu đó mới là thứ
 * người điều tra một khiếu nại tiền bạc cần.
 *
 * - `action_code`  : khoá nghiệp vụ ổn định, thay cho `action` (chuỗi tiếng Việt
 *                    ghép ở runtime, đổi theo nhãn hiển thị và tên method).
 * - `severity`     : mức rủi ro của hành động, tách khỏi `status` (mức thành công).
 * - `reason`       : lý do admin nhập, tách khỏi `changes` để bắt buộc và tra cứu được.
 * - `correlation_id`: khoá nối một thao tác admin với MỌI thay đổi dữ liệu nó gây ra
 *                    ở `wallet_transactions`, `booking_status_logs`… (xem migration
 *                    kế tiếp). Trước đây chỉ có thể đối chiếu thủ công theo `created_at`,
 *                    mà `created_at` của log lại được ghi SAU khi nghiệp vụ chạy xong.
 * - `target_type` / `affected_ids` / `business_data`: mô tả đối tượng và số liệu
 *                    nghiệp vụ cho các thao tác mà diff theo-row không diễn tả được
 *                    (điều chỉnh ví, xoá nợ, gán hàng loạt, broadcast).
 *
 * Backfill: bản ghi cũ nhận `action_code = 'GENERIC.LEGACY'` và `severity = 'NORMAL'`
 * — cố suy ngược mã nghiệp vụ từ chuỗi tiếng Việt sẽ tạo ra dữ liệu audit BỊA, tệ
 * hơn là thừa nhận không biết.
 */
export class EnrichAdminActivityAudit1787800000000 implements MigrationInterface {
  name = 'EnrichAdminActivityAudit1787800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_severity') THEN
          CREATE TYPE "audit_severity" AS ENUM ('CRITICAL', 'HIGH', 'NORMAL', 'READ_SENSITIVE');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "admin_activity_logs"
        ADD COLUMN IF NOT EXISTS "action_code" character varying(80) NOT NULL DEFAULT 'GENERIC.LEGACY',
        ADD COLUMN IF NOT EXISTS "severity" "audit_severity" NOT NULL DEFAULT 'NORMAL',
        ADD COLUMN IF NOT EXISTS "reason" text,
        ADD COLUMN IF NOT EXISTS "correlation_id" uuid,
        ADD COLUMN IF NOT EXISTS "target_type" character varying(60),
        ADD COLUMN IF NOT EXISTS "affected_ids" jsonb,
        ADD COLUMN IF NOT EXISTS "business_data" jsonb
    `);

    // Giữ DEFAULT cho `severity` (NORMAL là mặc định đúng cho handler chưa khai báo),
    // nhưng bỏ DEFAULT của `action_code`: sau backfill, mọi INSERT đều phải nói rõ
    // mình là hành động gì — im lặng rơi về 'GENERIC.LEGACY' sẽ trộn lẫn bản ghi mới
    // với bản ghi lịch sử không truy được nguồn.
    await queryRunner.query(
      `ALTER TABLE "admin_activity_logs" ALTER COLUMN "action_code" DROP DEFAULT`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_admin_activity_action_code_created" ON "admin_activity_logs" ("action_code", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_admin_activity_severity_created" ON "admin_activity_logs" ("severity", "created_at")`,
    );
    // Truy vết ngược từ một bút toán đáng ngờ về thao tác admin sinh ra nó.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_admin_activity_correlation" ON "admin_activity_logs" ("correlation_id") WHERE "correlation_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_admin_activity_target" ON "admin_activity_logs" ("target_type", "target_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_admin_activity_target"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_admin_activity_correlation"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_admin_activity_severity_created"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_admin_activity_action_code_created"`,
    );
    await queryRunner.query(`
      ALTER TABLE "admin_activity_logs"
        DROP COLUMN IF EXISTS "business_data",
        DROP COLUMN IF EXISTS "affected_ids",
        DROP COLUMN IF EXISTS "target_type",
        DROP COLUMN IF EXISTS "correlation_id",
        DROP COLUMN IF EXISTS "reason",
        DROP COLUMN IF EXISTS "severity",
        DROP COLUMN IF EXISTS "action_code"
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS "audit_severity"`);
  }
}
