import { IsEnum, IsString, IsOptional, IsObject } from 'class-validator';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';

export class UpdatePaymentDto {
  @IsEnum(PaymentStatus, { message: 'Trạng thái thanh toán không hợp lệ' })
  @IsOptional()
  paymentStatus?: PaymentStatus;

  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @IsString()
  @IsOptional()
  transactionId?: string;

  @IsObject()
  @IsOptional()
  paymentData?: Record<string, any>;
}
