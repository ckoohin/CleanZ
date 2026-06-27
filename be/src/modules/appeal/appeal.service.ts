import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { TaskerStatus } from 'src/common/enums/tasker-status.enum';
import { TicketCategory } from 'src/common/enums/ticket-category.enum';
import { TicketSource } from 'src/common/enums/ticket-source.enum';
import { SupportTicketStatus } from 'src/common/enums/support-ticket-status.enum';
import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';
import { SupportTicketEntity } from 'src/modules/support-ticket/entity/support-ticket.entity';
import { TicketService } from 'src/modules/support-ticket/services/ticket.service';
import { AppealTokenService } from './appeal-token.service';
import { SubmitAppealDto } from './dto/submit-appeal.dto';

/** Ticket kháng cáo còn "mở" (chưa đóng) — chặn gửi trùng. */
const OPEN_TICKET_STATUSES = [
  SupportTicketStatus.NEW,
  SupportTicketStatus.IN_PROGRESS,
  SupportTicketStatus.PENDING,
];

export interface AppealContext {
  taskerId: string;
  fullName: string;
  email: string;
  /** Lý do khóa đã bỏ tiền tố [PERMANENT]/[TEMPORARY]. */
  banReason: string | null;
  /** Đã có kháng cáo đang xử lý hay chưa. */
  hasOpenAppeal: boolean;
}

@Injectable()
export class AppealService {
  constructor(
    @InjectRepository(TaskerEntity)
    private readonly taskerRepo: Repository<TaskerEntity>,
    @InjectRepository(SupportTicketEntity)
    private readonly ticketRepo: Repository<SupportTicketEntity>,
    private readonly appealToken: AppealTokenService,
    private readonly ticketService: TicketService,
  ) {}

  /** Bỏ tiền tố loại khóa "[PERMANENT] " / "[TEMPORARY] " khỏi banReason. */
  private cleanReason(reason: string | null | undefined): string | null {
    if (!reason) return null;
    return reason.replace(/^\[(PERMANENT|TEMPORARY)\]\s*/, '').trim() || null;
  }

  /** Giải token → lấy tasker (kèm user) và kiểm tra đủ điều kiện kháng cáo. */
  private async resolveTaskerFromToken(token: string): Promise<{
    tasker: TaskerEntity;
    userId: string;
  }> {
    let payload: { sub: string; userId: string };
    try {
      payload = this.appealToken.verify(token);
    } catch {
      throw new BadRequestException(
        'Liên kết kháng cáo không hợp lệ hoặc đã hết hạn.',
      );
    }

    const tasker = await this.taskerRepo.findOne({
      where: { id: payload.sub },
      relations: ['user'],
    });
    if (!tasker || !tasker.user) {
      throw new NotFoundException('Không tìm thấy tài khoản tasker.');
    }
    // Chỉ tasker bị chấm dứt vĩnh viễn mới được kháng cáo qua đây.
    if (tasker.status !== TaskerStatus.TERMINATED) {
      throw new BadRequestException(
        'Tài khoản này không ở trạng thái cần kháng cáo.',
      );
    }
    return { tasker, userId: payload.userId };
  }

  /** Đếm số ticket kháng cáo đang mở của 1 user. */
  private async countOpenAppeals(userId: string): Promise<number> {
    return this.ticketRepo.count({
      where: {
        reporter: { id: userId },
        category: TicketCategory.APPEAL,
        status: In(OPEN_TICKET_STATUSES),
      },
    });
  }

  /** GET /appeals/verify — xác thực token & trả thông tin hiển thị trên trang. */
  async getContext(token: string): Promise<AppealContext> {
    return asyncHandleOperation(async () => {
      const { tasker, userId } = await this.resolveTaskerFromToken(token);
      const openCount = await this.countOpenAppeals(userId);
      return {
        taskerId: tasker.id,
        fullName: tasker.user.fullName,
        email: tasker.user.email,
        banReason: this.cleanReason(tasker.banReason),
        hasOpenAppeal: openCount > 0,
      };
    }, 'Không thể xác thực kháng cáo');
  }

  /** POST /appeals — tạo ticket kháng cáo (category APPEAL) cho tasker. */
  async submit(dto: SubmitAppealDto): Promise<{ ticketId: string }> {
    return asyncHandleOperation(async () => {
      const { tasker, userId } = await this.resolveTaskerFromToken(dto.token);

      if ((await this.countOpenAppeals(userId)) > 0) {
        throw new ConflictException(
          'Bạn đã gửi một kháng cáo và đang được xử lý. Vui lòng chờ phản hồi.',
        );
      }

      const ticket = await this.ticketService.create(
        userId,
        {
          category: TicketCategory.APPEAL,
          subject: `Kháng cáo khóa tài khoản - ${tasker.user.fullName}`,
          description: dto.content,
          subtype: 'PERMANENT_BAN_APPEAL',
        },
        TicketSource.TASKER_APPEAL,
      );

      return { ticketId: ticket.id };
    }, 'Không thể gửi kháng cáo');
  }
}
