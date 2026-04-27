import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.verify.token',
    description: 'Token xác thực email',
  })
  @IsString()
  @IsNotEmpty({ message: 'Token không được để trống' })
  token: string;
}
