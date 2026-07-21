import { ApiProperty } from '@nestjs/swagger';

export class PriceBreakdownDto {
  @ApiProperty({
    description: 'Tiền gốc (hourlyRate × hours × taskerQuantity)',
    example: 280000,
  })
  basePrice!: number;

  @ApiProperty({ description: 'Phụ phí nhà có thú cưng', example: 50000 })
  petSurcharge!: number;

  @ApiProperty({ description: 'Phí thợ mang dụng cụ', example: 30000 })
  toolFee!: number;

  @ApiProperty({ description: 'Phí các dịch vụ phụ đã chọn', example: 0 })
  subServicesFee!: number;

  @ApiProperty({ description: 'Số tiền giảm giá từ Voucher', example: 20000 })
  voucherDiscount!: number;
}

export class CalculateCustomPriceResponseDto {
  @ApiProperty({
    description: 'ID gói dịch vụ',
    example: '10251e38-6d94-47bf-b91d-6805369dd680',
  })
  packageId!: string;

  @ApiProperty({ description: 'Tên gói dịch vụ', example: 'Dọn dẹp ca lẻ' })
  packageName!: string;

  @ApiProperty({
    description: 'Chế độ giá sử dụng',
    enum: ['BASE', 'PREMIUM'],
    example: 'BASE',
  })
  tierType!: 'BASE' | 'PREMIUM';

  @ApiProperty({
    description: 'Đơn giá 1 giờ được áp dụng (đ)',
    example: 80000,
  })
  hourlyRate!: number;

  @ApiProperty({ description: 'Số giờ thực hiện', example: 3.5 })
  hours!: number;

  @ApiProperty({ description: 'Số lượng thợ', example: 1 })
  taskerQuantity!: number;

  @ApiProperty({
    description: 'Ghi chú về cách áp giá',
    example: 'Áp dụng mốc thời lượng 4 giờ (fixed)',
  })
  pricingNote!: string;

  @ApiProperty({
    type: PriceBreakdownDto,
    description: 'Chi tiết từng khoản tiền',
  })
  breakdown!: PriceBreakdownDto;

  @ApiProperty({ description: 'Tổng tiền trước giảm giá', example: 360000 })
  totalBeforeDiscount!: number;

  @ApiProperty({
    description: 'Số tiền cuối cùng khách phải trả (đ)',
    example: 340000,
  })
  finalAmount!: number;

  @ApiProperty({
    description: 'Thông tin voucher đã áp dụng (nếu có)',
    example: { code: 'CLEAN20K', discountAmount: 20000 },
    nullable: true,
  })
  appliedVoucher!: { code: string; discountAmount: number } | null;
}
