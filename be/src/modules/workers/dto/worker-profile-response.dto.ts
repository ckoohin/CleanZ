import { WorkerStatus } from '../worker.entity';

export class WorkerProfileResponseDto {
    id!: string;
    userId!: string;
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
}
