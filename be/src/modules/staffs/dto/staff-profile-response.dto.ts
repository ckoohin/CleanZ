import { APPROVAL_STATUS } from 'src/common/enums/approval-status.enum';

export class StaffProfileResponseDto {
  id!: string;
  userId!: string;
  fullName!: string;
  phone!: string;
  skills!: string;
  experience!: string;
  bio!: string;
  avatarUrl!: string | null;
  hasCitizenCardImage!: boolean;
  hasCertificateImage!: boolean;
  totalJobs!: number;
  avgRating!: number;
  approvalStatus!: APPROVAL_STATUS;
  createdAt!: Date;
  updatedAt!: Date;
  lastChangedByAdminName?: string;
  lastChangedByAdminId?: string;
}
