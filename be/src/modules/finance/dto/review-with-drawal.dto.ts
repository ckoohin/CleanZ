import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WithdrawalStatus } from '../../../common/enums/with-drawal-status.enum';

export class ReviewWithdrawalDto {
  @ApiProperty({ enum: [WithdrawalStatus.APPROVED, WithdrawalStatus.REJECTED] })
  @IsEnum([WithdrawalStatus.APPROVED, WithdrawalStatus.REJECTED])
  status!: WithdrawalStatus.APPROVED | WithdrawalStatus.REJECTED;

  @ApiPropertyOptional({ example: 'Yêu cầu đã được duyệt.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
