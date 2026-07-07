import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Bổ sung các cột mà entity Voucher/CustomerVoucher đã khai báo nhưng DB (dựng
 * bằng synchronize cũ) còn thiếu — nguyên nhân lỗi runtime
 * `column VoucherEntity.per_customer_limit does not exist` ở admin booking detail.
 *
 * Chỉ ADD COLUMN (idempotent, không mất dữ liệu). KHÔNG drop `service_id`/
 * `current_location` (cột orphan, entity không map — vô hại). Việc dọn cột thừa
 * + FK/index churn thuộc nợ migration voucher/booking riêng.
 */
export class AlignVoucherSchemaColumns1782860000000
  implements MigrationInterface
{
  name = 'AlignVoucherSchemaColumns1782860000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vouchers" ADD COLUMN IF NOT EXISTS "per_customer_limit" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" ADD COLUMN IF NOT EXISTS "reserved_count" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" ADD COLUMN IF NOT EXISTS "package_ids" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" ADD COLUMN IF NOT EXISTS "customer_ids" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_vouchers" ADD COLUMN IF NOT EXISTS "status" character varying(20) NOT NULL DEFAULT 'ISSUED'`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_vouchers" ADD COLUMN IF NOT EXISTS "booking_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_vouchers" ADD COLUMN IF NOT EXISTS "reserved_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_vouchers" ADD COLUMN IF NOT EXISTS "used_at" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "customer_vouchers" DROP COLUMN IF EXISTS "used_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_vouchers" DROP COLUMN IF EXISTS "reserved_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_vouchers" DROP COLUMN IF EXISTS "booking_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_vouchers" DROP COLUMN IF EXISTS "status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" DROP COLUMN IF EXISTS "customer_ids"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" DROP COLUMN IF EXISTS "package_ids"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" DROP COLUMN IF EXISTS "reserved_count"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" DROP COLUMN IF EXISTS "per_customer_limit"`,
    );
  }
}
