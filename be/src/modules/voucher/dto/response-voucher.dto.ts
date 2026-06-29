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
  @ApiProperty() perCustomerLimit!: number | null;
  @ApiProperty() usedCount!: number;
  @ApiProperty() reservedCount!: number;
  @ApiProperty({ type: [String], nullable: true }) packageIds!: string[] | null;
  @ApiProperty({ type: [String], nullable: true }) customerIds!: string[] | null;
  @ApiProperty() startDate!: Date | null;
  @ApiProperty() endDate!: Date | null;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() createdAt!: Date;
}
