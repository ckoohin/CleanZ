import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @MaxLength(5000)
  body!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUUID('4', { each: true })
  attachmentIds?: string[];
}

export class CreateAdminMessageDto extends CreateMessageDto {
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}
