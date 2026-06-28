import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class TaskerReplyDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reply!: string;
}
