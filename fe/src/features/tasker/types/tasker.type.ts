export enum TaskerDocumentType {
  CITIZEN_CARD = 'citizenCard',
  CERTIFICATE = 'certificate',
  CRIMINAL_RECORD = 'criminalRecord',
  HEALTH_CERTIFICATE = 'healthCertificate',
  ID_WITH_SELFIE = 'idWithSelfie',
}

export enum TaskerStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  NEED_INFO = 'need_info',
}

export interface TaskerProfile {
  id: string;
  userId: string;
  fullName?: string;
  skills: string;
  phone?: string;
  experience: string;
  bio: string;
  avatarUrl: string | null;
  approvalStatus: TaskerStatus;
  totalJobs: number;
  avgRating: number;
  adminNotes?: string;
  // Address fields
  addressResident?: string;
  addressCurrent?: string;
  // Bank fields
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  // Document flags
  hasCitizenCardImage?: boolean;
  hasCertificateImage?: boolean;
  hasCriminalRecordImage?: boolean;
  hasHealthCertificateImage?: boolean;
  hasIdWithSelfieImage?: boolean;
  // Admin info
  lastChangedByAdminName?: string;
  lastChangedByAdminId?: string;
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateTaskerProfileDto {
  bio?: string;
  experience?: string;
  phone?: string;
  skills?: string;
  addressResident?: string;
  addressCurrent?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  description?: string;
  category?: string;
  supportedLocationTypes?: string[];
  isActive?: boolean;
}

export interface ServiceListResponse {
  data: ServiceItem[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateTaskerServiceDto {
  serviceId: string;
  locationTypes: string[];
  customPrice?: number;
  description?: string;
  shopAddress?: string;
}

export interface TaskerRegistrationFormValues {
  bio: string;
  experience: string;
  phone: string;
  skills: string;
}
