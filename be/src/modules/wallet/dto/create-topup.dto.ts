import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateTopupDto {
  @ApiProperty({
    description: 'Số tiền muốn nạp vào ví (VND, số nguyên)',
    example: 100000,
  })
  @IsInt({ message: 'Số tiền nạp phải là số nguyên (VND)' })
  @Min(1, { message: 'Số tiền nạp không hợp lệ' })
  amountVnd!: number;

  @ApiPropertyOptional({
    description:
      'Booking gắn với đơn nạp (khi nạp từ luồng thiếu tiền để trả booking)',
  })
  @IsOptional()
  @IsUUID('4', { message: 'bookingId không hợp lệ' })
  bookingId?: string;
}
