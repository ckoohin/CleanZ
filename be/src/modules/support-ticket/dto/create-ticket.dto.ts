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

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUUID('4', { each: true })
  attachmentIds?: string[];
}
