import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { WalletOwnerType } from '../../../common/enums/wallet-owner-type.enum';

export class WalletListQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: WalletOwnerType })
  @IsOptional()
  @IsEnum(WalletOwnerType)
  ownerType?: WalletOwnerType;

  @ApiPropertyOptional({
    description: 'Search by wallet ID, owner name or owner email',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
