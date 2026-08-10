import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { DataSource } from 'typeorm';
import { AddCustomerAbsenceEnums1788000000000 } from '../../database/migrations/1788000000000-AddCustomerAbsenceEnums';
import { CreateCustomerDebts1788000000002 } from '../../database/migrations/1788000000002-CreateCustomerDebts';

jest.setTimeout(120_000);

const TEST_DB = 'cleanz_customer_debt_migration_compat_test';

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

describe('Customer debt migration compatibility (integration)', () => {
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
    await legacy.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await legacy.query(`CREATE TYPE cancelled_by AS ENUM ('SYSTEM')`);
    await legacy.query(`CREATE TYPE notification_type AS ENUM ('SYSTEM')`);
    await legacy.query(
      `CREATE TYPE customer_debt_source AS ENUM ('CUSTOMER_NO_SHOW_TRAVEL')`,
    );
    await legacy.query(
      `CREATE TYPE customer_debt_status AS ENUM ('OUTSTANDING', 'RECOVERED', 'WRITTEN_OFF')`,
    );
    await legacy.query(`CREATE TABLE users (id uuid PRIMARY KEY)`);
    await legacy.query(`
      CREATE TABLE customers (
        id uuid PRIMARY KEY,
        user_id uuid REFERENCES users(id)
      )
    `);
    await legacy.query(
      `CREATE TABLE wallet_topup_orders (id uuid PRIMARY KEY)`,
    );
    await legacy.query(`
      CREATE TABLE customer_debts (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        customer_id uuid NOT NULL REFERENCES customers(id),
        source customer_debt_source NOT NULL,
        source_ref_id uuid NOT NULL,
        source_code varchar(40),
        original_amount numeric(12,2) NOT NULL,
        recovered_amount numeric(12,2) NOT NULL DEFAULT 0,
        written_off_amount numeric(12,2) NOT NULL DEFAULT 0,
        status customer_debt_status NOT NULL DEFAULT 'OUTSTANDING',
        written_off_at timestamp,
        write_off_reason text,
        written_off_by_admin_id uuid REFERENCES users(id),
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        CONSTRAINT uq_customer_debt_source UNIQUE (source, source_ref_id)
      )
    `);
    await legacy.query(
      `INSERT INTO users (id) VALUES ('10000000-0000-4000-8000-000000000001')`,
    );
    await legacy.query(
      `INSERT INTO customers (id, user_id) VALUES (
        '20000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000001'
      )`,
    );
    await legacy.query(`
      INSERT INTO customer_debts (
        customer_id, source, source_ref_id, source_code, original_amount
      ) VALUES (
        '20000000-0000-4000-8000-000000000001',
        'CUSTOMER_NO_SHOW_TRAVEL',
        '30000000-0000-4000-8000-000000000001',
        'LEGACY-001',
        75000
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

  it('mở rộng schema cũ, giữ nguyên nợ lịch sử và rollback chỉ phần do migration sở hữu', async () => {
    const dataSource = new DataSource({
      ...databaseOptions(),
      database: TEST_DB,
      migrations: [
        AddCustomerAbsenceEnums1788000000000,
        CreateCustomerDebts1788000000002,
      ],
      migrationsTableName: 'migrations',
      migrationsTransactionMode: 'each',
    });
    await dataSource.initialize();

    const applied = await dataSource.runMigrations();
    expect(applied.map((migration) => migration.name)).toEqual([
      'AddCustomerAbsenceEnums1788000000000',
      'CreateCustomerDebts1788000000002',
    ]);
    const [legacyDebt] = await dataSource.query(
      `SELECT source, original_amount FROM customer_debts WHERE source_code='LEGACY-001'`,
    );
    expect(legacyDebt).toEqual(
      expect.objectContaining({
        source: 'CUSTOMER_NO_SHOW_TRAVEL',
        original_amount: '75000.00',
      }),
    );
    const enumValues = await dataSource.query(`
      SELECT enumlabel
        FROM pg_enum e
        JOIN pg_type t ON t.oid=e.enumtypid
       WHERE t.typname='customer_debt_source'
       ORDER BY e.enumsortorder
    `);
    expect(
      enumValues.map((row: { enumlabel: string }) => row.enumlabel),
    ).toEqual(['CUSTOMER_NO_SHOW_TRAVEL', 'ABSENCE_COMPENSATION']);
    expect(
      await dataSource.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns
           WHERE table_schema='public'
             AND table_name='wallet_topup_orders'
             AND column_name='debt_recovered_amount'
        ) AS exists
      `),
    ).toEqual([{ exists: true }]);

    await dataSource.undoLastMigration({ transaction: 'each' });

    expect(
      await dataSource.query(`SELECT source_code FROM customer_debts`),
    ).toEqual([{ source_code: 'LEGACY-001' }]);
    expect(
      await dataSource.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns
           WHERE table_schema='public'
             AND table_name='wallet_topup_orders'
             AND column_name='debt_recovered_amount'
        ) AS exists
      `),
    ).toEqual([{ exists: false }]);

    await dataSource.destroy();
  });
});
