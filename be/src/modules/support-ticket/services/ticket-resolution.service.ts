import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
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
      const ticket = await this.ticketRepo.findOne({
        where: { id: ticketId },
        relations: ['assignedAdmin'],
      });
      if (!ticket) throw new NotFoundException('Không tìm thấy ticket');
      // Kết luận xử lý là quyết định nghiệp vụ (có thể kèm tiền) — chỉ người
      // đang phụ trách được ghi, tránh hai admin cùng chốt hai hướng khác nhau.
      const owner = ticket.assignedAdmin?.id;
      if (owner && owner !== actingAdminId) {
        throw new UnprocessableEntityException(
          'Ticket đang do admin khác phụ trách. Hãy gán lại cho bạn trước khi ghi kết luận.',
        );
      }

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
