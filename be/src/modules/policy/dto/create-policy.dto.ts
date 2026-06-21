import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { PolicyRole } from '../entity/policy.entity';

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
  role!: PolicyRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}