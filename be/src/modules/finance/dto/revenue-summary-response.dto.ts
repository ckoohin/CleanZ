import { ApiProperty } from '@nestjs/swagger';

export class RevenueSummaryResponseDto {
  @ApiProperty() period!: string;
  @ApiProperty() totalRevenue!: number;
  @ApiProperty() totalPlatformCommission!: number;
  @ApiProperty() totalTaskerEarnings!: number;
  @ApiProperty() totalTransactions!: number;
}
