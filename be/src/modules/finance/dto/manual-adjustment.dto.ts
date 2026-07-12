import {
  IsIn,
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

  /**
   * Chỉ cho ADJUSTMENT. Trước đây nhận mọi WalletTransactionType, nghĩa là admin có
   * thể tự tạo bút toán PAYMENT/TASKER_EARNING/PLATFORM_FEE — những loại mà báo cáo
   * doanh thu đang cộng vào → số liệu tài chính bị bơm khống mà không ai biết.
   */
  @ApiProperty({ enum: [WalletTransactionType.ADJUSTMENT] })
  @IsIn([WalletTransactionType.ADJUSTMENT], {
    message: 'Điều chỉnh thủ công chỉ được dùng loại bút toán ADJUSTMENT',
  })
  type!: WalletTransactionType.ADJUSTMENT;

  @ApiProperty({ example: 'Bồi thường sự cố tháng 6' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description?: string;
}
