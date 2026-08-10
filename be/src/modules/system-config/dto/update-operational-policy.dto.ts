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

export class UpdateCustomerAbsencePolicyDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1440)
  minWaitMinutes!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10080)
  reportWindowMinutes!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  compensationPercent!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000000)
  minCompensation!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000000)
  maxCompensation!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000000)
  guestCompensation!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(720)
  reviewSlaHours!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650)
  debtWriteOffDays!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000000000000)
  debtExposureAlertVnd!: number;
}
