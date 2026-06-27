import {
  IsArray,
  IsString,
  IsUUID,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubServiceLinkItemDto {
  @ApiProperty({ example: 'uuid-sub-service-id' })
  @IsUUID()
  id!: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class AddSubServicesToPackageDto {
  @ApiProperty({ type: [SubServiceLinkItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubServiceLinkItemDto)
  subServices!: SubServiceLinkItemDto[];
}
