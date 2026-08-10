export interface BookingAbsenceEligibility {
  canReport: boolean;
  reason?: string;
  reasonCode?: string;
  waitedMinutes: number;
  minWaitMinutes: number;
  availableAt: string | null;
  expiresAt: string | null;
  estimatedCompensation: number;
  reviewSlaHours: number;
  existingReport?: BookingAbsenceReport;
}

export interface BookingAbsenceReport {
  id: string;
  bookingId?: string;
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "EXPIRED";
  proofPhotoUrl: string;
  callHistoryPhotoUrl: string | null;
  taskerNote: string | null;
  reportedAt: string;
  reviewDueAt: string;
  waitedMinutes: number;
  compensationAmount: number;
  refundedUpfront: number;
  debtRecoveredUpfront: number;
  heldForReview: number;
  paidFromEscrow: number;
  paidFromCustomerWallet: number;
  advancedByPlatform: number;
  platformBorneAmount: number;
  refundedOnClose: number;
  debtRecoveredOnClose: number;
  reviewReason: string | null;
}

export type CustomerBookingAbsenceReport = Pick<
  BookingAbsenceReport,
  | "id"
  | "status"
  | "reportedAt"
  | "reviewDueAt"
  | "compensationAmount"
  | "reviewReason"
  | "refundedUpfront"
  | "debtRecoveredUpfront"
  | "heldForReview"
  | "advancedByPlatform"
  | "refundedOnClose"
  | "debtRecoveredOnClose"
>;

export interface ReportBookingAbsencePayload {
  proofPhotoUrl: string;
  callHistoryPhotoUrl: string;
  note?: string;
}

export interface CustomerAbsenceRestrictions {
  outstandingDebt: number;
  hasApprovedAbsence: boolean;
  allBookingsBlocked: boolean;
  cashBlocked: boolean;
}
