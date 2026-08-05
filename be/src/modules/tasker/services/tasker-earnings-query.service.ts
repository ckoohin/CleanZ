import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BookingStatus } from 'src/common/enums/booking-status.enum';
import { PaymentMethod } from 'src/common/enums/payment-method.enum';
import { WalletOwnerType } from 'src/common/enums/wallet-owner-type.enum';
import { WalletTransactionType } from 'src/common/enums/wallet-transaction-type.enum';
import { resolveBookingPaymentBreakdown } from 'src/modules/admin/helpers/booking-payment-breakdown.helper';
import { BookingEntity } from 'src/modules/booking/entity/booking.entity';
import { WalletTransactionEntity } from 'src/modules/wallet/entity/wallet-transaction.entity';

/** Một đơn đã hoàn thành, kèm đầy đủ thành phần tiền đã tách phí nền tảng. */
export interface TaskerEarningsBookingRow {
  bookingId: string;
  bookingCode: string;
  completedAt: Date | null;
  createdAt: Date;
  /** Tên gói dịch vụ; `null` nếu gói đã bị xoá cứng (xoá mềm vẫn tra được). */
  serviceName: string | null;
  paymentMethod: PaymentMethod;
  /** Giá trước giảm giá (total_price + discount_amount). */
  subtotal: number;
  surchargeAmount: number;
  platformCommission: number;
  taskerEarning: number;
  /** % hoa hồng thực tế trên `subtotal`, làm tròn 2 chữ số. */
  commissionRate: number;
  /**
   * `true` khi đơn CHƯA có bút toán quyết toán nào trên ví Tasker — số tiền là
   * **ước tính** theo mức hoa hồng mặc định, không phải số đã chốt sổ.
   * Bảng kê phải đánh dấu rõ các dòng này (xem `earnings-report-pdf.service`).
   */
  isEstimated: boolean;
}

export interface TaskerEarningsQueryRange {
  /** Biên dưới (bao gồm) — chuỗi timestamp giờ VN. */
  from: string;
  /** Biên trên (KHÔNG bao gồm) — chuỗi timestamp giờ VN. */
  to: string;
}

/** Mức hoa hồng dùng khi đơn chưa có bút toán quyết toán để suy ra số thật. */
const FALLBACK_COMMISSION_RATE = 0.2;

/**
 * Nguồn dữ liệu thu nhập theo từng đơn của Tasker.
 *
 * Tách khỏi `TaskerService` để bảng kê PDF và API `admin/:id/earnings/details`
 * dùng chung đúng một phép tính — trước đây phép tính này nằm trong thân
 * `getTaskerEarningsDetails` và không tái sử dụng được.
 */
