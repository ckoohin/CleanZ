import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P1.1 — Idempotency bồi thường theo decisionVersion (cho phép reverse + re-compensate).
 * Settlement ref đổi từ 'INCIDENT_COMPENSATION' → 'INCIDENT_COMPENSATION:v{n}'.
 * Unique index chỉ áp cho ref settlement có version → mỗi (incident, version, loại tx) 1 lần;
 * sau reverse (bump version) re-compensate ở version mới không đụng. Reversal/debt-recovery ref
 * không khớp pattern nên không bị ràng buộc.
 */
export class VersionCompensationWalletTxIndex1782920000000
  implements MigrationInterface
{
  name = 'VersionCompensationWalletTxIndex1782920000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "uq_wallet_tx_incident_compensation"`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_wallet_tx_incident_compensation"
      ON "wallet_transactions" ("reference_type", "reference_id", "type")
      WHERE "reference_type" LIKE 'INCIDENT_COMPENSATION:v%'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "uq_wallet_tx_incident_compensation"`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_wallet_tx_incident_compensation"
      ON "wallet_transactions" ("reference_type", "reference_id", "type")
      WHERE "reference_type" = 'INCIDENT_COMPENSATION'
    `);
  }
}
