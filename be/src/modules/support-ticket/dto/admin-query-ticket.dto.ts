import { Type, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { SupportTicketStatus } from 'src/common/enums/support-ticket-status.enum';
import { TicketCategory } from 'src/common/enums/ticket-category.enum';
import { TicketPriority } from 'src/common/enums/ticket-priority.enum';

export class AdminQueryTicketDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsEnum(SupportTicketStatus)
  status?: SupportTicketStatus;

  @IsOptional()
  @IsEnum(TicketCategory)
  category?: TicketCategory;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsOptional()
  @IsUUID('4')
  reporterUserId?: string;

  @IsOptional()
  @IsUUID('4')
  assignedAdminId?: string;

  @IsOptional()
  @Transform(({ obj, key }) => {
    const v = (obj as Record<string, unknown>)[key];
    if (v === true || v === 'true') return true;
    if (v === false || v === 'false') return false;
    return v;
  })
  @IsBoolean()
  slaBreached?: boolean;

  @IsOptional()
  @IsUUID('4')
  bookingId?: string;
}
