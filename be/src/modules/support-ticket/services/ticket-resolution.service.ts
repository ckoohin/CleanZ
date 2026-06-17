import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { SupportTicketEntity } from '../entity/support-ticket.entity';
import { TicketResolutionEntity } from '../entity/ticket-resolution.entity';
import { CreateResolutionDto } from '../dto/create-resolution.dto';
import { ResolutionView } from '../dto/ticket-response.dto';
import { RESOLUTION_EXECUTOR } from './resolution-executor';
import type { ResolutionExecutor } from './resolution-executor';

@Injectable()
export class TicketResolutionService {
  constructor(
    @InjectRepository(SupportTicketEntity)
    private readonly ticketRepo: Repository<SupportTicketEntity>,
    @InjectRepository(TicketResolutionEntity)
    private readonly resolutionRepo: Repository<TicketResolutionEntity>,
    @Inject(RESOLUTION_EXECUTOR)
    private readonly executor: ResolutionExecutor,
  ) {}

  async create(
    ticketId: string,
    dto: CreateResolutionDto,
    actingAdminId: string,
  ): Promise<ResolutionView> {
    return asyncHandleOperation(async () => {
      const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
      if (!ticket) throw new NotFoundException('Không tìm thấy ticket');

      let resolution = await this.resolutionRepo.save(
        this.resolutionRepo.create({
          ticket: { id: ticketId },
          type: dto.type,
          amount: dto.amount !== undefined ? dto.amount.toFixed(2) : null,
          voucherId: dto.voucherId ?? null,
          recleanBookingId: dto.recleanBookingId ?? null,
          proposedBy: { id: actingAdminId } as UserEntity,
          walletTransactionId: null,
          note: dto.note ?? null,
        }),
      );

      const result = await this.executor.execute(resolution);
      if (result.walletTransactionId) {
        resolution.walletTransactionId = result.walletTransactionId;
        resolution = await this.resolutionRepo.save(resolution);
      }

      return this.toView(resolution, actingAdminId);
    }, 'Lỗi khi ghi nhận kết luận xử lý');
  }

  async listByTicket(ticketId: string): Promise<ResolutionView[]> {
    return asyncHandleOperation(async () => {
      const rows = await this.resolutionRepo.find({
        where: { ticket: { id: ticketId } },
        relations: ['proposedBy'],
        order: { createdAt: 'ASC' },
      });
      return rows.map((r) => this.toView(r, r.proposedBy?.id ?? null));
    }, 'Lỗi khi lấy kết luận xử lý');
  }

  private toView(
    r: TicketResolutionEntity,
    proposedById: string | null,
  ): ResolutionView {
    return {
      id: r.id,
      type: r.type,
      amount: r.amount ?? null,
      voucherId: r.voucherId ?? null,
      recleanBookingId: r.recleanBookingId ?? null,
      proposedByUserId: r.proposedBy?.id ?? proposedById,
      walletTransactionId: r.walletTransactionId ?? null,
      note: r.note ?? null,
      createdAt: r.createdAt,
    };
  }
}
