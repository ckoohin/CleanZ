import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Thêm ADYEN làm phương thức thanh toán booking (charge thẻ trực tiếp, sandbox).
 * Không cần cột mới trên bookings/payments — pspReference lưu vào
 * payments.transaction_code (cột nullable đã có sẵn).
 */
export class AddAdyenPaymentMethod1784800000000 implements MigrationInterface {
  name = 'AddAdyenPaymentMethod1784800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."payment_method" ADD VALUE IF NOT EXISTS 'ADYEN'`,
    );
  }

  public async down(): Promise<void> {
    // Enum value không drop được trong Postgres — chấp nhận giữ lại.
  }
}
