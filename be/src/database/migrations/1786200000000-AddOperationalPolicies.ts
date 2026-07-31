import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOperationalPolicies1786200000000 implements MigrationInterface {
  name = 'AddOperationalPolicies1786200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "booking_status_logs"
       ADD COLUMN "policy_snapshot" jsonb`,
    );

    await queryRunner.query(`
      INSERT INTO "system_configs" ("config_key", "config_value", "description")
      VALUES
        (
          'TASKER_CANCEL_TIME_PENALTY_RULES',
          jsonb_build_object(
            'version', 1,
            'effectiveFrom', now(),
            'rules', jsonb_build_array(
              jsonb_build_object('hoursBeforeStart', 24, 'penaltyPercent', 0),
              jsonb_build_object('hoursBeforeStart', 8, 'penaltyPercent', 50),
              jsonb_build_object('hoursBeforeStart', 0, 'penaltyPercent', 100)
            )
          )::text,
          'Phí hủy Tasker theo thời gian còn lại trước ca làm'
        ),
        (
          'CHECKIN_OPERATION_POLICY',
          jsonb_build_object(
            'version', 1,
            'effectiveFrom', now(),
            'openBeforeMinutes', 30,
            'autoApproveRadiusMeters', 50
          )::text,
          'Cửa sổ và bán kính tự duyệt check-in'
        ),
        (
          'CUSTOMER_SCHEDULING_POLICY',
          jsonb_build_object(
            'version', 1,
            'effectiveFrom', now(),
            'minAdvanceMinutes', 60,
            'maxAdvanceDays', 30
          )::text,
          'Giới hạn đặt lịch trước của khách hàng'
        )
      ON CONFLICT ("config_key") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "system_configs"
      WHERE "config_key" IN (
        'TASKER_CANCEL_TIME_PENALTY_RULES',
        'CHECKIN_OPERATION_POLICY',
        'CUSTOMER_SCHEDULING_POLICY'
      )
    `);
    await queryRunner.query(
      `ALTER TABLE "booking_status_logs" DROP COLUMN "policy_snapshot"`,
    );
  }
}
