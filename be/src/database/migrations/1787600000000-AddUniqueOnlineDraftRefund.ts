import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Chặn hoàn tiền hai lần cho cùng một đơn nháp ONLINE, ở tầng DB.
 *
 * `refundOnlineDraft` chống trùng bằng SELECT rồi mới INSERT. Ở mức cô lập
 * READ COMMITTED, webhook PayOS và endpoint verify-payment mà FE poll có thể cùng
 * chạy, cùng thấy chưa có bản ghi nào, và cùng cộng ví — khách được hoàn tiền hai
 * lần cho một giao dịch.
 *
 * Chỉ đánh index PARTIAL cho đúng reference_type này, KHÔNG ràng buộc toàn bảng:
 * dữ liệu hiện có có nhiều cặp (reference_id, reference_type) lặp lại hợp lệ —
 * một lần chuyển tiền ghi hai dòng cho hai ví khác nhau, hoặc một yêu cầu rút tiền
 * bị duyệt lại nhiều lần với đủ cặp trừ/hoàn. Ép UNIQUE toàn bảng sẽ vừa hỏng
 * migration vừa chặn các luồng đang đúng.
 *
 * `reference_type` đã cố định trong mệnh đề WHERE nên chỉ cần index `reference_id`.
 */
export class AddUniqueOnlineDraftRefund1787600000000 implements MigrationInterface {
  name = 'AddUniqueOnlineDraftRefund1787600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows = (await queryRunner.query(`
      SELECT COUNT(*)::text AS count FROM (
        SELECT 1 FROM "wallet_transactions"
        WHERE "reference_type" = 'BOOKING_ONLINE_DRAFT_REFUND'
          AND "reference_id" IS NOT NULL
        GROUP BY "reference_id"
        HAVING COUNT(*) > 1
      ) AS dup
    `)) as Array<{ count: string }>;
    const duplicates = Number(rows[0]?.count ?? 0);

    if (duplicates > 0) {
      throw new Error(
        `Có ${duplicates} đơn nháp đã bị hoàn tiền nhiều hơn một lần. ` +
          'Hãy đối soát và xử lý các bản ghi trùng trước khi thêm ràng buộc này.',
      );
    }

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_wallet_tx_online_draft_refund"
        ON "wallet_transactions" ("reference_id")
        WHERE "reference_type" = 'BOOKING_ONLINE_DRAFT_REFUND'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_wallet_tx_online_draft_refund"`,
    );
  }
}
