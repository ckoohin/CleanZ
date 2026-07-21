import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmptyObject, IsObject } from 'class-validator';

export class UpdateSystemConfigDto {
  @ApiProperty({
    description:
      'Map key cấu hình → giá trị. Chỉ chấp nhận key đã khai báo trong system-config registry.',
    example: {
      TOPUP_MIN_VND: 20000,
      TOPUP_MAX_VND: 50000000,
    },
  })
  @IsObject()
  @IsNotEmptyObject()
  values!: Record<string, number>;
}
