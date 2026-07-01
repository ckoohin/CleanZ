import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AllConfigType } from 'src/config/config.type';
import { QueueBoardService } from './queue-board.service';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AllConfigType>) => ({
        connection: {
          host: configService.get('REDIS_HOST', { infer: true }),
          port: Number(configService.get('REDIS_PORT', { infer: true })),
          password:
            configService.get('REDIS_PASSWORD', { infer: true }) || undefined,
        },
      }),
    }),
    BullModule.registerQueue(
      { name: 'bookingQueue' },
      { name: 'bookingCheckinQueue' },
      { name: 'notificationQueue' },
      { name: 'paymentQueue' },
      { name: 'analyticsQueue' },
      { name: 'mailQueue' },
      { name: 'taskerQueue' },
    ),
  ],
  providers: [QueueBoardService],
  exports: [BullModule],
})
export class QueueModule {}
