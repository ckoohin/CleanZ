import { WorkerProfileResponseDto } from '../dto/worker-profile-response.dto';
import { WorkerEntity } from '../entities/worker.entity';

export const toWorkerProfileResponseDto = (
  entity: WorkerEntity & { approvedByAdminName?: string },
): WorkerProfileResponseDto => {
  let hasCitizenCardImage = false;
  let hasCertificateImage = false;

  if (Array.isArray(entity.documents)) {
    hasCitizenCardImage = entity.documents.some(
      (doc) => doc.type === 'citizenCard',
    );
    hasCertificateImage = entity.documents.some(
      (doc) => doc.type === 'certificate',
    );
  }

  return {
    id: entity.id,
    userId: entity.user.id,
    fullName: entity.user.fullName,
    phone: entity.phone ?? "",
    skills: entity.skills,
    experience: entity.experience,
    bio: entity.bio,
    avatarUrl: entity.avatarUrl || null,
    hasCitizenCardImage,
    hasCertificateImage,
    totalJobs: entity.totalJobs,
    avgRating: entity.avgRating,
    status: entity.status,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
    lastChangedByAdminId: entity.lastChangedByAdminId,
    lastChangedByAdminName: entity.lastChangedByAdminName,
  };
};
