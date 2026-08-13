import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Một lần thu tiền qua cổng chỉ được sinh đúng một bút toán ONLINE đã thanh toán.
 *
 * Trước đây `payments.transaction_code` không có ràng buộc nào (baseline chỉ tạo
 * PK trên `id`), nên khi luồng dựng booking từ đơn nháp chạy hai lần cho cùng một
 * `payosOrderCode` thì database không chặn — kết quả là hai booking từ một lần
 * khách trả tiền. Phần logic đã được làm idempotent ở
 * `CustomerBookingService.createBookingFromPaidDraft`; index này là chốt chặn
 * cuối, để một đường code mới trong tương lai không lặng lẽ mở lại lỗ đó.
 *
 * Phạm vi index cố tình hẹp — chỉ `method = 'ONLINE' AND status = 'PAID'`:
 * - Bút toán PENDING/FAILED của cùng một booking có thể mang mã trùng khi khách
 *   mở lại link thanh toán; siết cả những dòng đó sẽ chặn nhầm luồng retry.
 * - Bất biến nghiệp vụ thật sự chỉ nằm ở các bút toán đã thu được tiền.
 */
export class AddPaidOnlinePaymentTransactionCodeUnique1788400000000 implements MigrationInterface {
  name = 'AddPaidOnlinePaymentTransactionCodeUnique1788400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Dữ liệu trùng sẵn có = đã có khách bị tạo hai đơn từ một lần trả tiền.
    // Không tự ý gộp/xoá: đây là dữ liệu tiền, phải người thật đối soát. Fail sớm
    // với danh sách cụ thể thay vì để index tạo thất bại với thông báo khó hiểu.
    await queryRunner.query(`
      DO $$
      DECLARE duplicates text;
      BEGIN
        SELECT string_agg(
                 format('transaction_code=%s (%s bút toán)', transaction_code, cnt),
                 '; ' ORDER BY transaction_code)
          INTO duplicates
          FROM (
            SELECT transaction_code, COUNT(*) AS cnt
              FROM payments
             WHERE transaction_code IS NOT NULL
               AND method = 'ONLINE'
               AND status = 'PAID'
             GROUP BY transaction_code
            HAVING COUNT(*) > 1
          ) AS dup;
        IF duplicates IS NOT NULL THEN
          RAISE EXCEPTION
            'payments có mã giao dịch ONLINE/PAID bị trùng, cần đối soát thủ công trước khi tạo unique index: %',
            duplicates;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_payments_paid_online_transaction_code"
        ON "payments" ("transaction_code")
        WHERE "transaction_code" IS NOT NULL
          AND "method" = 'ONLINE'
          AND "status" = 'PAID'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "uq_payments_paid_online_transaction_code"`,
    );
  }
}
