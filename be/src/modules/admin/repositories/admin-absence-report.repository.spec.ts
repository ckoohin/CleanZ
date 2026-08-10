import { BookingAbsenceReportStatus } from 'src/common/enums/booking-absence-report-status.enum';
import { BookingAbsenceReportEntity } from 'src/modules/booking/entity/booking-absence-report.entity';
import { AbsenceFundingPreview } from 'src/modules/booking/services/booking-absence-settlement.service';
import { CustomerDebtEntity } from 'src/modules/wallet/entity/customer-debt.entity';
import {
  AdminAbsenceReportRepository,
  TaskerHistory,
} from './admin-absence-report.repository';

type MappedReport = {
  callHistoryPhotoUrl: string | null;
  hasCallHistoryPhoto: boolean;
  booking: {
    checkinLatitude: number | null;
    checkinLongitude: number | null;
    checkinTargetLatitude: number | null;
    checkinTargetLongitude: number | null;
  };
};

type MapDetail = (
  report: BookingAbsenceReportEntity,
  funding: AbsenceFundingPreview,
  taskerHistory: TaskerHistory,
  customerApproved90d: number,
  attentionReasons: string[],
  debt: CustomerDebtEntity | null,
  debtWriteOffDays: number,
  includeExactLocation: boolean,
) => MappedReport;

const report = {
  id: 'absence-1',
  status: BookingAbsenceReportStatus.PENDING_REVIEW,
  reportedAt: new Date('2026-08-09T12:30:00.000Z'),
  reviewDueAt: new Date('2026-08-11T12:30:00.000Z'),
  isGuest: true,
  proofPhotoUrl: 'https://example.com/proof.jpg',
  callHistoryPhotoUrl: 'https://example.com/call-history.jpg',
  taskerNote: null,
  waitedMinutes: 18,
  checkinDistanceMeters: '4705',
  checkinFar: true,
  compensationAmount: '50000',
  subtotalSnapshot: '200000',
  refundedUpfront: '150000',
  heldForReview: '50000',
  paidFromEscrow: '0',
  paidFromCustomerWallet: '0',
  advancedByPlatform: '0',
  platformBorneAmount: '0',
  refundedOnClose: '0',
  booking: {
    id: 'booking-1',
    bookingCode: 'BK-ABSENCE-1',
    status: 'CANCELLED',
    paymentMethod: 'WALLET',
    paymentStatus: 'PARTIALLY_REFUNDED',
    totalPrice: '200000',
    discountAmount: '0',
    checkedInAt: new Date('2026-08-09T12:19:00.000Z'),
    checkinReviewStatus: 'PENDING_REVIEW',
    checkinLatitude: '21.0678900',
    checkinLongitude: '105.8123400',
    checkinTargetLatitude: '21.0756700',
    checkinTargetLongitude: '105.8234500',
    latitude: 21.1,
    longitude: 105.9,
    address: '141 Phố Trích Sài, Tây Hồ, Hà Nội',
    package: null,
    tasker: null,
    customer: null,
    guestName: 'Khách vãng lai',
    guestPhone: '0900000000',
  },
  reviewedAt: null,
  reviewReason: null,
  reviewedByAdmin: null,
} as unknown as BookingAbsenceReportEntity;

const funding: AbsenceFundingPreview = {
  paidFromEscrow: 50_000,
  paidFromCustomerWallet: 0,
  advancedByPlatform: 0,
  platformBorneAmount: 0,
};

describe('AdminAbsenceReportRepository location exposure', () => {
  const repository = new AdminAbsenceReportRepository(
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
  );
  const exposedRepository = repository as unknown as { mapDetail: MapDetail };
  const mapDetail: MapDetail = (...args) =>
    exposedRepository.mapDetail(...args);

  it('chỉ trả tọa độ chính xác ở API chi tiết Admin', () => {
    const listItem = mapDetail(
      report,
      funding,
      { reported: 1, rejected: 0, expired: 0 },
      0,
      [],
      null,
      90,
      false,
    );
    const detail = mapDetail(
      report,
      funding,
      { reported: 1, rejected: 0, expired: 0 },
      0,
      [],
      null,
      90,
      true,
    );

    expect(listItem.booking).toMatchObject({
      checkinLatitude: null,
      checkinLongitude: null,
      checkinTargetLatitude: null,
      checkinTargetLongitude: null,
    });
    expect(listItem).toMatchObject({
      callHistoryPhotoUrl: null,
      hasCallHistoryPhoto: true,
    });
    expect(detail.booking).toMatchObject({
      checkinLatitude: 21.06789,
      checkinLongitude: 105.81234,
      checkinTargetLatitude: 21.07567,
      checkinTargetLongitude: 105.82345,
    });
    expect(detail).toMatchObject({
      callHistoryPhotoUrl: 'https://example.com/call-history.jpg',
      hasCallHistoryPhoto: true,
    });
  });
});
