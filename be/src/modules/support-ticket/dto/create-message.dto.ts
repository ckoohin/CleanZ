import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { TicketMessageAudience } from 'src/common/enums/ticket-message-audience.enum';

export class CreateMessageDto {
  // Cho phép message ảnh-only: body optional (service kiểm phải có body HOẶC ảnh).
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  body?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsUUID('4', { each: true })
  attachmentIds?: string[];
}

export class CreateAdminMessageDto extends CreateMessageDto {
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;

  // Luồng đích khi admin gửi (REPORTER mặc định). INTERNAL ⇔ ghi chú nội bộ.
  @IsOptional()
  @IsEnum(TicketMessageAudience)
  targetAudience?: TicketMessageAudience;
}

/** Ghi chú nội bộ (log) — chỉ text, bắt buộc nội dung. */
export class CreateInternalNoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  body!: string;
}
