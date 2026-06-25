/**
 * auto-migrate.ts — Orchestrator đồng bộ schema & data với DB.
 *
 * Mục tiêu: MỘT entrypoint duy nhất chạy mỗi khi hệ thống có thay đổi về
 * entity (schema) hoặc data (seed), thay cho việc gõ từng lệnh typeorm rời rạc.
 *
 * Pipeline (tuần tự, dừng ngay khi có lỗi):
 *   1. CHECK   — phát hiện drift giữa entity (*.entity.ts) và DB hiện tại.
 *   2. GENERATE— nếu có drift và bật --generate, sinh file migration mới.
 *   3. RUN     — chạy toàn bộ migration đang pending vào DB.
 *   4. SEED    — (tùy chọn) nạp lại dữ liệu mẫu khi có --seed.
 *
 * Cách dùng (xem package.json scripts ở cuối file):
 *   npm run db:sync                 -> CHECK + RUN  (an toàn, mặc định)
 *   npm run db:sync -- --generate   -> CHECK + GENERATE + RUN
 *   npm run db:sync -- --seed       -> CHECK + RUN + SEED
 *   npm run db:sync -- --check      -> chỉ CHECK rồi thoát (dùng cho CI guard)
 *
 * KHÔNG dùng synchronize:true. Mọi thay đổi schema đều đi qua migration để
 * giữ lịch sử và rollback được (xem [[cleanz-be-migrations]]).
 */
import { spawnSync } from 'child_process';
import { resolve } from 'path';
import dataSource from './data-source';

type Flags = {
  generate: boolean;
  seed: boolean;
  checkOnly: boolean;
};

const parseFlags = (argv: string[]): Flags => ({
  generate: argv.includes('--generate'),
  seed: argv.includes('--seed'),
  checkOnly: argv.includes('--check'),
});

const log = (step: string, message: string): void =>
  console.log(`[auto-migrate] ${step.padEnd(8)} | ${message}`);

/**
 * Gọi TypeORM CLI bằng đúng runtime (ts-node + tsconfig-paths) như các script
 * migration:* trong package.json. Trả về exit code.
 */
const runTypeormCli = (args: string[]): number => {
  const result = spawnSync(
    process.execPath, // node
    [
      '-r',
      'ts-node/register',
      '-r',
      'tsconfig-paths/register',
      resolve(process.cwd(), 'node_modules/typeorm/cli.js'),
      ...args,
      '-d',
      'src/database/data-source.ts',
    ],
    { stdio: 'inherit', env: process.env },
  );

  if (result.error) {
    throw result.error;
  }
  return result.status ?? 0;
};

/**
 * Phát hiện drift: DataSource.driver.createSchemaBuilder().log() trả về danh
 * sách câu lệnh SQL cần để đưa DB khớp với entity. Mảng rỗng = không có drift.
 */
const detectDrift = async (): Promise<string[]> => {
  await dataSource.initialize();
  try {
    const sqlInMemory = await dataSource.driver
      .createSchemaBuilder()
      .log();
    return sqlInMemory.upQueries.map((q) => q.query);
  } finally {
    await dataSource.destroy();
  }
};

const main = async (): Promise<void> => {
  const flags = parseFlags(process.argv.slice(2));

  // ---- 1. CHECK ----------------------------------------------------------
  log('CHECK', 'So sánh entity với schema DB...');
  const driftQueries = await detectDrift();
  const hasDrift = driftQueries.length > 0;

  if (hasDrift) {
    log('CHECK', `Phát hiện ${driftQueries.length} thay đổi schema:`);
    driftQueries.forEach((q) => console.log(`         - ${q}`));
  } else {
    log('CHECK', 'Schema đã khớp entity, không có drift.');
  }

  if (flags.checkOnly) {
    // Dùng cho CI guard: drift -> fail build để buộc tạo migration.
    process.exit(hasDrift ? 1 : 0);
  }

  // ---- 2. GENERATE -------------------------------------------------------
  if (hasDrift && flags.generate) {
    log('GENERATE', 'Sinh migration mới từ thay đổi entity...');
    const code = runTypeormCli([
      'migration:generate',
      'src/database/migrations/AutoMigration',
    ]);
    if (code !== 0) {
      throw new Error('migration:generate thất bại.');
    }
    log(
      'GENERATE',
      'ĐÃ SINH migration. HÃY ĐỌC & sửa file trước khi commit ' +
        '(dedupe CREATE TYPE/INDEX, tránh default hàm SQL).',
    );
  } else if (hasDrift && !flags.generate) {
    log(
      'GENERATE',
      'Bỏ qua (thiếu --generate). Có drift nhưng chưa sinh migration.',
    );
  }

  // ---- 3. RUN ------------------------------------------------------------
  log('RUN', 'Chạy migration đang pending...');
  const runCode = runTypeormCli(['migration:run']);
  if (runCode !== 0) {
    throw new Error('migration:run thất bại.');
  }
  log('RUN', 'Đã áp dụng toàn bộ migration pending.');

  // ---- 4. SEED -----------------------------------------------------------
  if (flags.seed) {
    log('SEED', 'Nạp dữ liệu mẫu...');
    const seed = spawnSync('npm', ['run', 'seed'], {
      stdio: 'inherit',
      env: process.env,
      shell: true, // cần trên Windows để resolve npm
    });
    if ((seed.status ?? 0) !== 0) {
      throw new Error('seed thất bại.');
    }
    log('SEED', 'Đã nạp xong dữ liệu mẫu.');
  }

  log('DONE', 'Đồng bộ DB hoàn tất.');
};

void main().catch((error: unknown) => {
  console.error('[auto-migrate] LỖI:', error);
  process.exit(1);
});
