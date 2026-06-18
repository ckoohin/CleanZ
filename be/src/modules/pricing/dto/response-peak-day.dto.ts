import { ApiProperty } from '@nestjs/swagger';

export class PeakDayConfigResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true }) startAt!: Date | null;
  @ApiProperty({ nullable: true }) endAt!: Date | null;
  @ApiProperty({ nullable: true }) startTime!: string | null;
  @ApiProperty({ nullable: true }) endTime!: string | null;
  @ApiProperty() peakRate!: number;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() createdAt!: Date;
}