@Injectable()
export class TaskerEarningsQueryService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Lấy các đơn `COMPLETED` của Tasker trong khoảng thời gian, sắp xếp theo
   * `completedAt` tăng dần (thứ tự đọc của bảng kê).
   *
   * `range.to` là biên **mở** — dùng `>= from AND < to` để không bỏ sót mili-giây
   * cuối kỳ như cách so `BETWEEN ... 23:59:59.999`.
   */
  async findCompletedBookings(
    taskerId: string,
    range?: TaskerEarningsQueryRange,
  ): Promise<TaskerEarningsBookingRow[]> {
    const bookingRepo = this.dataSource.getRepository(BookingEntity);
    const query = bookingRepo
      .createQueryBuilder('b')
      // Gói dịch vụ xoá mềm vẫn phải tra được tên cho đơn cũ.
      .withDeleted()
      .leftJoin('b.package', 'pkg')
      .select('b.id', 'bookingId')
      .addSelect('b.bookingCode', 'bookingCode')
      .addSelect('b.completedAt', 'completedAt')
      .addSelect('b.createdAt', 'createdAt')
      .addSelect('pkg.name', 'serviceName')
      .addSelect('CAST(b.total_price AS numeric)', 'totalPrice')
      .addSelect('CAST(b.discount_amount AS numeric)', 'discountAmount')
      .addSelect('CAST(b.waiting_fee AS numeric)', 'waitingFee')
      .addSelect('b.paymentMethod', 'paymentMethod')
      .where('b.tasker_id = :taskerId', { taskerId })
      .andWhere('b.status = :status', { status: BookingStatus.COMPLETED });

    if (range) {
      query.andWhere('b.completed_at >= :from AND b.completed_at < :to', {
        from: range.from,
        to: range.to,
      });
    }

    const bookings = await query.orderBy('b.completed_at', 'ASC').getRawMany<{
      bookingId: string;
      bookingCode: string;
      completedAt: Date | null;
      createdAt: Date;
      serviceName: string | null;
      totalPrice: string;
      discountAmount: string;
      waitingFee: string;
      paymentMethod: string;
    }>();

    if (bookings.length === 0) return [];

    const txByBooking = await this.loadTaskerLedger(
      bookings.map((b) => b.bookingId),
    );

    return bookings.map((b) => {
      const totalPrice = Number(b.totalPrice ?? 0);
      const discountAmount = Number(b.discountAmount ?? 0);
      const subtotal = totalPrice + discountAmount;
      const waitingFee = Number(b.waitingFee ?? 0);
      const surchargeAmount = Math.min(
        Math.max(Math.round(waitingFee), 0),
        subtotal,
      );

      const bookingTxs = txByBooking.get(b.bookingId) ?? [];
      const explicitTaskerPlatformFee = bookingTxs
        .filter((row) => row.type === WalletTransactionType.PLATFORM_FEE)
        .reduce((sum, row) => sum + Number(row.amount), 0);

      const walletSettlementRows = bookingTxs.filter(
        (row) => row.type === WalletTransactionType.TASKER_EARNING,
      );
      const walletSettlementEarning =
        walletSettlementRows.length > 0
          ? walletSettlementRows.reduce(
              (sum, row) => sum + Number(row.amount),
              0,
            )
          : null;

      const breakdown = resolveBookingPaymentBreakdown({
        subtotal,
        surchargeAmount,
        paymentMethod: b.paymentMethod as PaymentMethod,
        ledger: {
          explicitTaskerPlatformFee,
          walletSettlementEarning,
          hasSettlementEntries: bookingTxs.length > 0,
        },
      });

      const platformCommission =
        breakdown?.platformFee ??
        Math.round(totalPrice * FALLBACK_COMMISSION_RATE);
      const taskerEarning =
        breakdown?.taskerIncome ?? totalPrice - platformCommission;

      return {
        bookingId: b.bookingId,
        bookingCode: b.bookingCode,
        completedAt: b.completedAt,
        createdAt: b.createdAt,
        serviceName: b.serviceName,
        paymentMethod: b.paymentMethod as PaymentMethod,
        subtotal,
        surchargeAmount,
        platformCommission,
        taskerEarning,
        commissionRate:
          breakdown?.commissionRate ??
          (subtotal > 0
            ? Number(((platformCommission / subtotal) * 100).toFixed(2))
            : 0),
        isEstimated: breakdown === null,
      };
    });
  }

  /** Gom bút toán ví TASKER theo booking để tránh N+1 khi tính hoa hồng. */
  private async loadTaskerLedger(bookingIds: string[]) {
    const txRows = await this.dataSource
      .getRepository(WalletTransactionEntity)
      .createQueryBuilder('wt')
      .innerJoin('wt.wallet', 'w')
      .select('wt.booking_id', 'bookingId')
      .addSelect('wt.type', 'type')
      .addSelect('wt.reference_type', 'referenceType')
      .addSelect('wt.amount', 'amount')
      .addSelect('w.owner_type', 'ownerType')
      .where('wt.booking_id IN (:...bookingIds)', { bookingIds })
      .andWhere('w.owner_type = :ownerType', {
        ownerType: WalletOwnerType.TASKER,
      })
      .getRawMany<{
        bookingId: string;
        type: WalletTransactionType;
        referenceType: string | null;
        amount: string;
        ownerType: WalletOwnerType;
      }>();

    const txByBooking = new Map<string, typeof txRows>();
    for (const row of txRows) {
      const bucket = txByBooking.get(row.bookingId);
      if (bucket) {
        bucket.push(row);
      } else {
        txByBooking.set(row.bookingId, [row]);
      }
    }

    return txByBooking;
  }
}
