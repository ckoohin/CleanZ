import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AddFavoriteTaskerDto {
  @ApiPropertyOptional({
    example: 'Làm bếp rất kỹ, đúng giờ',
    description: 'Ghi chú riêng của khách về thợ này',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}
