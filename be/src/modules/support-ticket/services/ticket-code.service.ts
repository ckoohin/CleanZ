import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { SupportTicketEntity } from '../entity/support-ticket.entity';

@Injectable()
export class TicketCodeService {
  constructor(
    @InjectRepository(SupportTicketEntity)
    private readonly ticketRepo: Repository<SupportTicketEntity>,
  ) {}

  async next(now: Date = new Date()): Promise<string> {
    const y = now.getFullYear();
    const m = `${now.getMonth() + 1}`.padStart(2, '0');
    const d = `${now.getDate()}`.padStart(2, '0');
    const prefix = `TK-${y}${m}${d}`;
    const countToday = await this.ticketRepo.count({
      where: { ticketCode: Like(`${prefix}-%`) },
    });
    const seq = `${countToday + 1}`.padStart(4, '0');
    return `${prefix}-${seq}`;
  }
}
