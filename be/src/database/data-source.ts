import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { DataSource } from 'typeorm';
import { resolveDatabaseSsl } from '../config/database-ssl';

const envPath = resolve(process.cwd(), '.env');

if (existsSync(envPath)) {
  const envFile = readFileSync(envPath, 'utf8');

  for (const line of envFile.split('\n')) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const rawValue = trimmedLine.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, '');

    process.env[key] ??= value;
  }
}

const getRequiredEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

const getDatabasePort = (): number => {
  const port = Number(getRequiredEnv('DB_PORT'));
  if (!Number.isInteger(port)) {
    throw new Error('DB_PORT must be an integer');
  }

  return port;
};

export default new DataSource({
  type: 'postgres',
  host: getRequiredEnv('DB_HOST'),
  port: getDatabasePort(),
  username: getRequiredEnv('DB_USERNAME'),
  password: process.env.DB_PASSWORD,
  database: getRequiredEnv('DB_DATABASE'),
  // Cùng quy tắc TLS với runtime — nếu không, `migration:run` sẽ bị Supabase
  // từ chối trong khi app lại kết nối được (hoặc ngược lại).
  ssl: resolveDatabaseSsl(process.env),
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
  migrationsTableName: 'migrations',
  migrationsTransactionMode: 'each',
  synchronize: false,
  logging: false,
});
