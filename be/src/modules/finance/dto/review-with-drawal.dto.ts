import { IsEnum, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WithdrawalStatus } from '../../../common/enums/with-drawal-status.enum';

export class ReviewWithdrawalDto {
  @ApiProperty({ enum: [WithdrawalStatus.APPROVED, WithdrawalStatus.REJECTED] })
  @IsEnum([WithdrawalStatus.APPROVED, WithdrawalStatus.REJECTED])
  status!: WithdrawalStatus.APPROVED | WithdrawalStatus.REJECTED;

  @ApiPropertyOptional({ example: 'Lý do từ chối...' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiPropertyOptional({ example: 'Ghi chú nội bộ sau khi chuyển khoản...' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  adminNote?: string;

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/...' })
  @IsOptional()
  @IsUrl()
  proofImageUrl?: string;
}
