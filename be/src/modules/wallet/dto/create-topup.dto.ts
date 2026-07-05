import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class CreateTopupDto {
  @ApiProperty({
    description:
      'Số tiền muốn nạp vào ví (VND). Hạn mức min/max theo cấu hình.',
    example: 100000,
  })
  @Type(() => Number)
  @IsInt({ message: 'Số tiền nạp phải là số nguyên VND' })
  @Min(1, { message: 'Số tiền nạp không hợp lệ' })
  amountVnd!: number;
}
