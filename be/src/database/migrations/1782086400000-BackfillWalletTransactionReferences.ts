import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillWalletTransactionReferences1782086400000 implements MigrationInterface {
  name = 'BackfillWalletTransactionReferences1782086400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "wallet_transactions"
      SET
        "reference_id" = "booking_id",
        "reference_type" = 'BOOKING'
      WHERE "booking_id" IS NOT NULL
        AND "reference_id" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "wallet_transactions"
      SET
        "reference_id" = NULL,
        "reference_type" = NULL
      WHERE "booking_id" IS NOT NULL
        AND "reference_id" = "booking_id"
        AND "reference_type" = 'BOOKING'
    `);
  }
}
