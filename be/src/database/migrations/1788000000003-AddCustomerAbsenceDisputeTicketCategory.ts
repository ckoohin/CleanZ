import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomerAbsenceDisputeTicketCategory1788000000003 implements MigrationInterface {
  name = 'AddCustomerAbsenceDisputeTicketCategory1788000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."ticket_category" ADD VALUE IF NOT EXISTS 'CUSTOMER_ABSENCE_DISPUTE'`,
    );
  }

  // PostgreSQL không hỗ trợ xoá riêng enum value an toàn.
  public async down(): Promise<void> {}
}
