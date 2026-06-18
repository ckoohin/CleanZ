import { IsBoolean, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserStatusDto {
  @ApiProperty({ example: false, description: 'Set user active status' })
  @IsBoolean()
  @IsNotEmpty()
  isActive!: boolean;
}
