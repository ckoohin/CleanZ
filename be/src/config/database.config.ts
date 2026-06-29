import { join } from 'path';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '../config/config.type';

export const getDatabaseConfig = (
  configService: ConfigService<AllConfigType>,
): TypeOrmModuleOptions => {
  const isDev =
    configService.get('NODE_ENV', { infer: true }) === 'development';

  // Bật/tắt tự chạy migration lúc app khởi động. Mặc định BẬT.
  // Đặt DB_MIGRATIONS_RUN=false trong .env để tắt nếu cần.
  const migrationsRun = process.env.DB_MIGRATIONS_RUN !== 'false';

  return {
    type: 'postgres',
    host: configService.get('DB_HOST', { infer: true }),
    port: parseInt(configService.get('DB_PORT', { infer: true }) as string, 10),
    username: configService.get('DB_USERNAME', { infer: true }),
    password: configService.get('DB_PASSWORD', { infer: true }),
    database: configService.get('DB_DATABASE', { infer: true }),

    autoLoadEntities: true,
    synchronize: false,

    // Glob khớp cả runtime dev (.ts qua ts-node) lẫn prod (.js trong dist/)
    migrations: [join(__dirname, '..', 'database', 'migrations', '*.{ts,js}')],
    migrationsTableName: 'migrations',
    migrationsRun,

    logging: isDev ? ['error', 'warn', 'query'] : false,
    maxQueryExecutionTime: 100, // log query chậm hơn 100ms
    // ssl: { rejectUnauthorized: false },
  };
};