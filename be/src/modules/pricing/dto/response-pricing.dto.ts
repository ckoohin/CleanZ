import { ApiProperty } from '@nestjs/swagger';

export class PricingConfigResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() serviceId!: string;
  @ApiProperty() provinceCode!: string;
  @ApiProperty() durationHours!: number;
  @ApiProperty() basePrice!: number;
  @ApiProperty() peakPrice!: number | null;
  @ApiProperty() petFee!: number;
  @ApiProperty() waitingFee!: number;
  @ApiProperty() platformCommissionRate!: number;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() createdAt!: Date;
}
