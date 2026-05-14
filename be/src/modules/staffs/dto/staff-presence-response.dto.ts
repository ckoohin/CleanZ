import { STAFF_PRESENCE_STATUS } from 'src/common/enums/staff-presence-status.enum';

export class StaffPresenceResponseDto {
  staffId!: string;
  status!: STAFF_PRESENCE_STATUS;
  isBusy!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}
