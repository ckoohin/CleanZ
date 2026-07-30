import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { TaskerEntity } from './entity/tasker.entity';
import { TaskerPenaltyEntity } from './entity/tasker-penalty.entity';
import { TaskerService } from './tasker.service';
import { TaskerController } from './tasker.controller';
import { TaskerProcessor } from './tasker.processor';
import { TASKER_QUEUE } from './tasker.constants';
import { UploadModule } from '../upload/upload.module';
import { MailModule } from '../mail/mail.module';
import { AppealTokenModule } from '../appeal/appeal-token.module';

import { TaskerServiceEntity } from './entity/tasker-service.entity';
import { TaskerEquipmentEntity } from './entity/tasker-equipment.entity';
import { TaskerEquipmentDebtEntity } from './entity/tasker-equipment-debt.entity';
import { TaskerScheduleEntity } from './entity/tasker-schedule.entity';
import { TaskerCoverageEntity } from './entity/tasker-coverage.entity';

import { AdminTaskerDetailService } from './admin-tasker-detail.service';
import { WalletEntity } from '../wallet/entity/wallet.entity';
import { WalletTransactionEntity } from '../wallet/entity/wallet-transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TaskerEntity,
      TaskerPenaltyEntity,
      TaskerServiceEntity,
      TaskerEquipmentEntity,
      TaskerEquipmentDebtEntity,
      TaskerScheduleEntity,
      TaskerCoverageEntity,
      WalletEntity,
      WalletTransactionEntity,
    ]),
    BullModule.registerQueue({ name: TASKER_QUEUE }),
    UploadModule,
    MailModule,
    AppealTokenModule,
  ],
  controllers: [TaskerController],
  providers: [TaskerService, TaskerProcessor, AdminTaskerDetailService],
})
export class TaskerModule {}
