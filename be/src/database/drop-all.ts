import dataSource from './data-source';

const REQUIRED_EXTENSIONS = ['uuid-ossp', 'postgis'];

const quoteIdentifier = (value: string): string =>
  `"${value.replace(/"/g, '""')}"`;

const dropAll = async (): Promise<void> => {
  await dataSource.initialize();

  try {
    await dataSource.query('DROP SCHEMA IF EXISTS public CASCADE');
    await dataSource.query('CREATE SCHEMA public');

    for (const extension of REQUIRED_EXTENSIONS) {
      await dataSource.query(
        `CREATE EXTENSION IF NOT EXISTS ${quoteIdentifier(extension)}`,
      );
    }

    console.log('Dropped all public tables, enum types, and data.');
  } finally {
    await dataSource.destroy();
  }
};

void dropAll().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
