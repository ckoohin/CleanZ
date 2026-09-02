export interface CreateAdminBookingDto {
  customerId: string;
  packageId: string;
  pricingTierId?: string;
  durationHours?: number;
  areaM2?: number;
  addonIds?: string[];
  addressId?: string;
  scheduledDate: string;
  scheduledTime: string;
  paymentMethod: string;
  voucherCode?: string;
  hasPet?: boolean;
  taskerId?: string;
  note?: string;
  reason: string;
}

export interface AvailableTaskersQueryDto {
  keyword?: string;
  page?: number;
  limit?: number;
}

export interface AssignTaskerDto {
  taskerId: string;
  note?: string;
}

export interface ChangeBookingStatusDto {
  status: string;
  reason: string;
}

export type AdminCheckinReviewStatus =
  | "NOT_REQUIRED"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "NOT_VERIFIABLE";

export type AdminCheckinVerificationSource =
  | "GPS"
  | "GPS_WITH_PROOF"
  | "GPS_LOW_ACCURACY_WITH_PROOF"
  | "NO_GPS_WITH_PROOF"
  | "TARGET_MISSING_WITH_PROOF"
  | "ADMIN_OVERRIDE";

export interface ReviewBookingCheckinDto {
  decision: "APPROVE" | "REJECT" | "MARK_NOT_VERIFIABLE";
  reason: string;
  openIncident?: boolean;
  claimedAmount?: number;
}

export interface AdminCheckinOverrideDto {
  reason: string;
}

export type AdminNoShowReviewStatus =
  | "NONE"
  | "PENDING_REVIEW"
  | "CONFIRMED"
  | "EXCUSED";

export interface ReviewBookingNoShowDto {
  decision: "CONFIRM_NO_SHOW" | "EXCUSE_TASKER";
  reason: string;
  openIncident?: boolean;
  claimedAmount?: number;
}

export interface AdminBookingNoShow {
  reviewStatus: AdminNoShowReviewStatus;
  detectedAt: string | null;
  explanation?: string | null;
  explanationSubmittedAt?: string | null;
  reviewedAt?: string | null;
  reviewReason?: string | null;
  warningPoints?: number;
  refundAmount?: number;
  reviewedByAdmin?: {
    id: string;
    fullName: string;
  } | null;
  incident?: {
    id: string;
    incidentCode: string | null;
    status: string;
    claimedAmount: number | null;
  } | null;
}

export interface AdminBookingWorkTiming {
  checkedInAt?: string | null;
  overtimeMinutes: number;
  earlyMinutes: number;
  surchargeFee: number;
  surchargePending?: boolean;
  surchargeStatus?:
    | "NONE"
    | "PENDING_CUSTOMER"
    | "PENDING_TASKER_CONFIRM"
    | "PAID"
    | "WAIVED"
    | "DISPUTED";
  surchargeDisputeReason?: string | null;
  platformAdvanceAmount?: number;
  approvedOvertimeMinutes?: number;
  isEarlyAbnormal: boolean;
  isCheckinFar: boolean;
  checkinDistanceMeters: number | null;
  checkinProofPhotoUrl: string | null;
  checkinLatitude?: number | null;
  checkinLongitude?: number | null;
  checkinAccuracyMeters?: number | null;
  checkinTargetLatitude?: number | null;
  checkinTargetLongitude?: number | null;
  checkinVerificationSource: AdminCheckinVerificationSource | null;
  checkinReviewStatus: AdminCheckinReviewStatus;
  checkinReviewedAt?: string | null;
  checkinReviewReason?: string | null;
  checkinReviewedByAdmin?: {
    id: string;
    fullName: string;
  } | null;
  checkinIncident?: {
    id: string;
    incidentCode: string | null;
    status: string;
    claimedAmount: number | null;
  } | null;
}

