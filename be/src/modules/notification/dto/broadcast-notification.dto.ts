import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { NotificationType } from 'src/common/enums/notification-type.enum';

export enum BroadcastSegment {
  ALL = 'ALL',
  CUSTOMER = 'CUSTOMER',
  TASKER = 'TASKER',
}

const BROADCAST_TYPES = [
  NotificationType.PROMOTION,
  NotificationType.SYSTEM,
] as const;

export class BroadcastNotificationDto {
  @ValidateIf((o: BroadcastNotificationDto) => !o.userIds)
  @IsEnum(BroadcastSegment, {
    message: 'segment phải là ALL | CUSTOMER | TASKER khi không truyền userIds',
  })
  segment?: BroadcastSegment;

  @ValidateIf((o: BroadcastNotificationDto) => !o.segment)
  @IsArray()
  @ArrayMaxSize(10000, { message: 'userIds tối đa 10000 mỗi lần broadcast' })
  @IsUUID('4', { each: true })
  userIds?: string[];

  @IsIn(BROADCAST_TYPES, {
    message: 'type chỉ được là PROMOTION hoặc SYSTEM',
  })
  type!: NotificationType;

  @IsString()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  content?: string;
}
