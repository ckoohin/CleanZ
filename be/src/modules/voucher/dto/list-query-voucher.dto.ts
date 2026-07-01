import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { VoucherType } from '../../../common/enums/voucher-type.enum';
import { Transform, Type } from 'class-transformer';

const emptyFilterToUndefined = ({ value }: { value: unknown }) =>
  value === '' || value === 'ALL' ? undefined : value;

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
  @Transform(emptyFilterToUndefined)
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: VoucherType })
  @Transform(emptyFilterToUndefined)
  @IsOptional()
  @IsEnum(VoucherType)
  type?: VoucherType;

  @ApiPropertyOptional()
  @Transform(emptyFilterToUndefined)
  @IsOptional()
  @IsString()
  isActive?: string;
}
