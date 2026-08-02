import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Đợt 1 củng cố module Support Ticket:
 *
 *  1. `ticket_code` — bảng đếm nguyên tử + UNIQUE index.
 *     Trước đây mã được sinh bằng `MAX(seq) + 1` trên cột KHÔNG có index và
 *     KHÔNG còn unique constraint → (a) quét toàn bảng mỗi lần tạo ticket,
 *     (b) hai request đồng thời cùng đọc MAX rồi cùng ghi ⇒ TRÙNG MÃ âm thầm.
 *
 *  2. `first_response_breached` — cờ vi phạm SLA phản hồi lần đầu.
 *     `first_response_due_at` vốn được ghi lúc tạo nhưng chưa bao giờ được so
 *     sánh, nên toàn bộ cấu hình `responseMins` không sinh cảnh báo nào.
 */
export class HardenTicketCodeAndSla1786300000000 implements MigrationInterface {
  name = 'HardenTicketCodeAndSla1786300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1a. Dọn mã trùng đã lỡ phát sinh (nếu có) ───────────────────────────
    // Giữ nguyên mã cho bản ghi CŨ NHẤT của mỗi nhóm trùng; các bản sau được
    // gắn hậu tố `-2`, `-3`… (mã dài tối đa 16+2 ký tự, vẫn dưới giới hạn 20).
    await queryRunner.query(`
      WITH dup AS (
        SELECT id,
               ticket_code,
               ROW_NUMBER() OVER (
                 PARTITION BY ticket_code ORDER BY created_at, id
               ) AS rn
        FROM support_tickets
        WHERE ticket_code IS NOT NULL
      )
      UPDATE support_tickets t
      SET ticket_code = dup.ticket_code || '-' || dup.rn
      FROM dup
      WHERE t.id = dup.id AND dup.rn > 1
    `);

    // ── 1b. UNIQUE index (partial: cột nullable) ────────────────────────────
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_support_tickets_code
      ON support_tickets (ticket_code)
      WHERE ticket_code IS NOT NULL
    `);

    // ── 1c. Bảng đếm theo ngày — cấp số nguyên tử, O(1), không quét bảng ────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ticket_code_counters (
        day date PRIMARY KEY,
        seq integer NOT NULL DEFAULT 0
      )
    `);

    // Nạp mốc hiện tại để mã mới KHÔNG đụng mã cũ.
    await queryRunner.query(`
      INSERT INTO ticket_code_counters (day, seq)
      SELECT to_date(substring(ticket_code FROM 4 FOR 8), 'YYYYMMDD') AS day,
             MAX(CAST(substring(ticket_code FROM '[0-9]+$') AS integer)) AS seq
      FROM support_tickets
      WHERE ticket_code ~ '^TK-[0-9]{8}-[0-9]+$'
      GROUP BY 1
      ON CONFLICT (day)
      DO UPDATE SET seq = GREATEST(ticket_code_counters.seq, EXCLUDED.seq)
    `);

    // ── 2. Cờ vi phạm SLA phản hồi lần đầu ──────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE support_tickets
      ADD COLUMN IF NOT EXISTS first_response_breached boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE support_tickets DROP COLUMN IF EXISTS first_response_breached`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS ticket_code_counters`);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_support_tickets_code`);
    // Không khôi phục mã trùng đã dọn — dữ liệu sau khi sửa là dữ liệu đúng.
  }
}
