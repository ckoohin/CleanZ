import { join } from 'path';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '../config/config.type';
import { resolveDatabaseSsl } from './database-ssl';

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
    migrations: [join(__dirname, '../database/migrations/*{.ts,.js}')],
    migrationsRun,
    migrationsTransactionMode: 'each',
    synchronize: false,

    logging: false,
  };
};