export interface AdminBookingItem {
  id: string;
  bookingCode: string;
  customer?: {
    // null cho đơn offline/vãng lai (không gắn tài khoản khách).
    id: string | null;
    userId: string | null;
    fullName: string;
    email: string | null;
    phone: string | null;
  };
  tasker?: {
    id: string;
    userId: string;
    fullName: string;
    email: string;
    phone: string | null;
  } | null;
  service: {
    id: string;
    code: string | null;
    name: string | null;
  };
  address: string;
  scheduledStart: string | null;
  schedule?: {
    scheduledStart: string | null;
    scheduledStartDate: string | null;
    scheduledStartTime: string | null;
    scheduledEnd: string | null;
    scheduledEndDate: string | null;
    scheduledEndTime: string | null;
    durationHours: number;
  };
  totalPrice: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  workTiming?: AdminBookingWorkTiming;
  noShow?: Pick<AdminBookingNoShow, "reviewStatus" | "detectedAt">;
  createdAt: string;
}

export interface AdminBookingTimelineEntry {
  id: string;
  oldStatus: string | null;
  newStatus: string;
  note: string | null;
  changedBy: { id: string; fullName: string; role: string } | null;
  cancelledBy: string | null;
  cancelledByUser: { id: string; fullName: string; role: string } | null;
  cancelReason: string | null;
  cancellationFee: number;
  refundAmount: number;
  paymentId: string | null;
  createdAt: string;
}

/** Ảnh hiện trường tasker nộp cho ca làm việc. */
export interface AdminBookingWorkPhoto {
  id: string;
  url: string;
  uploadedAt: string;
}

export interface AdminBookingWorkPhotos {
  before: AdminBookingWorkPhoto[];
  after: AdminBookingWorkPhoto[];
}

export interface AdminBookingDetail {
  id: string;
  bookingCode?: string;
  status?: string;
  note?: string;
  cancelledBy?: string | null;
  createdAt?: string;

  customer?: {
    // null cho đơn offline/vãng lai (không gắn tài khoản khách).
    id: string | null;
    userId: string | null;
    fullName?: string;
    email?: string | null;
    phone?: string | null;
    avatarUrl?: string | null;
  };

  tasker?: {
    id: string;
    userId: string;
    fullName?: string;
    email?: string;
    phone?: string | null;
    avatarUrl?: string | null;
    ratingAvg?: number;
  } | null;

  service?: {
    id: string;
    code: string | null;
    name: string | null;
    description?: string | null;
  };

  address?: {
    id: string | null;
    label: string | null;
    fullAddress: string;
    district?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    hasPet: boolean;
  };

  schedule?: {
    scheduledStart: string | null;
    scheduledEnd: string | null;
    scheduledStartDate: string | null;
    scheduledStartTime: string | null;
    scheduledEndDate: string | null;
    scheduledEndTime: string | null;
    durationHours: number;
  };

  price?: {
    basePrice: number;
    addonPrice: number;
    peakFee: number;
    petFee: number;
    waitingFee: number;
    discountAmount: number;
    totalPrice: number;
  };

  workPhotos?: AdminBookingWorkPhotos;

  operation?: {
    acceptedAt: string | null;
    checkedInAt: string | null;
    checkedOutAt: string | null;
    completedAt: string | null;
    cancelledAt: string | null;
    workTiming: AdminBookingWorkTiming;
    noShow: AdminBookingNoShow;
    timeline: AdminBookingTimelineEntry[];
  };

  payment?: {
    status: string;
    method: string;
    totalPrice: number;
    platformFee: number | null;
    taskerIncome: number | null;
    commissionRate: number | null;
    isEstimated: boolean;
    baseAmount: number;
    basePlatformFee: number;
    basePaymentMethod: string;
    surchargeAmount: number;
    surchargePlatformFee: number;
    surchargePaymentMethod: string | null;
    latestPayment?: {
      id: string;
      status: string;
      method: string;
      amount: number;
      transactionCode: string | null;
      paidAt: string | null;
      refundedAt: string | null;
      createdAt: string;
    } | null;
    voucher?: {
      id: string;
      code: string;
      name: string;
      type: string;
      value: number;
      discountAmount: number;
    } | null;
  };
}
