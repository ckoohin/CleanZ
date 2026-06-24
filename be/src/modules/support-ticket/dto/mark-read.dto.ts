import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { TicketMessageAudience } from 'src/common/enums/ticket-message-audience.enum';

export class MarkReadDto {
  // Mốc message cuối đã đọc; bỏ trống = đã đọc tới hiện tại (service tự lấy).
  @IsOptional()
  @IsUUID('4')
  lastMessageId?: string;
}

export class MarkReadAdminDto extends MarkReadDto {
  // Admin phải chỉ rõ luồng đang đọc (REPORTER/COUNTERPARTY/INTERNAL).
  @IsEnum(TicketMessageAudience)
  audience!: TicketMessageAudience;
}
