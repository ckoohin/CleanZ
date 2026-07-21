import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

/** Hình thức khách chọn để thanh toán phần phát sinh (chỉ áp dụng đơn trả trước bằng ví). */
export type SurchargePaymentMethod = 'WALLET' | 'CASH';

export class ConfirmCompletionDto {
  @ApiPropertyOptional({
    enum: ['WALLET', 'CASH'],
    description:
      'Hình thức thanh toán phần phát sinh cho đơn trả trước bằng ví: ' +
      'WALLET = trừ thêm vào ví, CASH = trả tiền mặt cho tasker. ' +
      'Bỏ trống với đơn tiền mặt (thanh toán tổng bằng tiền mặt).',
  })
  @IsOptional()
  @IsIn(['WALLET', 'CASH'])
  surchargePaymentMethod?: SurchargePaymentMethod;
}
