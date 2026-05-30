import { StaffDocumentType } from 'src/common/enums/type-docs-staff.enum';
import { StaffProfileResponseDto } from '../dto/staff-profile-response.dto';
import { StaffEntity } from '../entities/staff.entity';

export const toStaffProfileResponseDto = (
  entity: StaffEntity,
): StaffProfileResponseDto => {
  let hasCitizenCardImage = false;
  let hasCertificateImage = false;
  let hasCriminalRecordImage = false;
  let hasHealthCertificateImage = false;
  let hasIdWithSelfieImage = false;

  if (Array.isArray(entity.documents)) {
    hasCitizenCardImage = entity.documents.some((doc) => doc.type === StaffDocumentType.CITIZEN_CARD);
    hasCertificateImage = entity.documents.some((doc) => doc.type === StaffDocumentType.CERTIFICATE);
    hasCriminalRecordImage = entity.documents.some((doc) => doc.type === StaffDocumentType.CRIMINAL_RECORD);
    hasHealthCertificateImage = entity.documents.some((doc) => doc.type === StaffDocumentType.HEALTH_CERTIFICATE);
    hasIdWithSelfieImage = entity.documents.some((doc) => doc.type === StaffDocumentType.ID_WITH_SELFIE);
  }

  return {
    id: entity.id,
    userId: entity.user.id,
    fullName: entity.user.fullName,
    phone: entity.phone ?? '',
    skills: entity.skills,
    experience: entity.experience,
    bio: entity.bio,
    avatarUrl: entity.avatarUrl || null,
    hasCitizenCardImage,
    hasCertificateImage,
    hasCriminalRecordImage,
    hasHealthCertificateImage,
    hasIdWithSelfieImage,
    addressResident: entity.addressResident,
    addressCurrent: entity.addressCurrent,
    bankName: entity.bankName,
    bankAccountNumber: entity.bankAccountNumber,
    bankAccountName: entity.bankAccountName,
    totalJobs: entity.totalJobs,
    avgRating: entity.avgRating,
    approvalStatus: entity.approvalStatus,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
    lastChangedByAdminId: entity.lastChangedByAdminId,
    lastChangedByAdminName: entity.lastChangedByAdminName,
    adminNotes: entity.adminNotes,
  };
};
