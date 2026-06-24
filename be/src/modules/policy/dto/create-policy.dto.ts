import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PolicyCategory, PolicyRole } from '../entity/policy.entity';

export class CreatePolicyDto {
  @IsString()
  @MaxLength(255)
  title!: string;

  @IsString()
  @MaxLength(255)
  slug!: string;

  @IsString()
  content!: string;

  @IsEnum(PolicyRole)
  @IsOptional()
  role?: PolicyRole;

  @IsEnum(PolicyCategory)
  @IsOptional()
  category?: PolicyCategory;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  iconEmoji?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
