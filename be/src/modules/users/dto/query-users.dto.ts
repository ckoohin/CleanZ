import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from 'src/common/enums/user-role.enum';
import { AuthProvider } from 'src/common/enums/auth-provider.enum';

/**
 * Đọc boolean từ object GỐC (obj[key]) — vì ValidationPipe bật enableImplicitConversion
 * nên "false" đã bị ép thành true TRƯỚC khi @Transform chạy. Đọc obj[key] để parse chuẩn.
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

export class QueryUsersDto {
  @ApiPropertyOptional({ description: 'Search by email or fullName' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filter by email verification status' })
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  isVerified?: boolean;

  /** true => chỉ lấy user đã bị xóa mềm (soft-deleted). */
  @ApiPropertyOptional({ description: 'Chỉ lấy user đã xóa mềm' })
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  deleted?: boolean;

  @ApiPropertyOptional({ enum: AuthProvider })
  @IsOptional()
  @IsEnum(AuthProvider)
  provider?: AuthProvider;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
