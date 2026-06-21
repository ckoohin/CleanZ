import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillAdminAdjustmentActors1782086500000 implements MigrationInterface {
  name = 'BackfillAdminAdjustmentActors1782086500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "wallet_transactions" AS transaction
      SET "description" = CONCAT(
        COALESCE(NULLIF(transaction."description", ''), 'Điều chỉnh số dư'),
        ' | Điều chỉnh bởi Admin: ',
        admin."full_name",
        ' (',
        admin."email",
        ')'
      )
      FROM "users" AS admin
      WHERE transaction."reference_type" = 'ADMIN_ADJUSTMENT'
        AND transaction."reference_id" = admin."id"
        AND COALESCE(transaction."description", '')
          NOT LIKE '% | Điều chỉnh bởi Admin:%'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "wallet_transactions"
      SET "description" = REGEXP_REPLACE(
        "description",
        ' \\| Điều chỉnh bởi Admin:.*$',
        ''
      )
      WHERE "reference_type" = 'ADMIN_ADJUSTMENT'
        AND COALESCE("description", '') LIKE '% | Điều chỉnh bởi Admin:%'
    `);
  }
}
