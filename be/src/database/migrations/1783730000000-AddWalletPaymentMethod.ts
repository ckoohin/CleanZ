import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Cho phép thanh toán booking bằng số dư ví CleanZ.
 * Postgres không hỗ trợ gỡ giá trị khỏi enum → down() chỉ đổi các booking đang
 * dùng WALLET về CASH để không còn tham chiếu, giá trị enum vẫn nằm lại.
 */
export class AddWalletPaymentMethod1783730000000 implements MigrationInterface {
  name = 'AddWalletPaymentMethod1783730000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'WALLET'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE bookings SET payment_method = 'CASH' WHERE payment_method = 'WALLET'`,
    );
    await queryRunner.query(
      `UPDATE payments SET method = 'CASH' WHERE method = 'WALLET'`,
    );
  }
}
