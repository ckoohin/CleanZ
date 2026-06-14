import { IsDateString, IsEnum, IsOptional, Validate, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

@ValidatorConstraint({ name: 'isAfterFromDate', async: false })
class IsAfterFromDate implements ValidatorConstraintInterface {
  validate(toDate: string, args: ValidationArguments) {
    const obj = args.object as DateRangeQueryDto;
    if (!obj.fromDate || !toDate) return true;
    return new Date(toDate) >= new Date(obj.fromDate);
  }
  defaultMessage() {
    return 'toDate must be greater than or equal to fromDate';
  }
}

export enum GroupBy {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export class DateRangeQueryDto {
  @IsDateString()
  fromDate!: string;

  @IsDateString()
  @Validate(IsAfterFromDate)
  toDate!: string;
}

export class RevenueChartQueryDto extends DateRangeQueryDto {
  @IsEnum(GroupBy)
  groupBy!: GroupBy;
}

export class BookingDetailsQueryDto extends DateRangeQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
