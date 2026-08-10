import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Hai việc, cùng phục vụ tính tin cậy của nhật ký.
 *
 * ── 1. Chặn sửa/xoá nhật ký ở tầng DB ─────────────────────────────────────────
 *
 * `admin_activity_logs` là sổ chỉ-thêm. Trước đây điều đó chỉ là quy ước trong
 * code: bất kỳ ai chạm được vào DB bằng chính user của ứng dụng đều sửa hoặc xoá
 * được — kể cả người mà nhật ký đang ghi lại hành vi. Một nhật ký mà đối tượng bị
 * giám sát tự xoá được thì không phải bằng chứng.
 *
 * Trigger chặn UPDATE vô điều kiện, và chặn DELETE với bản ghi CHƯA quá hạn lưu
 * trữ. Hạn lưu trữ nằm trong DB chứ không nằm ở biến môi trường: nếu để job dọn
 * tự quyết, đổi một biến `.env` là xoá sạch được nhật ký của hôm qua.
 *
 * Đây là rào chắn chống thao tác VÔ TÌNH và chống sửa đổi bằng chính đường của
 * ứng dụng — không phải chống được superuser. Ai có quyền `ALTER TABLE` vẫn tắt
 * được trigger; điều họ không làm được là tắt nó mà không để lại dấu vết.
 *
 * ── 2. Phân biệt "hệ thống làm" với "không rõ ai làm" ─────────────────────────
 *
 * Ba bảng lịch sử nghiệp vụ ghi `changed_by_user_id = NULL` cho cả hai trường
 * hợp: cron/worker tự chạy, và những chỗ đơn giản là không truyền actor vào. Khi
 * điều tra thì hai thứ đó khác nhau hoàn toàn — một cái là hành vi đã biết rõ
 * nguồn, một cái là lỗ hổng. `actor_type` tách chúng ra.
 *
 * Bản ghi cũ để NULL: suy ngược xem dòng nào do cron tạo sẽ là bịa dữ liệu.
 */
export class AuditRetentionAndActorType1788200000000 implements MigrationInterface {
  name = 'AuditRetentionAndActorType1788200000000';

  private readonly logTables = [
    'booking_status_logs',
    'incident_status_logs',
    'ticket_status_logs',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_actor_type') THEN
          CREATE TYPE "audit_actor_type" AS ENUM ('ADMIN', 'USER', 'SYSTEM');
        END IF;
      END $$;
    `);

    for (const table of this.logTables) {
      await queryRunner.query(`
        ALTER TABLE "${table}"
        ADD COLUMN IF NOT EXISTS "actor_type" "audit_actor_type"
      `);
    }

    // ── Rào chắn append-only ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION "audit_log_guard"() RETURNS trigger AS $$
      BEGIN
        IF (TG_OP = 'UPDATE') THEN
          RAISE EXCEPTION 'admin_activity_logs la so chi-them: khong duoc UPDATE';
        END IF;

        IF (TG_OP = 'DELETE') THEN
          -- Chỉ job dọn theo hạn mới được xoá, và chỉ xoá phần đã quá hạn.
          IF (OLD.created_at > now() - interval '12 months') THEN
            RAISE EXCEPTION
              'Khong duoc xoa nhat ky chua qua han luu tru (12 thang): %', OLD.id;
          END IF;
          RETURN OLD;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "trg_admin_activity_logs_guard" ON "admin_activity_logs"`,
    );
    await queryRunner.query(`
      CREATE TRIGGER "trg_admin_activity_logs_guard"
      BEFORE UPDATE OR DELETE ON "admin_activity_logs"
      FOR EACH ROW EXECUTE FUNCTION "audit_log_guard"()
    `);

    // Job dọn quét theo `created_at`; index này đã có sẵn từ migration đầu tiên
    // (`idx_admin_activity_created_at`) nên không tạo thêm.
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "trg_admin_activity_logs_guard" ON "admin_activity_logs"`,
    );
    await queryRunner.query(`DROP FUNCTION IF EXISTS "audit_log_guard"()`);

    for (const table of this.logTables) {
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN IF EXISTS "actor_type"`,
      );
    }
    await queryRunner.query(`DROP TYPE IF EXISTS "audit_actor_type"`);
  }
}
