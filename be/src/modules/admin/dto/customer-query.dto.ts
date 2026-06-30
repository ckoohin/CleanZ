import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

/**
 * Đọc giá trị boolean từ object GỐC (obj[key]) chứ không dùng `value`.
 * Lý do: ValidationPipe bật `enableImplicitConversion` nên chuỗi "false" đã bị
 * ép thành boolean `true` TRƯỚC khi @Transform chạy (Boolean("false") === true).
 * Đọc obj[key] lấy đúng chuỗi gốc → parse chuẩn.
 */
const toOptionalBoolean = ({
  obj,
  key,
}: {
  obj: Record<string, unknown>;
  key: string;
}) => {
  const v = obj?.[key];
  if (v === true || v === 'true') return true;
  if (v === false || v === 'false') return false;
  return undefined;
};

export class CustomerQueryDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  isActive?: boolean;

  /** true => chỉ lấy khách hàng đã bị xóa mềm (soft-deleted). */
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  deleted?: boolean;

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
}
