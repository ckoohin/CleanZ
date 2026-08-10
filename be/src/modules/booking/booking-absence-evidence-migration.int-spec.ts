import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { DataSource } from 'typeorm';
import { AddAbsenceCallHistoryPhoto1788000000004 } from '../../database/migrations/1788000000004-AddAbsenceCallHistoryPhoto';

jest.setTimeout(120_000);

const TEST_DB = 'cleanz_absence_evidence_migration_test';

function loadEnv(): void {
  const path = resolve(process.cwd(), '.env');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;
    process.env[trimmed.slice(0, separator).trim()] ??= trimmed
      .slice(separator + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '');
  }
}

async function queryRows<T>(dataSource: DataSource, sql: string): Promise<T[]> {
  const result: unknown = await dataSource.query(sql);
  if (!Array.isArray(result)) throw new Error('Expected PostgreSQL row array');
  return result as T[];
}

describe('Absence call-history evidence migration (integration)', () => {
  const databaseOptions = () => ({
    type: 'postgres' as const,
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
  });

  beforeAll(async () => {
    loadEnv();
    const admin = new DataSource({
      ...databaseOptions(),
      database: 'postgres',
    });
    await admin.initialize();
    await admin
      .query(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`)
      .catch(() => undefined);
    await admin.query(`CREATE DATABASE ${TEST_DB}`);
    await admin.destroy();

    const legacy = new DataSource({
      ...databaseOptions(),
      database: TEST_DB,
    });
    await legacy.initialize();
    await legacy.query(`
      CREATE TABLE booking_absence_reports (
        id uuid PRIMARY KEY,
        proof_photo_url text NOT NULL
      )
    `);
    await legacy.query(`
      INSERT INTO booking_absence_reports (id, proof_photo_url)
      VALUES (
        '10000000-0000-4000-8000-000000000001',
        'https://example.com/legacy-address.jpg'
      )
    `);
    await legacy.destroy();
  });

  afterAll(async () => {
    loadEnv();
    const admin = new DataSource({
      ...databaseOptions(),
      database: 'postgres',
    });
    await admin.initialize();
    await admin
      .query(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`)
      .catch(() => undefined);
    await admin.destroy();
  });

  it('giữ hồ sơ cũ, thêm cột nullable và rollback đúng phần sở hữu', async () => {
    const dataSource = new DataSource({
      ...databaseOptions(),
      database: TEST_DB,
      migrations: [AddAbsenceCallHistoryPhoto1788000000004],
      migrationsTableName: 'migrations',
      migrationsTransactionMode: 'each',
    });
    await dataSource.initialize();

    const applied = await dataSource.runMigrations();
    expect(applied.map((migration) => migration.name)).toEqual([
      'AddAbsenceCallHistoryPhoto1788000000004',
    ]);
    expect(
      await queryRows<{ is_nullable: string }>(
        dataSource,
        `SELECT is_nullable
           FROM information_schema.columns
          WHERE table_schema='public'
            AND table_name='booking_absence_reports'
            AND column_name='call_history_photo_url'`,
      ),
    ).toEqual([{ is_nullable: 'YES' }]);
    expect(
      await queryRows<{ call_history_photo_url: string | null }>(
        dataSource,
        `SELECT call_history_photo_url FROM booking_absence_reports`,
      ),
    ).toEqual([{ call_history_photo_url: null }]);

    await dataSource.undoLastMigration({ transaction: 'each' });

    expect(
      await queryRows<{ exists: boolean }>(
        dataSource,
        `SELECT EXISTS (
           SELECT 1 FROM information_schema.columns
            WHERE table_schema='public'
              AND table_name='booking_absence_reports'
              AND column_name='call_history_photo_url'
         ) AS exists`,
      ),
    ).toEqual([{ exists: false }]);
    expect(
      await queryRows<{ count: number }>(
        dataSource,
        `SELECT COUNT(*)::int AS count FROM booking_absence_reports`,
      ),
    ).toEqual([{ count: 1 }]);

    await dataSource.destroy();
  });
});
