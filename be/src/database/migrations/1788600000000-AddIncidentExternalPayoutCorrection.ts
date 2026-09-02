import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Sổ sửa sai cho khoản chi trả THỦ CÔNG (chuyển khoản ngoài ví).
 *
 * Trước đây `external_payout_amount` được gán cứng bằng số đã duyệt và không có đường
 * sửa: admin chuyển nhầm số tiền hoặc nhầm người thì con số đó sai vĩnh viễn, mà nó lại
 * là bản ghi DUY NHẤT cho tiền rời tài khoản ngân hàng công ty.
 *
 * - `external_payout_loss_amount`: tiền đã rời ngân hàng nhưng KHÔNG đến tay khách
 *   (chuyển nhầm người / chuyển thừa) — nền tảng chịu mất, tách hẳn khỏi khoản trả khách.
 * - `external_payout_corrected_at/by`: dấu vết lần sửa gần nhất (lịch sử đầy đủ nằm ở
 *   incident_status_logs + audit).
 */
export class AddIncidentExternalPayoutCorrection1788600000000 implements MigrationInterface {
  name = 'AddIncidentExternalPayoutCorrection1788600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "incidents"
        ADD COLUMN IF NOT EXISTS "external_payout_loss_amount" numeric(12,2),
        ADD COLUMN IF NOT EXISTS "external_payout_corrected_at" timestamp,
        ADD COLUMN IF NOT EXISTS "external_payout_corrected_by_admin_id" uuid
    `);

    // FK tách riêng: cột có thể đã tồn tại từ lần chạy trước mà ràng buộc thì chưa.
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "incidents"
          ADD CONSTRAINT "fk_incidents_external_payout_corrected_by"
          FOREIGN KEY ("external_payout_corrected_by_admin_id")
          REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "incidents"
        DROP CONSTRAINT IF EXISTS "fk_incidents_external_payout_corrected_by"
    `);
    await queryRunner.query(`
      ALTER TABLE "incidents"
        DROP COLUMN IF EXISTS "external_payout_corrected_by_admin_id",
        DROP COLUMN IF EXISTS "external_payout_corrected_at",
        DROP COLUMN IF EXISTS "external_payout_loss_amount"
    `);
  }
}
