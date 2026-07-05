import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AppException } from 'src/common/exceptions/app.exception';
import { TopupProvider } from 'src/common/enums/topup-provider.enum';
import { TopupStatus } from 'src/common/enums/topup-status.enum';
import { WalletTransactionType } from 'src/common/enums/wallet-transaction-type.enum';
import { toNumber } from 'src/common/helpers/number.helper';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { PaginatedData } from 'src/common/helpers/response.interface';
import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';
import { WalletEntity } from './entity/wallet.entity';
import { WalletTopupEntity } from './entity/wallet-topup.entity';
import { WalletService } from './wallet.service';
import { CreateTopupDto } from './dto/create-topup.dto';
import { TopupListQueryDto } from './dto/topup-list-query.dto';
import { PAYMENT_GATEWAY } from './gateways/payment-gateway.interface';
import type { PaymentGateway } from './gateways/payment-gateway.interface';

const DEFAULTS = {
  fxRate: 25000, // VND / 1 USD
  minVnd: 10000,
  maxVnd: 50000000,
};

export interface TopupView {
  id: string;
  amountVnd: number;
  amountUsd: number;
  fxRate: number;
  provider: TopupProvider;
  status: TopupStatus;
  approveUrl: string | null;
  paidAt: Date | null;
  createdAt: Date;
}

export interface CreateTopupResult extends TopupView {
  topupId: string;
}

@Injectable()
export class WalletTopupService {
  private readonly logger = new Logger(WalletTopupService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly walletService: WalletService,
    private readonly configService: ConfigService,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
  ) {}

  // ── Public API ────────────────────────────────────────────────────────────

  async createTopup(
    userId: string,
    dto: CreateTopupDto,
  ): Promise<CreateTopupResult> {
    return asyncHandleOperation(async () => {
      const amountVnd = Math.round(Number(dto.amountVnd));
      const minVnd = this.num('TASKER_TOPUP_MIN_VND', DEFAULTS.minVnd);
      const maxVnd = this.num('TASKER_TOPUP_MAX_VND', DEFAULTS.maxVnd);
      if (amountVnd < minVnd || amountVnd > maxVnd) {
        throw new AppException(
          `Số tiền nạp phải trong khoảng ${minVnd} - ${maxVnd} VND`,
        );
      }

      const fxRate = this.num('TASKER_TOPUP_VND_PER_USD', DEFAULTS.fxRate);
      if (fxRate <= 0) {
        throw new AppException('Tỷ giá quy đổi không hợp lệ', 500);
      }
      const amountUsd = Math.round((amountVnd / fxRate) * 100) / 100;
      if (amountUsd < 0.01) {
        throw new AppException('Số tiền nạp quy đổi USD quá nhỏ');
      }

      const tasker = await this.findTaskerByUserId(userId);
      const wallet = await this.walletService.getOrCreateTaskerWallet(
        this.dataSource.manager,
        tasker,
      );

      const repo = this.dataSource.getRepository(WalletTopupEntity);
      const topup = await repo.save(
        repo.create({
          tasker,
          wallet,
          amountVnd,
          amountUsd,
          fxRate,
          provider: TopupProvider.PAYPAL,
          status: TopupStatus.PENDING,
        }),
      );

      const order = await this.gateway.createOrder({
        amountValue: amountUsd.toFixed(2),
        currency: 'USD',
        referenceId: topup.id,
        returnUrl: this.returnUrl(topup.id),
        cancelUrl: this.cancelUrl(topup.id),
        description: `Nap vi CleanZ ${amountVnd} VND`,
      });

      topup.providerOrderId = order.orderId;
      topup.approveUrl = order.approveUrl;
      await repo.save(topup);

      return { topupId: topup.id, ...this.toView(topup) };
    }, 'Không thể tạo đơn nạp tiền');
  }

