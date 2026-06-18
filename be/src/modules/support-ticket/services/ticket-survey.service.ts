import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { SupportTicketStatus } from 'src/common/enums/support-ticket-status.enum';
import { SupportTicketEntity } from '../entity/support-ticket.entity';
import { TicketSurveyEntity } from '../entity/ticket-survey.entity';
import { SubmitSurveyDto } from '../dto/submit-survey.dto';

@Injectable()
export class TicketSurveyService {
  constructor(
    @InjectRepository(SupportTicketEntity)
    private readonly ticketRepo: Repository<SupportTicketEntity>,
    @InjectRepository(TicketSurveyEntity)
    private readonly surveyRepo: Repository<TicketSurveyEntity>,
  ) {}

  async submit(
    userId: string,
    ticketId: string,
    dto: SubmitSurveyDto,
  ): Promise<{ rating: number; submittedAt: Date }> {
    return asyncHandleOperation(async () => {
      const ticket = await this.ticketRepo.findOne({
        where: { id: ticketId },
        relations: ['reporter'],
      });
      if (!ticket || ticket.reporter?.id !== userId) {
        throw new NotFoundException('Không tìm thấy ticket');
      }
      if (
        ticket.status !== SupportTicketStatus.RESOLVED &&
        ticket.status !== SupportTicketStatus.CLOSED
      ) {
        throw new ConflictException('Chỉ đánh giá khi ticket đã xử lý xong');
      }

      let survey = await this.surveyRepo.findOne({
        where: { ticket: { id: ticketId } },
      });
      if (!survey) {
        survey = this.surveyRepo.create({ ticket: { id: ticketId } });
      }
      survey.rating = dto.rating;
      survey.comment = dto.comment ?? null;
      survey.submittedAt = new Date();
      const saved = await this.surveyRepo.save(survey);
      return { rating: saved.rating!, submittedAt: saved.submittedAt! };
    }, 'Lỗi khi gửi đánh giá');
  }
}
