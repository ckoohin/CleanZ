import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportTicketEntity } from './entity/support-ticket.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SupportTicketEntity])],
  exports: [TypeOrmModule],
})
export class SupportTicketModule {}
