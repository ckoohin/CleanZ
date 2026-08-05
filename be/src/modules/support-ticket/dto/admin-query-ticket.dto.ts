import { Type, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
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

  /** Tìm theo mã ticket hoặc tiêu đề (ILIKE). */
  @IsOptional()
  @IsString()
  keyword?: string;

  /**
   * Kỳ lọc theo NGÀY TẠO ticket, dạng 'YYYY-MM-DD' (biên tính theo giờ VN).
   * Dùng chuỗi ngày chứ không phải Date vì cận trên phải là 23:59:59 của ngày
   * đó — nhận Date thô sẽ cắt mất gần trọn ngày cuối kỳ.
   */
  @Transform(({ value }) =>
    value === '' || value === null ? undefined : (value as string),
  )
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @Transform(({ value }) =>
    value === '' || value === null ? undefined : (value as string),
  )
  @IsOptional()
  @IsDateString()
  toDate?: string;

  /** Sắp xếp hàng đợi. */
  @IsOptional()
  @IsIn(['priority', 'createdAt', 'dueAt'])
  sort?: 'priority' | 'createdAt' | 'dueAt';
}
