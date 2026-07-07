import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { IncidentDecisionResponseType } from 'src/common/enums/incident-decision-response-type.enum';

export class UpsertIncidentDecisionResponseDto {
  @IsInt()
  @Min(0)
  decisionVersion!: number;

  @IsEnum(IncidentDecisionResponseType)
  responseType!: IncidentDecisionResponseType;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  content?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUUID('4', { each: true })
  evidenceIds?: string[];
}
