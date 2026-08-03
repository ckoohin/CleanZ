import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Xoá nợ bồi thường không thu hồi được. Lý do là bắt buộc và được lưu vĩnh viễn: đây là
 * thao tác duy nhất còn lại cho phép một Admin tự quyết định nền tảng chịu mất tiền.
 */
export class WriteOffDebtDto {
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  reason!: string;
}
