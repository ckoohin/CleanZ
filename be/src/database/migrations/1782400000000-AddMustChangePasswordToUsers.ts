import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Bổ sung cột `users.must_change_password` (User.mustChangePassword — boolean,
 * default false). Dùng để buộc đổi mật khẩu ở lần đăng nhập đầu tiên với các
 * tài khoản admin tạo bằng mật khẩu tạm. Additive + idempotent.
 */
export class AddMustChangePasswordToUsers1782400000000 implements MigrationInterface {
  name = 'AddMustChangePasswordToUsers1782400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "must_change_password" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "must_change_password"`,
    );
  }
}
