import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { WithdrawalStatus } from 'src/common/enums/with-drawal-status.enum';
import { formatVnd } from 'src/common/helpers/number.helper';
import { PayoutService } from './payout.service';

/** Ảnh chụp tại một thời điểm: sổ nội bộ so với tiền thật ở PayOS. */
export interface PayoutReconciliationSnapshot {
  /** Số dư khả dụng của tài khoản chi hộ PayOS. `null` = không đọc được. */
  payoutBalance: number | null;
  /** Tiền đang giữ hộ người dùng (ví CUSTOMER + TASKER). */
  userLiability: number;
  /** Số dư ví SYSTEM — hoa hồng + escrow, KHÔNG phải nguồn chi. */
  systemWallet: number;
  /** Tổng các đơn rút đang chờ chi (PENDING + APPROVED, cả customer và tasker). */
  pendingPayout: number;
  /** Thiếu bao nhiêu so với các đơn đang chờ chi. `null` khi chưa đọc được số dư. */
  shortfall: number | null;
  checkedAt: Date;
}

/**
 * Đối soát sổ nội bộ với TIỀN THẬT ở PayOS.
 *
 * Trước đây mọi con số tài chính trong admin đều là `SUM(balance)` trên bảng
 * `wallets` — tức hệ thống tự soi sổ của chính nó, không có gì neo vào thực tế.
 * Sổ có thể ghi hàng chục triệu trong khi tài khoản chi hộ chỉ còn vài chục nghìn
 * mà không bộ phận nào phát hiện; lệnh chi khi đó thất bại ngay ở PayOS.
 *
 * Job này định kỳ đọc số dư thật và so với nghĩa vụ, ghi log cảnh báo khi thiếu.
 *
 * Lưu ý về phạm vi: ví SYSTEM và số dư chi hộ là HAI QUỸ TÁCH BIỆT. Tiền khách
 * nạp vào kênh thanh toán không tự chảy sang tài khoản chi hộ — phải nạp thủ công.
 */
@Injectable()
export class PayoutReconciliationService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PayoutReconciliationService.name);
  private readonly intervalMs: number;
  private interval?: NodeJS.Timeout;
  private isRunning = false;

  constructor(
    private readonly dataSource: DataSource,
    private readonly payoutService: PayoutService,
    configService: ConfigService,
  ) {
    this.intervalMs = Number(
      configService.get<string>('PAYOUT_RECONCILIATION_INTERVAL_MS') ?? 900_000,
    );
  }

  onModuleInit(): void {
    if (this.intervalMs <= 0) {
      this.logger.log('Đối soát quỹ chi hộ đang TẮT (interval <= 0).');
      return;
    }

    this.interval = setInterval(() => {
      void this.tick();
    }, this.intervalMs);
    this.interval.unref?.();

    void this.tick();
  }

  onModuleDestroy(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  /** Cờ `isRunning` chặn hai lượt chồng nhau khi PayOS phản hồi chậm. */
  private async tick(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const snapshot = await this.reconcile();
      this.report(snapshot);
    } catch (err) {
      this.logger.error(
        `Đối soát quỹ chi hộ lỗi: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      this.isRunning = false;
    }
  }

  /** Đọc số liệu hai bên. Tách khỏi `tick` để admin/test gọi trực tiếp được. */
  async reconcile(): Promise<PayoutReconciliationSnapshot> {
    const [payoutBalance, wallets, pendingPayout] = await Promise.all([
      this.payoutService.getAvailableBalance(),
      this.sumWalletsByOwner(),
      this.sumPendingPayout(),
    ]);

    const userLiability = wallets.customer + wallets.tasker;

    return {
      payoutBalance,
      userLiability,
      systemWallet: wallets.system,
      pendingPayout,
      shortfall:
        payoutBalance === null
          ? null
          : Math.max(pendingPayout - payoutBalance, 0),
      checkedAt: new Date(),
    };
  }

  private report(s: PayoutReconciliationSnapshot): void {
    if (s.payoutBalance === null) {
      this.logger.warn(
        `Đối soát quỹ chi hộ: KHÔNG đọc được số dư PayOS. Nghĩa vụ người dùng ${formatVnd(s.userLiability)}, đang chờ chi ${formatVnd(s.pendingPayout)}.`,
      );
      return;
    }

    const summary =
      `quỹ chi hộ ${formatVnd(s.payoutBalance)} | đang chờ chi ${formatVnd(s.pendingPayout)} | ` +
      `nghĩa vụ người dùng ${formatVnd(s.userLiability)} | ví SYSTEM ${formatVnd(s.systemWallet)}`;

    if (s.shortfall && s.shortfall > 0) {
      this.logger.error(
        `THIẾU QUỸ CHI HỘ: cần nạp thêm ${formatVnd(s.shortfall)} để chi hết các đơn đang chờ — ${summary}`,
      );
      return;
    }

    this.logger.log(`Đối soát quỹ chi hộ OK — ${summary}`);
  }

  private async sumWalletsByOwner(): Promise<{
    customer: number;
    tasker: number;
    system: number;
  }> {
    const rows = await this.dataSource.query<
      Array<{ owner_type: string; total: string }>
    >(
      `SELECT owner_type, COALESCE(SUM(balance), 0)::numeric AS total
         FROM wallets
        GROUP BY owner_type`,
    );

    const byOwner = new Map(rows.map((r) => [r.owner_type, Number(r.total)]));
    return {
      customer: byOwner.get('CUSTOMER') ?? 0,
      tasker: byOwner.get('TASKER') ?? 0,
      system: byOwner.get('SYSTEM') ?? 0,
    };
  }

  /**
   * Đơn đã duyệt nhưng chưa chi xong cũng tính vào: ví đã bị trừ, nghĩa vụ chi
   * tiền thật vẫn còn nguyên cho tới khi PayOS xác nhận.
   */
  private async sumPendingPayout(): Promise<number> {
    const statuses = [WithdrawalStatus.PENDING, WithdrawalStatus.APPROVED];

    const rows = await this.dataSource.query<Array<{ total: string }>>(
      // Ép `status` về text: hai bảng dùng hai enum type khác nhau
      // (tasker_withdrawal_requests_status_enum vs customer_..._status_enum)
      // nên UNION ALL trực tiếp sẽ lỗi "could not convert type".
      `SELECT COALESCE(SUM(amount), 0)::numeric AS total FROM (
         SELECT amount, status::text AS status FROM tasker_withdrawal_requests
         UNION ALL
         SELECT amount, status::text AS status FROM customer_withdrawal_requests
       ) AS w
       WHERE status = ANY($1)`,
      [statuses],
    );

    return Number(rows[0]?.total ?? 0);
  }
}
