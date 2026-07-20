import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Thay thế VNPay bằng Adyen cho nạp ví:
 * - topup_status thêm 'REFUND_PENDING' (Adyen refund là bất đồng bộ — chờ webhook REFUND).
 * - wallet_topup_orders: thêm cột đối soát Adyen (session/psp reference).
 * - Xóa bảng vnpay_card_tokens (chỉ chứa token sandbox test, VNPay đã gỡ bỏ hoàn toàn;
 *   Adyen lưu payment method phía họ qua shopperReference, không cần bảng local).
 * - Các cột VNPay cũ trên wallet_topup_orders (gateway_txn_no, bank_code, pay_date,
 *   card_token_id) GIỮ NGUYÊN — là dữ liệu lịch sử thật của các đơn VNPay cũ, không xóa.
 */
export class ReplaceVnpayWithAdyen1784700000000 implements MigrationInterface {
  name = 'ReplaceVnpayWithAdyen1784700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."topup_status" ADD VALUE IF NOT EXISTS 'REFUND_PENDING'`,
    );

    await queryRunner.query(
      `ALTER TABLE "wallet_topup_orders" ADD COLUMN IF NOT EXISTS "adyen_session_id" varchar(48)`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_topup_orders" ADD COLUMN IF NOT EXISTS "adyen_psp_reference" varchar(32)`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_topup_orders" ADD COLUMN IF NOT EXISTS "adyen_refund_psp_reference" varchar(32)`,
    );

    await queryRunner.query(`DROP TABLE IF EXISTS "vnpay_card_tokens"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "wallet_topup_orders" DROP COLUMN IF EXISTS "adyen_refund_psp_reference"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_topup_orders" DROP COLUMN IF EXISTS "adyen_psp_reference"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_topup_orders" DROP COLUMN IF EXISTS "adyen_session_id"`,
    );
    // vnpay_card_tokens: không tái tạo lại (đã bỏ hẳn VNPay).
    // Enum value 'REFUND_PENDING' không drop được trong Postgres — chấp nhận giữ lại.
  }
}
