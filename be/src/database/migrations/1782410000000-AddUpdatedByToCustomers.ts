import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Bổ sung cột `customers.updated_by` (CustomerEntity.updatedBy — uuid, nullable)
 * để truy vết admin đã cập nhật hồ sơ khách hàng gần nhất. Additive + idempotent.
 */
export class AddUpdatedByToCustomers1782410000000 implements MigrationInterface {
  name = 'AddUpdatedByToCustomers1782410000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "updated_by" uuid`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "customers" DROP COLUMN IF EXISTS "updated_by"`,
    );
  }
}
