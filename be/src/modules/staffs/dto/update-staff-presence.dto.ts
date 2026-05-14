import { IsEnum } from 'class-validator';
import { STAFF_PRESENCE_STATUS } from 'src/common/enums/staff-presence-status.enum';

export class UpdateStaffPresenceDto {
  @IsEnum(STAFF_PRESENCE_STATUS, {
    message: 'status phải là ONLINE hoặc OFFLINE',
  })
  status!: STAFF_PRESENCE_STATUS;
}
