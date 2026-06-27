import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdminReviewTaskerDto {
  @ApiProperty({ example: 'Ảnh CCCD bị mờ, vui lòng chụp lại.' })
  @IsString()
  @IsNotEmpty()
  // FE có thể gửi JSON có cấu trúc (các phần cần nộp lại + lý do từng phần),
  // nên nới giới hạn để chứa đủ payload (nhiều phần + lý do dài + ghi chú chung).
  @MaxLength(8000)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  notes!: string;
}
