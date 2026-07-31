import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class TaskerCancelPenaltyRuleDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(720)
  hoursBeforeStart!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  penaltyPercent!: number;
}

export class UpdateTaskerCancellationPolicyDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => TaskerCancelPenaltyRuleDto)
  rules!: TaskerCancelPenaltyRuleDto[];
}

export class UpdateCheckinOperationPolicyDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1440)
  openBeforeMinutes!: number;

  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(1000)
  autoApproveRadiusMeters!: number;
}

export class UpdateCustomerSchedulingPolicyDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10080)
  minAdvanceMinutes!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  maxAdvanceDays!: number;
}
