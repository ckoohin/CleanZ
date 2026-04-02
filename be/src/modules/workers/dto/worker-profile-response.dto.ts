import { WorkerStatus } from '../entities/worker.entity';

export class WorkerProfileResponseDto {
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
  status!: WorkerStatus;
  createdAt!: Date;
  updatedAt!: Date;
  lastChangedByAdminName?: string;
  lastChangedByAdminId?: string;
}
