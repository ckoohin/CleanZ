import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ConfirmAdyenTopupDto {
  @ApiProperty({ description: 'Id phiên thanh toán Adyen (Web Drop-in)' })
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @ApiProperty({
    description: "Giá trị sessionResult trả về từ Drop-in's onPaymentCompleted",
  })
  @IsString()
  @IsNotEmpty()
  sessionResult!: string;
}
