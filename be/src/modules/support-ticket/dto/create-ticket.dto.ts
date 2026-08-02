import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { TicketCategory } from 'src/common/enums/ticket-category.enum';
import { TicketPriority } from 'src/common/enums/ticket-priority.enum';

const NO_BOOKING_CATEGORIES = [
  TicketCategory.ACCOUNT_TECHNICAL,
  TicketCategory.APPEAL,
  TicketCategory.OTHER,
];

export class CreateTicketDto {
  @ValidateIf(
    (o: CreateTicketDto) => !NO_BOOKING_CATEGORIES.includes(o.category),
  )
  @IsUUID('4')
  bookingId?: string;

  @IsEnum(TicketCategory)
  category!: TicketCategory;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  subtype?: string;

  @IsString()
  @MaxLength(255)
  subject!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  /**
   * Ảnh đã upload TRƯỚC khi tạo ticket. Hiện chưa có endpoint upload nào chạy
   * được trước lúc ticket tồn tại (`POST /:id/attachments` cần ticketId), nên
   * client đang tạo ticket xong mới tải ảnh. Giữ trường này cho luồng "soạn
   * trước" trong tương lai — service đã kiểm quyền đầy đủ nếu có ai dùng tới.
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUUID('4', { each: true })
  attachmentIds?: string[];
}
