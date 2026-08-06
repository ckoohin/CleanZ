import dataSource from './data-source';

const REQUIRED_EXTENSIONS = ['uuid-ossp', 'postgis'];

const quoteIdentifier = (value: string): string =>
  `"${value.replace(/"/g, '""')}"`;

const dropAll = async (): Promise<void> => {
  await dataSource.initialize();

  try {
    await dataSource.query('DROP SCHEMA IF EXISTS public CASCADE');
    await dataSource.query('CREATE SCHEMA public');

    // Extension phải nằm trong schema `public`: migration baseline gọi thẳng
    // `public.uuid_generate_v4()` (57 chỗ) nên chỉ cần extension ở schema khác là
    // toàn bộ migration chết ngay từ bảng đầu tiên.
    //
    // `CREATE EXTENSION IF NOT EXISTS` KHÔNG đủ: nếu extension đã tồn tại ở schema
    // khác (một số bản cài đặt gom vào schema `extensions`), câu lệnh này im lặng
    // không làm gì và cũng không di chuyển nó. Phải kiểm tra schema hiện tại rồi
    // ALTER, vì `DROP SCHEMA public CASCADE` ở trên chỉ xoá extension nào đang
    // nằm trong public.
    for (const extension of REQUIRED_EXTENSIONS) {
      const quoted = quoteIdentifier(extension);
      await dataSource.query(`CREATE EXTENSION IF NOT EXISTS ${quoted}`);

      const rows = await dataSource.query<Array<{ schema: string }>>(
        `SELECT extnamespace::regnamespace::text AS schema
           FROM pg_extension WHERE extname = $1`,
        [extension],
      );

      const currentSchema = rows[0]?.schema;
      if (currentSchema && currentSchema !== 'public') {
        await dataSource.query(`ALTER EXTENSION ${quoted} SET SCHEMA public`);
        console.log(`Moved extension ${extension}: ${currentSchema} -> public`);
      }
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
