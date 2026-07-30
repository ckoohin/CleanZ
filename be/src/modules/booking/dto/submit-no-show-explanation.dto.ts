import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class SubmitNoShowExplanationDto {
  @ApiProperty({
    description:
      'Giải trình của Tasker cho lần không check-in trước khi Admin kết luận',
    example:
      'Tôi gặp tai nạn trên đường và đã gọi khách lúc 09:20 nhưng chưa liên lạc được.',
    minLength: 10,
    maxLength: 1000,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  explanation!: string;
}
