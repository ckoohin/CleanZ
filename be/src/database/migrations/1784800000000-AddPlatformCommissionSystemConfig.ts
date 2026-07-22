import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Chuyển tỷ lệ hoa hồng nền tảng thành một cấu hình toàn hệ thống do Admin
 * quản lý tại Cài đặt → Tài chính. Cột cùng tên trong pricing_configs được giữ
 * lại để tương thích dữ liệu cũ nhưng không còn là nguồn tính phí.
 */
export class AddPlatformCommissionSystemConfig1784800000000 implements MigrationInterface {
  name = 'AddPlatformCommissionSystemConfig1784800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO system_configs (config_key, config_value, description)
      VALUES (
        'PLATFORM_COMMISSION_RATE_PERCENT',
        '20',
        'Phần trăm nền tảng khấu trừ trên giá trị đơn trước khi áp dụng voucher.'
      )
      ON CONFLICT (config_key) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM system_configs
      WHERE config_key = 'PLATFORM_COMMISSION_RATE_PERCENT'
    `);
  }
}