  /** FE poll: đọc chi tiết đơn + chủ động verify với cổng (đủ cho MVP, không cần webhook). */
  async getTopupForUser(userId: string, topupId: string): Promise<TopupView> {
    return asyncHandleOperation(async () => {
      const topup = await this.loadOwnedTopup(userId, topupId);
      const synced = await this.syncTopupStatus(topup);
      return this.toView(synced);
    }, 'Không thể lấy đơn nạp tiền');
  }

  async listMyTopups(
    userId: string,
    query: TopupListQueryDto,
  ): Promise<PaginatedData<TopupView>> {
    return asyncHandleOperation(async () => {
      const tasker = await this.findTaskerByUserId(userId);
      const { page = 1, limit = 20, status } = query;
      const [items, total] = await this.dataSource
        .getRepository(WalletTopupEntity)
        .findAndCount({
          where: {
            tasker: { id: tasker.id },
            ...(status ? { status } : {}),
          },
          order: { createdAt: 'DESC' },
          skip: (page - 1) * limit,
          take: limit,
        });
      return {
        items: items.map((t) => this.toView(t)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }, 'Không thể lấy lịch sử nạp tiền');
  }

  async listAllTopups(
    query: TopupListQueryDto,
  ): Promise<PaginatedData<WalletTopupEntity>> {
    return asyncHandleOperation(async () => {
      const { page = 1, limit = 20, status } = query;
      const [items, total] = await this.dataSource
        .getRepository(WalletTopupEntity)
        .findAndCount({
          where: { ...(status ? { status } : {}) },
          relations: ['tasker', 'tasker.user'],
          order: { createdAt: 'DESC' },
          skip: (page - 1) * limit,
          take: limit,
        });
      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }, 'Không thể lấy danh sách đơn nạp');
  }

  /** Webhook PayPal (server-to-server). Verify chữ ký rồi re-check trạng thái qua API. */
  async handlePayPalWebhook(
    headers: Record<string, string | string[] | undefined>,
    body: Record<string, unknown>,
  ): Promise<{ received: boolean }> {
    const valid = await this.gateway.verifyWebhook(headers, body);
    if (!valid) {
      this.logger.warn('PayPal webhook verify thất bại — bỏ qua');
      return { received: true };
    }

    const topupId = this.extractTopupId(body);
    if (!topupId) {
      this.logger.warn('PayPal webhook không tìm thấy custom_id (topupId)');
      return { received: true };
    }

    const topup = await this.dataSource
      .getRepository(WalletTopupEntity)
      .findOne({ where: { id: topupId }, relations: ['wallet'] });
    if (topup) {
      await this.syncTopupStatus(topup);
    }
    return { received: true };
  }

  // ── Nội bộ ──────────────────────────────────────────────────────────────

  /** Truy vấn cổng làm nguồn sự thật; cộng ví nếu đã thanh toán. Idempotent. */
  private async syncTopupStatus(
    topup: WalletTopupEntity,
  ): Promise<WalletTopupEntity> {
    if (topup.status !== TopupStatus.PENDING || !topup.providerOrderId) {
      return topup;
    }

    const order = await this.gateway.getOrder(topup.providerOrderId);
    let captured = order;
    if (order.status === 'APPROVED') {
      captured = await this.gateway.captureOrder(topup.providerOrderId);
    }

    if (captured.status !== 'COMPLETED') {
      return topup; // vẫn đang chờ người dùng thanh toán
    }

    // Đối chiếu số tiền USD khớp đơn trước khi cộng ví.
    if (
      captured.paidAmount != null &&
      Number(captured.paidAmount).toFixed(2) !==
        Number(topup.amountUsd).toFixed(2)
    ) {
      this.logger.error(
        `Topup ${topup.id}: số tiền lệch (đơn ${topup.amountUsd} USD vs cổng ${captured.paidAmount})`,
      );
      await this.dataSource
        .getRepository(WalletTopupEntity)
        .update({ id: topup.id }, { status: TopupStatus.FAILED });
      return { ...topup, status: TopupStatus.FAILED };
    }

    await this.creditTopup(
      topup.id,
      topup.wallet.id,
      captured.captureId,
      captured.raw,
    );

    const fresh = await this.dataSource
      .getRepository(WalletTopupEntity)
      .findOne({ where: { id: topup.id } });
    return fresh ?? topup;
  }

  /** Cộng ví đúng 1 lần cho 1 đơn (lock hàng topup + check status trong transaction). */
  private async creditTopup(
    topupId: string,
    walletId: string,
    captureId: string | null,
    raw: unknown,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const topupRepo = manager.getRepository(WalletTopupEntity);
      const locked = await topupRepo.findOne({
        where: { id: topupId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!locked || locked.status === TopupStatus.PAID) {
        return; // idempotent: đã cộng rồi
      }

      const wallet = await manager
        .getRepository(WalletEntity)
        .findOne({ where: { id: walletId } });
      if (!wallet) {
        throw new AppException('Không tìm thấy ví để cộng tiền nạp', 500);
      }

      await this.walletService.creditWallet(manager, {
        wallet,
        amount: toNumber(locked.amountVnd),
        type: WalletTransactionType.DEPOSIT,
        referenceId: locked.id,
        referenceType: 'TOPUP',
        description: `Nạp ví qua ${locked.provider} (+${toNumber(locked.amountVnd)} VND)`,
      });

      locked.status = TopupStatus.PAID;
      locked.paidAt = new Date();
      locked.providerCaptureId = captureId;
      locked.rawPayload = (raw as Record<string, unknown>) ?? null;
      await topupRepo.save(locked);
    });
  }

  private extractTopupId(body: Record<string, unknown>): string | null {
    const resource = body?.resource as
      | {
          custom_id?: string;
          purchase_units?: Array<{ custom_id?: string }>;
        }
      | undefined;
    return (
      resource?.custom_id ?? resource?.purchase_units?.[0]?.custom_id ?? null
    );
  }

  private async loadOwnedTopup(
    userId: string,
    topupId: string,
  ): Promise<WalletTopupEntity> {
    const topup = await this.dataSource
      .getRepository(WalletTopupEntity)
      .findOne({
        where: { id: topupId },
        relations: ['tasker', 'tasker.user', 'wallet'],
      });
    if (!topup || topup.tasker?.user?.id !== userId) {
      throw new AppException('Không tìm thấy đơn nạp tiền', 404);
    }
    return topup;
  }

  private async findTaskerByUserId(userId: string): Promise<TaskerEntity> {
    const tasker = await this.dataSource.getRepository(TaskerEntity).findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });
    if (!tasker) {
      throw new AppException('Không tìm thấy hồ sơ tasker', 404);
    }
    return tasker;
  }

