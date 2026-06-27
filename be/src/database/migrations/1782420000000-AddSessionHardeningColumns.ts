import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 3 — hardening phiên:
 * - `tokens.attempts`: đếm số lần nhập sai OTP để vô hiệu sau N lần (chống brute-force).
 * - `users.token_version`: bump khi deactivate/xóa/đổi role → vô hiệu refresh token cũ.
 * Additive + idempotent.
 */
export class AddSessionHardeningColumns1782420000000 implements MigrationInterface {
  name = 'AddSessionHardeningColumns1782420000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tokens" ADD COLUMN IF NOT EXISTS "attempts" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "token_version" integer NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tokens" DROP COLUMN IF EXISTS "attempts"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "token_version"`,
    );
  }
}
