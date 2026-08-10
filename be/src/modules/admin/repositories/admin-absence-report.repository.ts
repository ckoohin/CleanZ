import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { BookingAbsenceReportStatus } from 'src/common/enums/booking-absence-report-status.enum';
import { BookingCheckinReviewStatus } from 'src/common/enums/booking-checkin-review-status.enum';
import { SupportTicketStatus } from 'src/common/enums/support-ticket-status.enum';
import { TicketCategory } from 'src/common/enums/ticket-category.enum';
import { toNumber } from 'src/common/helpers/number.helper';
import { BookingAbsenceReportEntity } from 'src/modules/booking/entity/booking-absence-report.entity';
import { BookingAbsenceService } from 'src/modules/booking/services/booking-absence.service';
import {
  AbsenceFundingPreview,
  BookingAbsenceSettlementService,
} from 'src/modules/booking/services/booking-absence-settlement.service';
import { SupportTicketEntity } from 'src/modules/support-ticket/entity/support-ticket.entity';
import { SystemConfigService } from 'src/modules/system-config/system-config.service';
import { CustomerDebtService } from 'src/modules/wallet/customer-debt.service';
import {
  AbsenceReportQueryDto,
  AbsenceReviewDecision,
  BulkReviewAbsenceReportsDto,
  ReviewAbsenceReportDto,
} from '../dto/absence-report.dto';
import {
  CustomerDebtEntity,
  CustomerDebtSource,
  customerDebtOutstanding,
} from 'src/modules/wallet/entity/customer-debt.entity';

export interface TaskerHistory {
  reported: number;
  rejected: number;
  expired: number;
}

