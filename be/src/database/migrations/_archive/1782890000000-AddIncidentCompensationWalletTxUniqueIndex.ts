import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 2 (C8) — chống trừ/hoàn tiền trùng cho bồi thường sự cố.
 * Mỗi (reference_id = incidentId, type) trong nhóm INCIDENT_COMPENSATION chỉ 1 bút toán:
 * DEPOSIT_DEDUCT (Tasker), REFUND (Customer), ADJUSTMENT (quỹ SYSTEM) — mỗi loại 1 lần.
 * Reversal/adjust dùng reference_type khác nên không đụng index này.
 */
export class AddIncidentCompensationWalletTxUniqueIndex1782890000000
  implements MigrationInterface
{
  name = 'AddIncidentCompensationWalletTxUniqueIndex1782890000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_wallet_tx_incident_compensation"
      ON "wallet_transactions" ("reference_type", "reference_id", "type")
      WHERE "reference_type" = 'INCIDENT_COMPENSATION'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "uq_wallet_tx_incident_compensation"`,
    );
  }
}
