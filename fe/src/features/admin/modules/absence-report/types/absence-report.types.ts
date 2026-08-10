export type AbsenceReportStatus =
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED";

export interface AbsenceFunding {
  paidFromEscrow: number;
  paidFromCustomerWallet: number;
  advancedByPlatform: number;
  platformBorneAmount: number;
}

export interface AdminAbsenceReport {
  id: string;
  status: AbsenceReportStatus;
  reportedAt: string;
  reviewDueAt: string;
  slaRemainingMs: number;
  isGuest: boolean;
  proofPhotoUrl: string;
  callHistoryPhotoUrl: string | null;
  hasCallHistoryPhoto: boolean;
  taskerNote: string | null;
  waitedMinutes: number;
  checkinDistanceMeters: number | null;
  checkinFar: boolean;
  compensationAmount: number;
  subtotalSnapshot: number;
  refundedUpfront: number;
  heldForReview: number;
  fundingPreview: AbsenceFunding;
  settlement: AbsenceFunding & { refundedOnClose: number };
  debt: {
    id: string;
    status: "OUTSTANDING" | "RECOVERED" | "WRITTEN_OFF";
    originalAmount: number;
    recoveredAmount: number;
    writtenOffAmount: number;
    outstandingAmount: number;
    createdAt: string;
    writeOffEligibleAt: string;
    canWriteOff: boolean;
  } | null;
  booking: {
    id: string;
    bookingCode: string;
    status: string;
    paymentMethod: string;
    paymentStatus: string;
    totalPrice: number;
    discountAmount: number;
    checkedInAt: string | null;
    checkinReviewStatus: string;
    checkinLatitude: number | null;
    checkinLongitude: number | null;
    checkinTargetLatitude: number | null;
    checkinTargetLongitude: number | null;
    address: string;
    packageName: string | null;
  };
  tasker: {
    id: string;
    fullName: string | null;
    phone: string | null;
    avatarUrl: string | null;
    ratingAvg: number;
  } | null;
  customer: {
    id: string | null;
    fullName: string | null;
    phone: string | null;
  };
  taskerStats30d: {
    reported: number;
    rejected: number;
    expired: number;
  };
  customerApproved90d: number;
  needsAttention: boolean;
  attentionReasons: string[];
  reviewedAt: string | null;
  reviewReason: string | null;
  reviewedBy: { id: string; fullName: string } | null;
}

export interface AdminAbsenceReportList {
  items: AdminAbsenceReport[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
