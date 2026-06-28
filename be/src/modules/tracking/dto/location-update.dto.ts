import { Type } from 'class-transformer';
import {
  IsISO8601,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class LocationUpdateDto {
  @IsUUID()
  bookingId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  accuracy?: number;

  @IsOptional()
  @IsISO8601()
  capturedAt?: string;
}
