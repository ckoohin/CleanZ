import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BankStatementEntryStatus } from 'src/common/enums/bank-statement-entry.enum';

export class ImportBankStatementDto {
  /**
   * Nội dung file CSV. Nhận dạng text chứ không phải multipart: file sao kê là dữ liệu
   * bảng, FE đọc bằng FileReader rồi gửi thẳng — đỡ một tầng lưu trữ tạm cho thứ mà hệ
   * thống không cần giữ lại nguyên file.
   */
  @IsString()
  @MinLength(1)
  csv!: string;
}

export class QueryBankStatementDto {
  @IsOptional()
  @IsEnum(BankStatementEntryStatus)
  status?: BankStatementEntryStatus;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  keyword?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}

export class MatchBankStatementDto {
  @IsUUID('4')
  incidentId!: string;
}

export class BankStatementReasonDto {
  @IsString()
  @MinLength(10, { message: 'Lý do phải có ít nhất 10 ký tự' })
  @MaxLength(1000)
  reason!: string;
}
