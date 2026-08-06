import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Booking ONLINE chuyển sang "trả tiền trước, tạo đơn sau": lựa chọn của khách
 * nằm ở booking_quotes cho tới khi PayOS báo PAID mới ghi vào bảng bookings.
 *
 * Tận dụng bảng booking_quotes có sẵn (đã là snapshot lựa chọn + giá + expires_at)
 * thay vì thêm bảng mới; các cột dưới đây chỉ có giá trị cho quote của luồng ONLINE.
 */
export class AddOnlineDraftToBookingQuotes1787300000000 implements MigrationInterface {
  name = 'AddOnlineDraftToBookingQuotes1787300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "booking_quotes"
        ADD COLUMN IF NOT EXISTS "payload" jsonb,
        ADD COLUMN IF NOT EXISTS "user_id" uuid,
        ADD COLUMN IF NOT EXISTS "payos_order_code" bigint,
        ADD COLUMN IF NOT EXISTS "payment_link_id" character varying(100),
        ADD COLUMN IF NOT EXISTS "qr_code" text,
        ADD COLUMN IF NOT EXISTS "checkout_url" text,
        ADD COLUMN IF NOT EXISTS "bin" character varying(10),
        ADD COLUMN IF NOT EXISTS "account_number" character varying(50),
        ADD COLUMN IF NOT EXISTS "account_name" character varying(255),
        ADD COLUMN IF NOT EXISTS "payment_state" "payment_status",
        ADD COLUMN IF NOT EXISTS "booking_id" uuid,
        ADD COLUMN IF NOT EXISTS "fail_reason" text
    `);

    // Chỉ quote của luồng ONLINE mới có orderCode → unique một phần, quote thường
    // (payos_order_code NULL) không bị ràng buộc.
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_booking_quotes_payos_order_code" ON "booking_quotes" ("payos_order_code") WHERE "payos_order_code" IS NOT NULL`,
    );
    // Job dọn đơn nháp quá hạn quét theo (payment_state, expires_at).
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_booking_quotes_draft_sweep" ON "booking_quotes" ("payment_state", "expires_at") WHERE "payment_state" IS NOT NULL`,
    );
    // Postgres không có `ADD CONSTRAINT IF NOT EXISTS`. Mọi câu khác trong migration
    // này đều idempotent, riêng ràng buộc dưới đây thì không — nên nếu schema đã được
    // áp bằng đường khác (synchronize, chạy tay, một lượt migration hỏng giữa chừng)
    // thì lần chạy sau chết ở đúng đây với lỗi 42710 và cả migration không bao giờ
    // ghi được vào bảng `migrations`. Bọc bằng DO block để chạy lại vẫn an toàn.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_2e5232be9e63f6debd20be5e2c0'
            AND conrelid = 'booking_quotes'::regclass
        ) THEN
          ALTER TABLE "booking_quotes"
            ADD CONSTRAINT "FK_2e5232be9e63f6debd20be5e2c0"
            FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "booking_quotes" DROP CONSTRAINT IF EXISTS "FK_2e5232be9e63f6debd20be5e2c0"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_booking_quotes_draft_sweep"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_booking_quotes_payos_order_code"`,
    );
    await queryRunner.query(`
      ALTER TABLE "booking_quotes"
        DROP COLUMN IF EXISTS "fail_reason",
        DROP COLUMN IF EXISTS "booking_id",
        DROP COLUMN IF EXISTS "payment_state",
        DROP COLUMN IF EXISTS "account_name",
        DROP COLUMN IF EXISTS "account_number",
        DROP COLUMN IF EXISTS "bin",
        DROP COLUMN IF EXISTS "checkout_url",
        DROP COLUMN IF EXISTS "qr_code",
        DROP COLUMN IF EXISTS "payment_link_id",
        DROP COLUMN IF EXISTS "payos_order_code",
        DROP COLUMN IF EXISTS "user_id",
        DROP COLUMN IF EXISTS "payload"
    `);
  }
}
