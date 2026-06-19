import { ApiProperty } from '@nestjs/swagger';
import { WithdrawalStatus } from '../../../common/enums/with-drawal-status.enum';

export class WithdrawalRequestResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() taskerId?: string;
  @ApiProperty() walletId?: string;
  @ApiProperty() amount!: number;
  @ApiProperty({ enum: WithdrawalStatus }) status!: WithdrawalStatus;
  @ApiProperty() bankAccount!: string | null;
  @ApiProperty() bankName!: string | null;
  @ApiProperty() note!: string | null;
  @ApiProperty() reviewedAt!: Date | null;
  @ApiProperty() processedAt!: Date | null;
  @ApiProperty() createdAt!: Date;
}
