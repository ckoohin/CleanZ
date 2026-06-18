import { ApiProperty } from '@nestjs/swagger';

export class PeakDayConfigResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() startAt!: Date;
  @ApiProperty() endAt!: Date;
  @ApiProperty() peakRate!: number;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() createdAt!: Date;
}
