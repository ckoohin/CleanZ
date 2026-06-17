import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { SupportTicketStatus } from 'src/common/enums/support-ticket-status.enum';
import { TicketPendingReason } from 'src/common/enums/ticket-pending-reason.enum';

export class ChangeStatusDto {
  @IsEnum(SupportTicketStatus)
  status!: SupportTicketStatus;

  @IsOptional()
  @IsEnum(TicketPendingReason)
  pendingReason?: TicketPendingReason;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
