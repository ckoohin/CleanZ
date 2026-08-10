import { join } from 'path';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '../config/config.type';
import { resolveDatabaseSsl } from './database-ssl';
import { AuditCorrelationSubscriber } from '../modules/admin/audit/audit-correlation.subscriber';

export const getDatabaseConfig = (
  configService: ConfigService<AllConfigType>,
): TypeOrmModuleOptions => {
  const migrationsRun = process.env.DB_MIGRATIONS_RUN !== 'false';

  return {
    type: 'postgres',
    host: configService.get('DB_HOST', { infer: true }),
    port: parseInt(configService.get('DB_PORT', { infer: true }) as string, 10),
    username: configService.get('DB_USERNAME', { infer: true }),
    password: configService.get('DB_PASSWORD', { infer: true }),
    database: configService.get('DB_DATABASE', { infer: true }),
    ssl: resolveDatabaseSsl({
      DB_SSL: configService.get('DB_SSL', { infer: true }),
      DB_SSL_CA: configService.get('DB_SSL_CA', { infer: true }),
    }),

    autoLoadEntities: true,
    // Đóng dấu `audit_correlation_id` lên các bản ghi hệ quả của thao tác admin.
    subscribers: [AuditCorrelationSubscriber],
    migrations: [join(__dirname, '../database/migrations/*{.ts,.js}')],
    migrationsRun,
    synchronize: false,

    logging: false,
  };
};
