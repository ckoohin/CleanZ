import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { VoucherType } from '../../../common/enums/voucher-type.enum';
import { Type } from 'class-transformer';

export class VoucherListQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: VoucherType })
  @IsOptional()
  @IsEnum(VoucherType)
  type?: VoucherType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  isActive?: string;
}
