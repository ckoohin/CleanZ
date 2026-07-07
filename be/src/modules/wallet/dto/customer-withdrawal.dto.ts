import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { WithdrawalStatus } from '../../../common/enums/with-drawal-status.enum';

export class CreateCustomerWithdrawalDto {
  @ApiProperty({ example: 500000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(10000)
  amount!: number;

  @ApiProperty({ example: '0123456789' })
  @IsString()
  @MaxLength(255)
  bankAccount!: string;

  @ApiProperty({ example: 'Vietcombank' })
  @IsString()
  @MaxLength(100)
  bankName!: string;

  @ApiPropertyOptional({ example: 'Rút phần được bồi thường' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class ReviewCustomerWithdrawalDto {
  @ApiProperty({ enum: [WithdrawalStatus.APPROVED, WithdrawalStatus.REJECTED] })
  @IsEnum([WithdrawalStatus.APPROVED, WithdrawalStatus.REJECTED])
  status!: WithdrawalStatus.APPROVED | WithdrawalStatus.REJECTED;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminNote?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  proofImageUrl?: string;
}
