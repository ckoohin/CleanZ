import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ghi nhận khoản bồi thường công ty chi NGOÀI ví (chuyển khoản ngân hàng thủ công).
 *
 * Luồng chi trả thủ công cố tình KHÔNG debit ví SYSTEM — nó tồn tại chính vì ví SYSTEM đang
 * cạn. Hệ quả: tiền thật rời khỏi tài khoản ngân hàng công ty mà không nằm trong bất kỳ sổ
 * nào; bằng chứng duy nhất là ảnh chuyển khoản. Không có câu trả lời cho "tháng này nền
 * tảng chi bao nhiêu tiền bồi thường ngoài luồng ví".
 *
 * Đây là sổ chi ngoài, tách khỏi sổ ví — cộng hai sổ mới ra tổng chi thật của nền tảng.
 */
export class AddIncidentExternalPayoutLedger1786700000000 implements MigrationInterface {
  name = 'AddIncidentExternalPayoutLedger1786700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "incidents"
        ADD COLUMN IF NOT EXISTS "external_payout_amount" numeric(12,2),
        ADD COLUMN IF NOT EXISTS "external_payout_at" timestamp,
        ADD COLUMN IF NOT EXISTS "external_payout_note" text,
        ADD COLUMN IF NOT EXISTS "external_payout_by_admin_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "incidents"
        ADD CONSTRAINT "fk_incidents_external_payout_by_admin"
        FOREIGN KEY ("external_payout_by_admin_id") REFERENCES "users"("id")
        ON DELETE SET NULL ON UPDATE CASCADE
    `);
    // Báo cáo tài chính cộng theo kỳ → index trên mốc chi.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_inc_external_payout_at"
        ON "incidents" ("external_payout_at")
        WHERE "external_payout_at" IS NOT NULL
    `);

    // Backfill hồ sơ đã chi trả thủ công trước đây: nhận diện bằng "đã chi trả xong +
    // có ảnh minh chứng chuyển khoản + KHÔNG có bút toán REFUND vào ví khách".
    await queryRunner.query(`
      UPDATE "incidents" i
         SET "external_payout_amount" = i."approved_compensation_amount",
             "external_payout_at"     = i."resolved_at",
             "external_payout_note"   = 'Backfill: nhận diện từ ảnh minh chứng chuyển khoản'
       WHERE i."resolved_at" IS NOT NULL
         AND COALESCE(i."approved_compensation_amount", 0) > 0
         AND EXISTS (
           SELECT 1 FROM "incident_evidences" e
            WHERE e."incident_id" = i."id"
              AND e."purpose" = 'COMPENSATION_TRANSFER_PROOF'
              AND e."is_soft_deleted" = false
         )
         AND NOT EXISTS (
           SELECT 1 FROM "wallet_transactions" wt
            WHERE wt."reference_id" = i."id"
              AND wt."reference_type" LIKE 'INCIDENT_COMPENSATION:v%'
              AND wt."type" = 'REFUND'
         )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_inc_external_payout_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP CONSTRAINT IF EXISTS "fk_incidents_external_payout_by_admin"`,
    );
    await queryRunner.query(`
      ALTER TABLE "incidents"
        DROP COLUMN IF EXISTS "external_payout_amount",
        DROP COLUMN IF EXISTS "external_payout_at",
        DROP COLUMN IF EXISTS "external_payout_note",
        DROP COLUMN IF EXISTS "external_payout_by_admin_id"
    `);
  }
}