@Injectable()
export class AdminAbsenceReportRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly absenceService: BookingAbsenceService,
    private readonly settlementService: BookingAbsenceSettlementService,
    private readonly customerDebtService: CustomerDebtService,
    private readonly systemConfigService: SystemConfigService,
  ) {}

  async findAll(query: AbsenceReportQueryDto) {
    const page = Math.max(1, query.page);
    const limit = Math.min(100, Math.max(1, query.limit));
    const status = query.status ?? BookingAbsenceReportStatus.PENDING_REVIEW;
    const qb = this.baseQuery()
      .where('report.status = :status', { status })
      .orderBy('report.reviewDueAt', 'ASC')
      .addOrderBy('report.reportedAt', 'ASC');
    if (query.keyword) {
      qb.andWhere(
        `(
          booking.bookingCode ILIKE :keyword
          OR taskerUser.fullName ILIKE :keyword
          OR taskerUser.phone ILIKE :keyword
          OR customerUser.fullName ILIKE :keyword
          OR customerUser.phone ILIKE :keyword
          OR booking.guestName ILIKE :keyword
          OR booking.guestPhone ILIKE :keyword
        )`,
        { keyword: `%${query.keyword}%` },
      );
    }
    const [reports, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    const items = await this.enrich(reports, false);
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string) {
    const report = await this.baseQuery()
      .where('report.id = :id', { id })
      .getOne();
    if (!report) {
      throw new NotFoundException('Không tìm thấy báo cáo khách vắng mặt');
    }
    return (await this.enrich([report], true))[0];
  }

  async review(id: string, adminUserId: string, dto: ReviewAbsenceReportDto) {
    const target =
      dto.decision === AbsenceReviewDecision.APPROVE
        ? BookingAbsenceReportStatus.APPROVED
        : BookingAbsenceReportStatus.REJECTED;
    return this.absenceService.review(
      id,
      adminUserId,
      target,
      dto.reason ?? 'Admin xác minh bằng chứng khách vắng hợp lệ',
    );
  }

  async bulkApprove(
    adminUserId: string,
    dto: BulkReviewAbsenceReportsDto,
  ): Promise<{
    approved: string[];
    skipped: Array<{ id: string; reasons: string[] }>;
    failed: Array<{ id: string; message: string }>;
  }> {
    const approved: string[] = [];
    const skipped: Array<{ id: string; reasons: string[] }> = [];
    const failed: Array<{ id: string; message: string }> = [];

    for (const id of [...new Set(dto.reportIds)]) {
      try {
        const detail = await this.findById(id);
        if (
          detail.status !== BookingAbsenceReportStatus.PENDING_REVIEW ||
          detail.needsAttention
        ) {
          skipped.push({
            id,
            reasons:
              detail.attentionReasons.length > 0
                ? detail.attentionReasons
                : ['Báo cáo không còn ở trạng thái chờ duyệt'],
          });
          continue;
        }
        await this.absenceService.review(
          id,
          adminUserId,
          BookingAbsenceReportStatus.APPROVED,
          'Duyệt hàng loạt: bằng chứng và lịch sử không có cờ bất thường',
        );
        approved.push(id);
      } catch (error: unknown) {
        failed.push({
          id,
          message: error instanceof Error ? error.message : 'Không thể duyệt',
        });
      }
    }
    return { approved, skipped, failed };
  }

  async writeOffDebt(debtId: string, adminUserId: string, reason: string) {
    return this.dataSource.transaction(async (manager) => {
      const debt = await manager.getRepository(CustomerDebtEntity).findOne({
        where: {
          id: debtId,
          source: CustomerDebtSource.ABSENCE_COMPENSATION,
        },
      });
      if (!debt) {
        throw new NotFoundException(
          'Không tìm thấy khoản nợ của báo cáo khách vắng mặt',
        );
      }
      const policy =
        await this.systemConfigService.getCustomerAbsencePolicy(manager);
      return this.customerDebtService.writeOff(
        manager,
        debtId,
        adminUserId,
        reason,
        policy.debtWriteOffDays,
      );
    });
  }

  private baseQuery() {
    return this.dataSource
      .getRepository(BookingAbsenceReportEntity)
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.booking', 'booking')
      .leftJoinAndSelect('booking.tasker', 'tasker')
      .leftJoinAndSelect('tasker.user', 'taskerUser')
      .leftJoinAndSelect('booking.customer', 'customer')
      .leftJoinAndSelect('customer.user', 'customerUser')
      .leftJoinAndSelect('report.customer', 'reportCustomer')
      .leftJoinAndSelect('report.tasker', 'reportTasker')
      .leftJoinAndSelect('booking.package', 'package')
      .leftJoinAndSelect('report.reviewedByAdmin', 'reviewedByAdmin');
  }

  private async enrich(
    reports: BookingAbsenceReportEntity[],
    includeExactLocation: boolean,
  ) {
    if (reports.length === 0) return [];
    const taskerIds = [
      ...new Set(
        reports.map((report) => report.booking.tasker?.id).filter(Boolean),
      ),
    ] as string[];
    const customerIds = [
      ...new Set(
        reports.map((report) => report.booking.customer?.id).filter(Boolean),
      ),
    ] as string[];
    const bookingIds = reports.map((report) => report.booking.id);
    const [taskerStats, customerStats, disputeTickets, funding, policy, debts] =
      await Promise.all([
        this.taskerHistory(this.dataSource.manager, taskerIds),
        this.customerHistory(this.dataSource.manager, customerIds),
        this.dataSource.getRepository(SupportTicketEntity).find({
          where: {
            booking: { id: In(bookingIds) },
            category: TicketCategory.CUSTOMER_ABSENCE_DISPUTE,
            status: In([
              SupportTicketStatus.NEW,
              SupportTicketStatus.IN_PROGRESS,
              SupportTicketStatus.PENDING,
            ]),
          },
          relations: ['booking'],
        }),
        Promise.all(
          reports.map((report) =>
            this.settlementService.previewApproval(
              this.dataSource.manager,
              report,
            ),
          ),
        ),
        this.systemConfigService.getCustomerAbsencePolicy(
          this.dataSource.manager,
        ),
        Promise.all(
          reports.map((report) =>
            this.customerDebtService.findBySource(
              this.dataSource.manager,
              CustomerDebtSource.ABSENCE_COMPENSATION,
              report.id,
            ),
          ),
        ),
      ]);
    const disputedBookingIds = new Set(
      disputeTickets.map((ticket) => ticket.booking?.id).filter(Boolean),
    );

    return reports.map((report, index) => {
      const taskerHistory = report.booking.tasker
        ? (taskerStats.get(report.booking.tasker.id) ?? {
            reported: 0,
            rejected: 0,
            expired: 0,
          })
        : { reported: 0, rejected: 0, expired: 0 };
      const customerApproved90d = report.booking.customer
        ? (customerStats.get(report.booking.customer.id) ?? 0)
        : 0;
      const attentionReasons: string[] = [];
      if (report.checkinFar) attentionReasons.push('Check-in ngoài bán kính');
      if (
        report.booking.checkinReviewStatus ===
        BookingCheckinReviewStatus.PENDING_REVIEW
      ) {
        attentionReasons.push('Check-in còn chờ hậu kiểm');
      }
      if (
        taskerHistory.reported >= 3 &&
        taskerHistory.rejected / taskerHistory.reported >= 0.5
      ) {
        attentionReasons.push('Tasker có tỷ lệ báo cáo bị từ chối cao');
      }
      if (disputedBookingIds.has(report.booking.id)) {
        attentionReasons.push('Khách đã mở phiếu khiếu nại');
      }
      return this.mapDetail(
        report,
        funding[index],
        taskerHistory,
        customerApproved90d,
        attentionReasons,
        debts[index],
        policy.debtWriteOffDays,
        includeExactLocation,
      );
    });
  }

  private mapDetail(
    report: BookingAbsenceReportEntity,
    funding: AbsenceFundingPreview,
    taskerHistory: TaskerHistory,
    customerApproved90d: number,
    attentionReasons: string[],
    debt: CustomerDebtEntity | null,
    debtWriteOffDays: number,
    includeExactLocation: boolean,
  ) {
    const now = Date.now();
    const targetLatitude =
      report.booking.checkinTargetLatitude ?? report.booking.latitude;
    const targetLongitude =
      report.booking.checkinTargetLongitude ?? report.booking.longitude;
    return {
      id: report.id,
      status: report.status,
      reportedAt: report.reportedAt,
      reviewDueAt: report.reviewDueAt,
      slaRemainingMs: report.reviewDueAt.getTime() - now,
      isGuest: report.isGuest,
      proofPhotoUrl: report.proofPhotoUrl,
      callHistoryPhotoUrl: includeExactLocation
        ? (report.callHistoryPhotoUrl ?? null)
        : null,
      hasCallHistoryPhoto: Boolean(report.callHistoryPhotoUrl),
      taskerNote: report.taskerNote ?? null,
      waitedMinutes: report.waitedMinutes,
      checkinDistanceMeters:
        report.checkinDistanceMeters == null
          ? null
          : toNumber(report.checkinDistanceMeters),
      checkinFar: report.checkinFar,
      compensationAmount: toNumber(report.compensationAmount),
      subtotalSnapshot: toNumber(report.subtotalSnapshot),
      refundedUpfront: toNumber(report.refundedUpfront),
      heldForReview: toNumber(report.heldForReview),
      fundingPreview: funding,
      settlement: {
        paidFromEscrow: toNumber(report.paidFromEscrow),
        paidFromCustomerWallet: toNumber(report.paidFromCustomerWallet),
        advancedByPlatform: toNumber(report.advancedByPlatform),
        platformBorneAmount: toNumber(report.platformBorneAmount),
        refundedOnClose: toNumber(report.refundedOnClose),
      },
      debt: debt
        ? {
            id: debt.id,
            status: debt.status,
            originalAmount: toNumber(debt.originalAmount),
            recoveredAmount: toNumber(debt.recoveredAmount),
            writtenOffAmount: toNumber(debt.writtenOffAmount),
            outstandingAmount: customerDebtOutstanding(debt),
            createdAt: debt.createdAt,
            writeOffEligibleAt: new Date(
              debt.createdAt.getTime() + debtWriteOffDays * 86_400_000,
            ),
            canWriteOff:
              customerDebtOutstanding(debt) > 0 &&
              Date.now() - debt.createdAt.getTime() >=
                debtWriteOffDays * 86_400_000,
          }
        : null,
      booking: {
        id: report.booking.id,
        bookingCode: report.booking.bookingCode,
        status: report.booking.status,
        paymentMethod: report.booking.paymentMethod,
        paymentStatus: report.booking.paymentStatus,
        totalPrice: toNumber(report.booking.totalPrice),
        discountAmount: toNumber(report.booking.discountAmount),
        checkedInAt: report.booking.checkedInAt,
        checkinReviewStatus: report.booking.checkinReviewStatus,
        checkinLatitude:
          !includeExactLocation || report.booking.checkinLatitude == null
            ? null
            : toNumber(report.booking.checkinLatitude),
        checkinLongitude:
          !includeExactLocation || report.booking.checkinLongitude == null
            ? null
            : toNumber(report.booking.checkinLongitude),
        checkinTargetLatitude:
          !includeExactLocation || targetLatitude == null
            ? null
            : toNumber(targetLatitude),
        checkinTargetLongitude:
          !includeExactLocation || targetLongitude == null
            ? null
            : toNumber(targetLongitude),
        address: report.booking.address,
        packageName: report.booking.package?.name ?? null,
      },
      tasker: report.booking.tasker
        ? {
            id: report.booking.tasker.id,
            fullName: report.booking.tasker.user?.fullName ?? null,
            phone: report.booking.tasker.user?.phone ?? null,
            avatarUrl: report.booking.tasker.user?.avatarUrl ?? null,
            ratingAvg: toNumber(report.booking.tasker.ratingAvg),
          }
        : null,
      customer: report.booking.customer
        ? {
            id: report.booking.customer.id,
            fullName: report.booking.customer.user?.fullName ?? null,
            phone: report.booking.customer.user?.phone ?? null,
          }
        : {
            id: null,
            fullName: report.booking.guestName ?? 'Khách vãng lai',
            phone: report.booking.guestPhone ?? null,
          },
      taskerStats30d: taskerHistory,
      customerApproved90d,
      needsAttention: attentionReasons.length > 0,
      attentionReasons,
      reviewedAt: report.reviewedAt ?? null,
      reviewReason: report.reviewReason ?? null,
      reviewedBy: report.reviewedByAdmin
        ? {
            id: report.reviewedByAdmin.id,
            fullName: report.reviewedByAdmin.fullName,
          }
        : null,
    };
  }

  private async taskerHistory(
    manager: EntityManager,
    taskerIds: string[],
  ): Promise<Map<string, TaskerHistory>> {
    if (taskerIds.length === 0) return new Map();
    const rows = await manager
      .getRepository(BookingAbsenceReportEntity)
      .createQueryBuilder('report')
      .select('report.tasker_id', 'taskerId')
      .addSelect('COUNT(*)', 'reported')
      .addSelect(
        `COUNT(*) FILTER (WHERE report.status = '${BookingAbsenceReportStatus.REJECTED}')`,
        'rejected',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE report.status = '${BookingAbsenceReportStatus.EXPIRED}')`,
        'expired',
      )
      .where('report.tasker_id IN (:...taskerIds)', { taskerIds })
      .andWhere("report.reported_at >= NOW() - INTERVAL '30 days'")
      .groupBy('report.tasker_id')
      .getRawMany<{
        taskerId: string;
        reported: string;
        rejected: string;
        expired: string;
      }>();
    return new Map(
      rows.map((row) => [
        row.taskerId,
        {
          reported: Number(row.reported),
          rejected: Number(row.rejected),
          expired: Number(row.expired),
        },
      ]),
    );
  }

  private async customerHistory(
    manager: EntityManager,
    customerIds: string[],
  ): Promise<Map<string, number>> {
    if (customerIds.length === 0) return new Map();
    const rows = await manager
      .getRepository(BookingAbsenceReportEntity)
      .createQueryBuilder('report')
      .select('report.customer_id', 'customerId')
      .addSelect('COUNT(*)', 'approved')
      .where('report.customer_id IN (:...customerIds)', { customerIds })
      .andWhere('report.status = :status', {
        status: BookingAbsenceReportStatus.APPROVED,
      })
      .andWhere("report.reported_at >= NOW() - INTERVAL '90 days'")
      .groupBy('report.customer_id')
      .getRawMany<{ customerId: string; approved: string }>();
    return new Map(rows.map((row) => [row.customerId, Number(row.approved)]));
  }
}
