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
        /**
         * Không gian tên khoá Redis. Mặc định `bull` — giữ nguyên hành vi hiện tại.
         *
         * Cấu hình được vì tên hàng đợi là hằng số toàn cục: mọi tiến trình trỏ vào cùng
         * một Redis sẽ dùng CHUNG hàng đợi, kể cả khi chúng làm việc trên database khác
         * nhau. Trong bộ integration, worker của suite này nhặt đúng job do suite trước để
         * lại và ghi vào DB không còn tồn tại người dùng đó — vi phạm khoá ngoại. Tách
         * prefix là cách cô lập mà KHÔNG phải tắt worker, tức là vẫn chạy đúng đường thật.
         */
        prefix:
          configService.get('BULL_PREFIX', { infer: true })?.trim() || 'bull',
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
      { name: 'earningsReportQueue' },
    ),
  ],
  providers: [QueueBoardService],
  exports: [BullModule],
})
export class QueueModule {}
