import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, Matches, Max, Min } from 'class-validator';

export class FavoriteTaskerAvailabilityQueryDto {
  @ApiProperty({
    example: '2026-07-24',
    description: 'Ngày khách muốn đặt, định dạng YYYY-MM-DD',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'scheduledDate phải có định dạng YYYY-MM-DD',
  })
  scheduledDate!: string;

  @ApiProperty({
    example: '10:30',
    description: 'Giờ khách muốn đặt, định dạng HH:mm',
  })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'scheduledTime phải có định dạng HH:mm',
  })
  scheduledTime!: string;

  @ApiProperty({
    example: 2,
    description: 'Tổng thời lượng của booking, bao gồm dịch vụ thêm',
  })
  @IsNumber()
  @Min(0.5)
  @Max(24)
  durationHours!: number;
}
