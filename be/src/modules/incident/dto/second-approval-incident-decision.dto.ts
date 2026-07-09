import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export enum SecondApprovalDecisionAction {
  APPROVE = 'APPROVE',
  REQUEST_CHANGES = 'REQUEST_CHANGES',
}

export class SecondApprovalIncidentDecisionDto {
  @IsInt()
  @Min(0)
  expectedDecisionVersion!: number;

  @IsEnum(SecondApprovalDecisionAction)
  action!: SecondApprovalDecisionAction;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
