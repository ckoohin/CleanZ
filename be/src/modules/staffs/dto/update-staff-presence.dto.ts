import { IsEnum, IsNotEmpty } from 'class-validator';
import { STAFF_PRESENCE_STATUS } from 'src/common/enums/staff-presence-status.enum';

export class UpdateStaffPresenceDto {
  @IsEnum(STAFF_PRESENCE_STATUS, { message: 'Trạng thái không hợp lệ' })
  @IsNotEmpty({ message: 'Trạng thái không được để trống' })
  status: STAFF_PRESENCE_STATUS;
}
