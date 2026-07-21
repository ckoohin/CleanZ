import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOnlinePaymentMethod1783740000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Postgres không cho ALTER TYPE ... ADD VALUE bên trong transaction block.
    // TypeORM chạy mỗi migration trong 1 transaction — dùng COMMIT trước để thoát.
    await queryRunner.query(`COMMIT`);
    await queryRunner.query(
      `ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'ONLINE'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Postgres không hỗ trợ xóa giá trị khỏi enum.
    // Để rollback: chuyển các row ONLINE về CASH rồi recreate enum nếu cần.
  }
}
