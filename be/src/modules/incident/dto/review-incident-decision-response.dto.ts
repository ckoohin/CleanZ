import {
  IsEnum,
  IsInt,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { IncidentDecisionResponseReviewResult } from 'src/common/enums/incident-decision-response-review-result.enum';

export class ReviewIncidentDecisionResponseDto {
  @IsInt()
  @Min(0)
  expectedDecisionVersion!: number;

  @IsUUID('4')
  responseId!: string;

  @IsEnum(IncidentDecisionResponseReviewResult)
  result!: IncidentDecisionResponseReviewResult;

  @IsString()
  @MaxLength(2000)
  adminReviewNote!: string;
}
