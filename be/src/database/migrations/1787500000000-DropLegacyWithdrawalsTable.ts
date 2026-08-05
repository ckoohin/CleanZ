import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Bỏ bảng `withdrawals` của luồng rút tiền cũ.
 *
 * Luồng này chưa từng có controller/service — `src/modules/withdrawal/` chỉ đăng ký
 * entity, nên bảng luôn rỗng. Nơi duy nhất còn đọc nó là hai KPI trên dashboard
 * admin ("Yêu cầu rút tiền chờ duyệt" / "Tổng tiền rút đang chờ"), khiến hai số
 * này luôn bằng 0 trong khi thực tế có đơn đang chờ ở
 * `tasker_withdrawal_requests` và `customer_withdrawal_requests`.
 *
 * Dashboard đã chuyển sang đọc hai bảng thật; bảng cũ không còn chỗ dùng.
 *
 * AN TOÀN: chỉ drop khi bảng thực sự rỗng. Nếu có dữ liệu (môi trường khác với
 * dev) thì migration dừng lại và báo lỗi để người vận hành xử lý thủ công, thay
 * vì âm thầm xoá dữ liệu tiền bạc.
 */
export class DropLegacyWithdrawalsTable1787500000000 implements MigrationInterface {
  name = 'DropLegacyWithdrawalsTable1787500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasTable('withdrawals');
    if (!exists) return;

    const rows = (await queryRunner.query(
      `SELECT COUNT(*)::text AS count FROM "withdrawals"`,
    )) as Array<{ count: string }>;
    const count = Number(rows[0]?.count ?? 0);

    if (count > 0) {
      throw new Error(
        `Bảng "withdrawals" còn ${count} bản ghi — không tự động xoá. ` +
          'Hãy đối chiếu và di trú dữ liệu sang tasker_withdrawal_requests trước, ' +
          'rồi chạy lại migration này.',
      );
    }

    await queryRunner.query(`DROP TABLE "withdrawals"`);
    // Enum `withdrawal_status` chỉ được bảng này dùng (đã kiểm bằng pg_attribute),
    // nên xoá luôn để không để lại type mồ côi.
    await queryRunner.query(`DROP TYPE IF EXISTS "withdrawal_status"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'withdrawal_status') THEN
          CREATE TYPE "withdrawal_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
        END IF;
      END $$;
    `);

    // Dựng lại đúng schema cũ, kể cả default timestamp theo giờ VN.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "withdrawals" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tasker_id" uuid NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "status" "withdrawal_status" NOT NULL DEFAULT 'PENDING',
        "created_at" timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Ho_Chi_Minh'),
        "updated_at" timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Ho_Chi_Minh'),
        CONSTRAINT "PK_9871ec481baa7755f8bd8b7c7e9" PRIMARY KEY ("id")
      )
    `);
  }
}