  private toView(topup: WalletTopupEntity): TopupView {
    return {
      id: topup.id,
      amountVnd: toNumber(topup.amountVnd),
      amountUsd: toNumber(topup.amountUsd),
      fxRate: toNumber(topup.fxRate),
      provider: topup.provider,
      status: topup.status,
      approveUrl: topup.approveUrl ?? null,
      paidAt: topup.paidAt ?? null,
      createdAt: topup.createdAt,
    };
  }

  private num(key: string, fallback: number): number {
    const raw = this.configService.get<string>(key);
    const value = Number(raw);
    return raw != null && Number.isFinite(value) ? value : fallback;
  }

  private returnUrl(topupId: string): string {
    const base =
      this.configService.get<string>('TOPUP_RETURN_URL') ??
      `${this.frontendUrl()}/tasker/wallet/topup/success`;
    return this.appendTopupId(base, topupId);
  }

  private cancelUrl(topupId: string): string {
    const base =
      this.configService.get<string>('TOPUP_CANCEL_URL') ??
      `${this.frontendUrl()}/tasker/wallet/topup/cancel`;
    return this.appendTopupId(base, topupId);
  }

  /** Gắn topupId vào URL redirect để trang success/cancel biết đơn nào mà poll. */
  private appendTopupId(url: string, topupId: string): string {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}topupId=${encodeURIComponent(topupId)}`;
  }

  private frontendUrl(): string {
    return (
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3020'
    );
  }
}
