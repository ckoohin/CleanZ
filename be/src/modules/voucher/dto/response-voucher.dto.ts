import { ApiProperty } from '@nestjs/swagger';
import { VoucherType } from '../../../common/enums/voucher-type.enum';

export class VoucherResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty() type!: VoucherType;
  @ApiProperty() value!: number;
  @ApiProperty() maxDiscount!: number | null;
  @ApiProperty() minOrderAmount!: number;
  @ApiProperty() usageLimit!: number | null;
  @ApiProperty() usedCount!: number;
  @ApiProperty() serviceId!: string | null;
  @ApiProperty() startDate!: Date | null;
  @ApiProperty() endDate!: Date | null;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() createdAt!: Date;
}
