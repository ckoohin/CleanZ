import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { TicketCategory } from 'src/common/enums/ticket-category.enum';
import { TicketPriority } from 'src/common/enums/ticket-priority.enum';

export class ReclassifyTicketDto {
  @IsEnum(TicketCategory)
  category!: TicketCategory;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  subtype?: string;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;
}
