import { IsString, IsNotEmpty, MaxLength, IsEnum } from 'class-validator';
import { PenaltyType } from 'src/common/enums/penalty-type.enum';
import { ApiProperty } from '@nestjs/swagger';

export class BanStaffDto {
  @ApiProperty({
    example: 'Hủy đơn không lý do nhiều lần',
    description: 'Lý do khóa tài khoản',
  })
  @IsString()
  @IsNotEmpty({ message: 'Lý do khóa không được để trống' })
  @MaxLength(1000, { message: 'Lý do quá dài' })
  reason!: string;

  @ApiProperty({
    example: 'DAYS_2',
    enum: PenaltyType,
    description: 'Loại hình phạt (Khóa 2 ngày, 7 ngày, Vĩnh viễn)',
  })
  @IsEnum(PenaltyType, { message: 'Loại hình phạt không hợp lệ' })
  @IsNotEmpty({ message: 'Loại hình phạt không được để trống' })
  type!: PenaltyType;
}
