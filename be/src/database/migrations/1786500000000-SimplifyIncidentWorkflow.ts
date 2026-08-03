import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tinh gọn luồng sự cố: 4 trục trạng thái → 1, bỏ duyệt cấp 2, gộp thẩm định vào quyết định.
 *
 * Ánh xạ trạng thái (đọc từ trạng thái CŨ theo thứ tự ưu tiên):
 *   COMPENSATED                                   → COMPENSATED
 *   APPROVED (đã chốt, chờ chi)                   → AWAITING_PAYOUT
 *   REJECTED                                      → REJECTED
 *   CLOSED                                        → CLOSED
 *   INVESTIGATING + decision PENDING_TASKER_RESP  → AWAITING_RESPONSE
 *   INVESTIGATING (mọi trường hợp còn lại,
 *     gồm cả PENDING_ADMIN_APPROVAL đang chờ
 *     Admin #2 — đưa về tay Admin duy nhất chốt lại) → REVIEWING
 *   REPORTED                                      → REPORTED
 *
 * Thứ tự an toàn cho enum Postgres: THÊM giá trị mới trước (commit riêng), backfill dữ
 * liệu, rồi mới dựng type mới và drop cột cũ. Không gộp các bước — thêm giá trị enum và
 * dùng ngay giá trị đó trong cùng transaction sẽ lỗi "unsafe use of new value".
 */
export class SimplifyIncidentWorkflow1786500000000 implements MigrationInterface {
  name = 'SimplifyIncidentWorkflow1786500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Cột mốc "đã gửi Tasker phản biện ở mức bao nhiêu" (thay cho response_window_status).
    await queryRunner.query(`
      ALTER TABLE "incidents"
        ADD COLUMN IF NOT EXISTS "sent_tasker_borne_amount" numeric(12,2)
    `);

    // 2) Dựng type mới rồi chuyển cột sang, ánh xạ ngay trong USING — tránh phải ADD VALUE
    //    vào type cũ (ADD VALUE không dùng được trong cùng transaction với migration).
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'incident_status_v2') THEN
          CREATE TYPE "incident_status_v2" AS ENUM (
            'REPORTED', 'REVIEWING', 'AWAITING_RESPONSE', 'AWAITING_PAYOUT',
            'COMPENSATED', 'REJECTED', 'CLOSED'
          );
        END IF;
      END $$;
    `);

    // Backfill `sent_tasker_borne_amount` cho các sự cố đang chờ Tasker phản hồi: coi mức
    // đã gửi = mức hiện tại, nếu không mọi hồ sơ dở dang sẽ bị bắt gửi lại.
    await queryRunner.query(`
      UPDATE "incidents"
         SET "sent_tasker_borne_amount" = COALESCE("tasker_borne_amount", 0)
       WHERE "decision_status" IN ('PENDING_TASKER_RESPONSE', 'PENDING_ADMIN_APPROVAL')
    `);

    await queryRunner.query(`
      ALTER TABLE "incidents"
        ALTER COLUMN "status" DROP DEFAULT,
        ALTER COLUMN "status" TYPE "incident_status_v2"
        USING (
          CASE
            WHEN "status"::text = 'COMPENSATED'   THEN 'COMPENSATED'
            WHEN "status"::text = 'APPROVED'      THEN 'AWAITING_PAYOUT'
            WHEN "status"::text = 'REJECTED'      THEN 'REJECTED'
            WHEN "status"::text = 'CLOSED'        THEN 'CLOSED'
            WHEN "status"::text = 'INVESTIGATING'
             AND "decision_status"::text = 'PENDING_TASKER_RESPONSE'
                                                  THEN 'AWAITING_RESPONSE'
            WHEN "status"::text = 'INVESTIGATING' THEN 'REVIEWING'
            ELSE 'REPORTED'
          END
        )::"incident_status_v2"
    `);
    await queryRunner.query(`
      ALTER TABLE "incidents"
        ALTER COLUMN "status" SET DEFAULT 'REPORTED'::"incident_status_v2"
    `);

    // 3) Bỏ các trục trạng thái phụ + toàn bộ vết duyệt cấp 2.
    await queryRunner.query(`
      ALTER TABLE "incidents"
        DROP COLUMN IF EXISTS "decision_status",
        DROP COLUMN IF EXISTS "compensation_status",
        DROP COLUMN IF EXISTS "response_window_status",
        DROP COLUMN IF EXISTS "tasker_response_reviewed_at",
        DROP COLUMN IF EXISTS "tasker_response_extended_at",
        DROP COLUMN IF EXISTS "second_approval_note",
        DROP COLUMN IF EXISTS "second_approval_requested_at",
        DROP COLUMN IF EXISTS "second_approval_due_at",
        DROP COLUMN IF EXISTS "second_approved_by_admin_id",
        DROP COLUMN IF EXISTS "second_approved_at",
        DROP COLUMN IF EXISTS "dual_approval_threshold_snapshot",
        DROP COLUMN IF EXISTS "cooling_until",
        DROP COLUMN IF EXISTS "decided_by_investigator_id",
        DROP COLUMN IF EXISTS "decided_by_admin_id",
        DROP COLUMN IF EXISTS "approved_by_checker_id"
    `);

    // 4) Đổi tên type: incident_status cũ không còn tham chiếu nào.
    await queryRunner.query(`DROP TYPE IF EXISTS "incident_status"`);
    await queryRunner.query(
      `ALTER TYPE "incident_status_v2" RENAME TO "incident_status"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "incident_decision_status"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "incident_compensation_status"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "incident_response_window_status"`,
    );

    // 5) Index cũ dựng trên compensation_status đã mất cột — thay bằng (status, created_at).
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_inc_status_comp"`);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_inc_status_created"
        ON "incidents" ("status", "created_at")
    `);

    // 6) `decision_outcome` đổi bảng giá trị cho khớp `IncidentDecisionOutcome`.
    await queryRunner.query(`
      UPDATE "incidents"
         SET "decision_outcome" = CASE "decision_outcome"
           WHEN 'APPROVE'                 THEN 'COMPENSATE'
           WHEN 'APPROVE_NO_COMPENSATION' THEN 'NO_COMPENSATION'
           WHEN 'REJECT'                  THEN 'REJECT'
           ELSE "decision_outcome"
         END
       WHERE "decision_outcome" IS NOT NULL
    `);

    // 7) Gộp thẩm định vào duyệt tiền: `verified_amount` nay luôn bằng `approved_amount`.
    await queryRunner.query(`
      UPDATE "incident_damage_items"
         SET "verified_amount" = "approved_amount"
       WHERE "approved_amount" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Chỉ khôi phục được cấu trúc, KHÔNG khôi phục được dữ liệu đã mất (decision_status,
    // compensation_status, vết duyệt cấp 2). Trạng thái mới gộp ngược về bảng cũ.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'incident_status_v1') THEN
          CREATE TYPE "incident_status_v1" AS ENUM (
            'REPORTED', 'INVESTIGATING', 'APPROVED', 'REJECTED', 'COMPENSATED', 'CLOSED'
          );
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      ALTER TABLE "incidents"
        ALTER COLUMN "status" DROP DEFAULT,
        ALTER COLUMN "status" TYPE "incident_status_v1"
        USING (
          CASE
            WHEN "status"::text IN ('REVIEWING', 'AWAITING_RESPONSE') THEN 'INVESTIGATING'
            WHEN "status"::text = 'AWAITING_PAYOUT'                   THEN 'APPROVED'
            ELSE "status"::text
          END
        )::"incident_status_v1"
    `);
    await queryRunner.query(`
      ALTER TABLE "incidents"
        ALTER COLUMN "status" SET DEFAULT 'REPORTED'::"incident_status_v1"
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS "incident_status"`);
    await queryRunner.query(
      `ALTER TYPE "incident_status_v1" RENAME TO "incident_status"`,
    );

    await queryRunner.query(`
      ALTER TABLE "incidents"
        DROP COLUMN IF EXISTS "sent_tasker_borne_amount",
        ADD COLUMN IF NOT EXISTS "cooling_until" timestamp,
        ADD COLUMN IF NOT EXISTS "tasker_response_reviewed_at" timestamp,
        ADD COLUMN IF NOT EXISTS "tasker_response_extended_at" timestamp,
        ADD COLUMN IF NOT EXISTS "second_approval_note" text,
        ADD COLUMN IF NOT EXISTS "second_approval_requested_at" timestamp,
        ADD COLUMN IF NOT EXISTS "second_approval_due_at" timestamp,
        ADD COLUMN IF NOT EXISTS "second_approved_at" timestamp,
        ADD COLUMN IF NOT EXISTS "dual_approval_threshold_snapshot" numeric(12,2)
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_inc_status_created"`);
  }
}
