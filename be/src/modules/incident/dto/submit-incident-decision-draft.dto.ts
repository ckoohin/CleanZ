import { IsInt, Min } from 'class-validator';

export class SubmitIncidentDecisionDraftDto {
  @IsInt()
  @Min(0)
  expectedDecisionVersion!: number;
}
