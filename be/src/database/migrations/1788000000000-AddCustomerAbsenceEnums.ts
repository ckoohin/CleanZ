import { MigrationInterface, QueryRunner } from 'typeorm';

const NOTIFICATION_TYPES = [
  'BOOKING_ABSENCE_REPORTED',
  'BOOKING_ABSENCE_APPROVED',
  'BOOKING_ABSENCE_REJECTED',
  'BOOKING_ABSENCE_EXPIRED',
];

export class AddCustomerAbsenceEnums1788000000000 implements MigrationInterface {
  name = 'AddCustomerAbsenceEnums1788000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'booking_absence_report_status'
        ) THEN
          CREATE TYPE "booking_absence_report_status" AS ENUM
            ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED');
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'customer_debt_source'
        ) THEN
          CREATE TYPE "customer_debt_source" AS ENUM
            ('CUSTOMER_NO_SHOW_TRAVEL', 'ABSENCE_COMPENSATION');
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'customer_debt_status'
        ) THEN
          CREATE TYPE "customer_debt_status" AS ENUM
            ('OUTSTANDING', 'RECOVERED', 'WRITTEN_OFF');
        END IF;
      END $$;
    `);
    // Một số DB đã có sổ nợ customer từ nhánh no-show cũ. Không thay/rename enum
    // đó; chỉ mở rộng để bảo toàn toàn bộ dữ liệu lịch sử.
    await queryRunner.query(
      `ALTER TYPE "public"."customer_debt_source" ADD VALUE IF NOT EXISTS 'CUSTOMER_NO_SHOW_TRAVEL'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."customer_debt_source" ADD VALUE IF NOT EXISTS 'ABSENCE_COMPENSATION'`,
    );
    for (const status of [
      'PENDING_REVIEW',
      'APPROVED',
      'REJECTED',
      'EXPIRED',
    ]) {
      await queryRunner.query(
        `ALTER TYPE "public"."booking_absence_report_status" ADD VALUE IF NOT EXISTS '${status}'`,
      );
    }
    for (const status of ['OUTSTANDING', 'RECOVERED', 'WRITTEN_OFF']) {
      await queryRunner.query(
        `ALTER TYPE "public"."customer_debt_status" ADD VALUE IF NOT EXISTS '${status}'`,
      );
    }
    await queryRunner.query(
      `ALTER TYPE "public"."cancelled_by" ADD VALUE IF NOT EXISTS 'CUSTOMER_ABSENT'`,
    );
    for (const type of NOTIFICATION_TYPES) {
      await queryRunner.query(
        `ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS '${type}'`,
      );
    }
  }

  // PostgreSQL không hỗ trợ xoá riêng enum value. Các enum chỉ dành cho bảng mới
  // được giữ lại để rollback không phá dữ liệu/migration chạy sau.
  public async down(): Promise<void> {}
}
