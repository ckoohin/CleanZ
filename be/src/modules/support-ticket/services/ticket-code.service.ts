import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportTicketEntity } from '../entity/support-ticket.entity';

@Injectable()
export class TicketCodeService {
  constructor(
    @InjectRepository(SupportTicketEntity)
    private readonly ticketRepo: Repository<SupportTicketEntity>,
  ) {}

  /**
   * Sinh mã `TK-YYYYMMDD-NNNN`. Dùng MAX(số thứ tự trong ngày) + 1 (KHÔNG dùng count)
   * để tránh trùng khi mã không liên tục do xoá/gap — nguyên nhân gây 500
   * "duplicate key uq_support_tickets_code" trước đây.
   */
  async next(now: Date = new Date()): Promise<string> {
    const y = now.getFullYear();
    const m = `${now.getMonth() + 1}`.padStart(2, '0');
    const d = `${now.getDate()}`.padStart(2, '0');
    const prefix = `TK-${y}${m}${d}`;

    const row = await this.ticketRepo
      .createQueryBuilder('t')
      .select(
        "COALESCE(MAX(CAST(SUBSTRING(t.ticket_code FROM '[0-9]+$') AS INTEGER)), 0)",
        'maxseq',
      )
      .where('t.ticket_code ~ :rx', { rx: `^${prefix}-[0-9]+$` })
      .getRawOne<{ maxseq: string }>();

    const seq = `${Number(row?.maxseq ?? 0) + 1}`.padStart(4, '0');
    return `${prefix}-${seq}`;
  }
}
