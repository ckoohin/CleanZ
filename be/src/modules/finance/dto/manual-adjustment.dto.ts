import {
  IsEnum,
  IsString,
  IsUUID,
  IsNumber,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WalletTransactionType } from '../../../common/enums/wallet-transaction-type.enum';

export class ManualAdjustmentDto {
  @ApiProperty({ description: 'Target wallet UUID' })
  @IsUUID()
  walletId!: string;

  @ApiProperty({ description: 'Positive = credit, negative = debit' })
  @IsNumber({ maxDecimalPlaces: 2 })
  amount!: number;

  @ApiProperty({ enum: WalletTransactionType })
  @IsEnum(WalletTransactionType)
  type!: WalletTransactionType;

  @ApiProperty({ example: 'Bồi thường sự cố tháng 6' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description?: string;
}
