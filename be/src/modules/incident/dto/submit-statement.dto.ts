import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { IC_INPUT_LIMITS } from '../incident.constants';

export class SubmitStatementDto {
  @IsString()
  @MaxLength(2000)
  body!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(IC_INPUT_LIMITS.EVIDENCE_MAX)
  @IsUUID('4', { each: true })
  evidenceIds?: string[];
}
