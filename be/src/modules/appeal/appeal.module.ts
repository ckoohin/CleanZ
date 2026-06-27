import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';
import { SupportTicketEntity } from 'src/modules/support-ticket/entity/support-ticket.entity';
import { SupportTicketModule } from 'src/modules/support-ticket/support-ticket.module';
import { AppealTokenModule } from './appeal-token.module';
import { AppealController } from './appeal.controller';
import { AppealService } from './appeal.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TaskerEntity, SupportTicketEntity]),
    AppealTokenModule,
    SupportTicketModule,
  ],
  controllers: [AppealController],
  providers: [AppealService],
})
export class AppealModule {}
