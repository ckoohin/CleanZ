import { ConflictException } from '@nestjs/common';

export enum BookingAbsenceReportStatus {
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

const TRANSITIONS: Record<
  BookingAbsenceReportStatus,
  readonly BookingAbsenceReportStatus[]
> = {
  [BookingAbsenceReportStatus.PENDING_REVIEW]: [
    BookingAbsenceReportStatus.APPROVED,
    BookingAbsenceReportStatus.REJECTED,
    BookingAbsenceReportStatus.EXPIRED,
  ],
  [BookingAbsenceReportStatus.APPROVED]: [],
  [BookingAbsenceReportStatus.REJECTED]: [],
  [BookingAbsenceReportStatus.EXPIRED]: [],
};

export function assertBookingAbsenceReportTransition(
  from: BookingAbsenceReportStatus,
  to: BookingAbsenceReportStatus,
): void {
  if (!TRANSITIONS[from].includes(to)) {
    throw new ConflictException({
      code: 'ABSENCE_REPORT_INVALID_TRANSITION',
      message: `Không thể chuyển báo cáo khách vắng từ ${from} sang ${to}`,
    });
  }
}
