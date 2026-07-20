import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager } from 'typeorm';
import { TopupStatus } from 'src/common/enums/topup-status.enum';
import { WalletTransactionType } from 'src/common/enums/wallet-transaction-type.enum';
import { AppException } from 'src/common/exceptions/app.exception';
import { toNumber } from 'src/common/helpers/number.helper';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { CustomerEntity } from 'src/modules/customer/entity/customer.entity';
import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';
import { WalletOwnerType } from 'src/common/enums/wallet-owner-type.enum';
import { SYSTEM_CONFIG_KEYS } from 'src/modules/system-config/system-config.keys';
import { SystemConfigService } from 'src/modules/system-config/system-config.service';
import { WalletTopupOrderEntity } from './entity/wallet-topup-order.entity';
import { WalletEntity } from './entity/wallet.entity';
import { WalletTransactionEntity } from './entity/wallet-transaction.entity';
import { PaypalService } from './paypal.service';
import { AdyenService, AdyenNotificationRequestItem } from './adyen.service';
import { WalletService } from './wallet.service';
import { Types } from '@adyen/api-library';

const SessionStatus = Types.checkout.SessionResultResponse.StatusEnum;
const EventCode = Types.notification.NotificationRequestItem.EventCodeEnum;
const NotifySuccess = Types.notification.NotificationRequestItem.SuccessEnum;

export type TopupProvider = 'PAYPAL' | 'ADYEN';

export interface TopupConfig {
  minVnd: number;
  maxVnd: number;
  fxRate: number;
}

export interface CreateTopupResult {
  topupId: string;
  provider: TopupProvider;
  paypalOrderId: string | null;
  amountVnd: number;
  amountUsd: number | null;
  approveUrl: string | null;
  /** URL chuyển hướng thanh toán PayPal. NULL với ADYEN (dùng session bên dưới). */
  payUrl: string | null;
  /** Chỉ có khi provider = ADYEN — dùng để mount Web Drop-in phía FE. */
  adyenSessionId: string | null;
  adyenSessionData: string | null;
  adyenClientKey: string | null;
}

export interface CaptureTopupResult {
  topupId: string;
  status: TopupStatus;
  amountVnd: number;
  balance: number;
}

export interface SavedCardView {
  id: string;
  brand: string | null;
  lastFour: string | null;
  expiryMonth: string | null;
  expiryYear: string | null;
}

@Injectable()
export class WalletTopupService {
  private readonly logger = new Logger(WalletTopupService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly walletService: WalletService,
    private readonly paypalService: PaypalService,
    private readonly adyenService: AdyenService,
    private readonly systemConfig: SystemConfigService,
    private readonly configService: ConfigService,
  ) {}

  /** Hạn mức + tỷ giá đang hiệu lực, để FE hiển thị và validate trước khi gọi PayPal. */
  async getTopupConfig(): Promise<TopupConfig> {
    const manager = this.dataSource.manager;
    const [minVnd, maxVnd, fxRate] = await Promise.all([
      this.systemConfig.getRegisteredNumber(
        manager,
        SYSTEM_CONFIG_KEYS.TOPUP_MIN_VND,
      ),
      this.systemConfig.getRegisteredNumber(
        manager,
        SYSTEM_CONFIG_KEYS.TOPUP_MAX_VND,
      ),
      this.systemConfig.getRegisteredNumber(
        manager,
        SYSTEM_CONFIG_KEYS.TOPUP_VND_PER_USD,
      ),
    ]);

    return { minVnd, maxVnd, fxRate };
  }

  async createTopup(
    userId: string,
    amountVnd: number,
    bookingId?: string,
    ownerType: WalletOwnerType = WalletOwnerType.CUSTOMER,
    opts: {
      provider?: TopupProvider;
      ipAddr?: string;
    } = {},
  ): Promise<CreateTopupResult> {
    return asyncHandleOperation(async () => {
      const provider: TopupProvider = opts.provider ?? 'PAYPAL';
      const { minVnd, maxVnd, fxRate } = await this.getTopupConfig();

      if (!Number.isInteger(amountVnd) || amountVnd < minVnd) {
        throw new AppException(
          `Số tiền nạp tối thiểu là ${minVnd.toLocaleString('vi-VN')}đ`,
        );
      }
      if (amountVnd > maxVnd) {
        throw new AppException(
          `Số tiền nạp tối đa là ${maxVnd.toLocaleString('vi-VN')}đ`,
        );
      }

      const customer =
        ownerType === WalletOwnerType.CUSTOMER
          ? await this.findCustomer(userId)
          : null;
      const tasker =
        ownerType === WalletOwnerType.TASKER
          ? await this.findTasker(userId)
          : null;
      const wallet = customer
        ? await this.walletService.getOrCreateCustomerWallet(
            this.dataSource.manager,
            customer,
          )
        : await this.walletService.getOrCreateTaskerWallet(
            this.dataSource.manager,
            tasker!,
          );

      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ??
        'http://localhost:3020';
      const returnBase =
        ownerType === WalletOwnerType.TASKER
          ? '/tasker/earnings/topup'
          : '/customer/wallet/topup';

      const topupRepo = this.dataSource.getRepository(WalletTopupOrderEntity);

      if (provider === 'ADYEN') {
        const topup = await topupRepo.save(
          topupRepo.create({
            customerId: customer?.id ?? null,
            taskerId: tasker?.id ?? null,
            walletId: wallet.id,
            provider: 'ADYEN',
            status: TopupStatus.CREATED,
            amountVnd,
            amountUsd: null,
            fxRate: null,
            bookingId: bookingId ?? null,
          }),
        );

        // reference = topup.id trực tiếp — Adyen không giới hạn alphanumeric
        // như vnp_txn_ref của VNPay nên không cần đổi uuid<->hex.
        const returnUrl = `${frontendUrl}${returnBase}/adyen-return?topupId=${topup.id}`;
        const session = await this.adyenService.createSession({
          amountVnd,
          reference: topup.id,
          returnUrl,
          shopperReference: userId,
          storePaymentMethod: true,
          shopperIp: opts.ipAddr,
        });

        topup.adyenSessionId = session.id;
        await topupRepo.save(topup);

        return {
          topupId: topup.id,
          provider: 'ADYEN' as const,
          paypalOrderId: null,
          amountVnd,
          amountUsd: null,
          approveUrl: null,
          payUrl: null,
          adyenSessionId: session.id,
          adyenSessionData: session.sessionData,
          adyenClientKey: this.adyenService.clientKey,
        };
      }

      const amountUsd = Math.max(
        0.01,
        Math.round((amountVnd / fxRate) * 100) / 100,
      );

      const topup = await topupRepo.save(
        topupRepo.create({
          customerId: customer?.id ?? null,
          taskerId: tasker?.id ?? null,
          walletId: wallet.id,
          provider: 'PAYPAL',
          status: TopupStatus.CREATED,
          amountVnd,
          amountUsd,
          fxRate,
          bookingId: bookingId ?? null,
        }),
      );

      try {
        const order = await this.paypalService.createOrder({
          amountUsd,
          customId: topup.id,
          referenceId: topup.id,
          returnUrl: `${frontendUrl}${returnBase}/return?topupId=${topup.id}`,
          cancelUrl: `${frontendUrl}${returnBase}/cancel?topupId=${topup.id}`,
          description: `Nạp ví CleanZ ${amountVnd.toLocaleString('vi-VN')}đ`,
        });

        topup.paypalOrderId = order.id;
        await topupRepo.save(topup);

        const approveUrl =
          order.links?.find((l) => l.rel === 'approve')?.href ?? null;

        return {
          topupId: topup.id,
          provider: 'PAYPAL' as const,
          paypalOrderId: order.id,
          amountVnd,
          amountUsd,
          approveUrl,
          payUrl: approveUrl,
          adyenSessionId: null,
          adyenSessionData: null,
          adyenClientKey: null,
        };
      } catch (err) {
        topup.status = TopupStatus.FAILED;
        topup.failReason =
          err instanceof Error ? err.message : 'Tạo đơn PayPal thất bại';
        await topupRepo.save(topup);
        throw err;
      }
    }, 'Không thể tạo đơn nạp tiền');
  }

  async captureTopup(
    userId: string,
    topupId: string,
    ownerType: WalletOwnerType = WalletOwnerType.CUSTOMER,
  ): Promise<CaptureTopupResult> {
    return asyncHandleOperation(async () => {
      return this.dataSource.transaction(async (manager) => {
        const topupRepo = manager.getRepository(WalletTopupOrderEntity);
        const topup = await topupRepo.findOne({
          where: { id: topupId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!topup) {
          throw new NotFoundException('Không tìm thấy đơn nạp tiền');
        }

        const customer =
          ownerType === WalletOwnerType.CUSTOMER
            ? await this.findCustomer(userId, manager)
            : null;
        const tasker =
          ownerType === WalletOwnerType.TASKER
            ? await this.findTasker(userId, manager)
            : null;
        const ownsTopup = customer
          ? topup.customerId === customer.id
          : topup.taskerId === tasker?.id;

        if (!ownsTopup) {
          throw new AppException('Bạn không có quyền với đơn nạp này', 403);
        }

        const getOwnerWallet = () =>
          customer
            ? this.walletService.getOrCreateCustomerWallet(manager, customer)
            : this.walletService.getOrCreateTaskerWallet(manager, tasker!);

        // Idempotent: đã cộng ví rồi thì trả kết quả cũ, không capture/cộng lại.
        if (topup.status === TopupStatus.COMPLETED && topup.walletTxId) {
          const wallet = await getOwnerWallet();
          return {
            topupId: topup.id,
            status: topup.status,
            amountVnd: toNumber(topup.amountVnd),
            balance: toNumber(wallet.balance),
          };
        }

        if (topup.status !== TopupStatus.CREATED || !topup.paypalOrderId) {
          throw new AppException(
            'Đơn nạp không ở trạng thái có thể thanh toán',
          );
        }

        const capture = await this.paypalService.captureOrder(
          topup.paypalOrderId,
        );

        if (capture.status !== 'COMPLETED') {
          topup.status = TopupStatus.FAILED;
          topup.failReason = `PayPal trả trạng thái ${capture.status}`;
          await topupRepo.save(topup);
          throw new AppException(
            'Thanh toán PayPal chưa hoàn tất, ví chưa được cộng tiền',
          );
        }

        const wallet = await getOwnerWallet();
        const amountVnd = toNumber(topup.amountVnd);

        await this.walletService.creditWallet(manager, {
          wallet,
          amount: amountVnd,
          type: WalletTransactionType.DEPOSIT,
          referenceId: topup.id,
          referenceType: 'PAYPAL_TOPUP',
          description: `Nạp tiền qua PayPal (${amountVnd.toLocaleString('vi-VN')}đ)`,
        });

        // Lấy bút toán DEPOSIT vừa ghi để chốt idempotency.
        const lastTx = await manager
          .getRepository(WalletTransactionEntity)
          .findOne({
            where: { referenceId: topup.id, referenceType: 'PAYPAL_TOPUP' },
            order: { createdAt: 'DESC' },
          });

        topup.status = TopupStatus.COMPLETED;
        topup.captureId = capture.captureId;
        topup.walletTxId = lastTx?.id ?? null;
        await topupRepo.save(topup);

        const freshWallet = await getOwnerWallet();

        return {
          topupId: topup.id,
          status: TopupStatus.COMPLETED,
          amountVnd,
          balance: toNumber(freshWallet.balance),
        };
      });
    }, 'Không thể hoàn tất nạp tiền');
  }

  /**
   * Xác nhận kết quả Adyen ngay sau khi Drop-in `onPaymentCompleted` resolve.
   * BE tự hỏi lại Adyen (getSessionResult) — không tin trạng thái FE báo.
   * Idempotent: đơn đã COMPLETED trả kết quả cũ, không cộng ví lần 2. Webhook
   * (handleAdyenWebhook) là đường xác nhận dự phòng, cùng gọi settleAdyenTopup.
   */
  async confirmAdyenReturn(
    userId: string,
    input: { sessionId: string; sessionResult: string },
    ownerType: WalletOwnerType = WalletOwnerType.CUSTOMER,
  ): Promise<CaptureTopupResult> {
    return asyncHandleOperation(async () => {
      return this.dataSource.transaction(async (manager) => {
        const topupRepo = manager.getRepository(WalletTopupOrderEntity);
        const topup = await topupRepo.findOne({
          where: { adyenSessionId: input.sessionId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!topup || topup.provider !== 'ADYEN') {
          throw new NotFoundException('Không tìm thấy đơn nạp tiền Adyen');
        }

        const customer =
          ownerType === WalletOwnerType.CUSTOMER
            ? await this.findCustomer(userId, manager)
            : null;
        const tasker =
          ownerType === WalletOwnerType.TASKER
            ? await this.findTasker(userId, manager)
            : null;
        const ownsTopup = customer
          ? topup.customerId === customer.id
          : topup.taskerId === tasker?.id;
        if (!ownsTopup) {
          throw new AppException('Bạn không có quyền với đơn nạp này', 403);
        }

        if (topup.status === TopupStatus.CREATED) {
          const result = await this.adyenService.getSessionResult(
            input.sessionId,
            input.sessionResult,
          );
          const payment = result.payments?.[0];

          if (
            result.status === SessionStatus.Completed &&
            payment?.pspReference
          ) {
            await this.settleAdyenTopup(manager, topup, {
              pspReference: payment.pspReference,
              amountVnd: payment.amount?.value ?? toNumber(topup.amountVnd),
            });
          } else if (result.status === SessionStatus.Canceled) {
            topup.status = TopupStatus.CANCELLED;
            topup.failReason = 'Người dùng hủy thanh toán trên Adyen Drop-in';
            await topupRepo.save(topup);
          } else if (
            result.status !== SessionStatus.Active &&
            result.status !== SessionStatus.PaymentPending
          ) {
            topup.status = TopupStatus.FAILED;
            topup.failReason = `Adyen trả trạng thái ${result.status ?? 'không xác định'}`;
            await topupRepo.save(topup);
          }
        }

        if (
          topup.status === TopupStatus.FAILED ||
          topup.status === TopupStatus.CANCELLED
        ) {
          throw new AppException(
            topup.failReason ?? 'Thanh toán Adyen không thành công',
          );
        }

        const wallet = await manager
          .getRepository(WalletEntity)
          .findOneByOrFail({ id: topup.walletId });

        return {
          topupId: topup.id,
          status: topup.status,
          amountVnd: toNumber(topup.amountVnd),
          balance: toNumber(wallet.balance),
        };
      });
    }, 'Không thể xác nhận thanh toán Adyen');
  }

  /**
   * Webhook server-to-server của Adyen. Verify HMAC bằng SDK chính thức (không
   * tự viết thuật toán ký). Luôn nuốt lỗi từng item — không throw ra ngoài để
   * Adyen không retry-storm vì lỗi 500. Controller luôn trả về '[accepted]'.
   */
  async handleAdyenWebhook(
    items: AdyenNotificationRequestItem[],
  ): Promise<void> {
    for (const item of items) {
      try {
        if (!this.adyenService.verifyWebhookHmac(item)) {
          this.logger.warn(
            `Adyen webhook sai chữ ký (merchantReference=${item.merchantReference})`,
          );
          continue;
        }

        if (item.eventCode === EventCode.Authorisation) {
          if (item.success !== NotifySuccess.True) continue;
          await this.dataSource.transaction(async (manager) => {
            const topup = await manager
              .getRepository(WalletTopupOrderEntity)
              .findOne({
                where: { id: item.merchantReference },
                lock: { mode: 'pessimistic_write' },
              });
            if (!topup || topup.provider !== 'ADYEN') return;
            await this.settleAdyenTopup(manager, topup, {
              pspReference: item.pspReference,
              amountVnd: item.amount.value ?? 0,
            });
          });
        } else if (item.eventCode === EventCode.Refund) {
          await this.dataSource.transaction(async (manager) => {
            await this.settleAdyenRefund(manager, item);
          });
        }
      } catch (err) {
        this.logger.error(
          `Adyen webhook xử lý lỗi (merchantReference=${item.merchantReference}): ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
  }

  /**
   * Cốt lõi ghi nhận thanh toán Adyen thành công cho 1 đơn (đã lock). Idempotent:
   * đã cộng ví rồi thì bỏ qua. Được gọi từ cả confirmAdyenReturn và webhook.
   */
  private async settleAdyenTopup(
    manager: EntityManager,
    topup: WalletTopupOrderEntity,
    input: { pspReference: string; amountVnd: number },
  ): Promise<void> {
    if (topup.status === TopupStatus.COMPLETED && topup.walletTxId) return;
    if (topup.status !== TopupStatus.CREATED) return;

    const expectedAmount = toNumber(topup.amountVnd);
    if (input.amountVnd !== expectedAmount) {
      throw new AppException('Số tiền Adyen trả về không khớp đơn nạp');
    }

    const topupRepo = manager.getRepository(WalletTopupOrderEntity);
    const wallet = await manager
      .getRepository(WalletEntity)
      .findOneByOrFail({ id: topup.walletId });

    await this.walletService.creditWallet(manager, {
      wallet,
      amount: expectedAmount,
      type: WalletTransactionType.DEPOSIT,
      referenceId: topup.id,
      referenceType: 'ADYEN_TOPUP',
      description: `Nạp tiền `,
    });
    const lastTx = await manager
      .getRepository(WalletTransactionEntity)
      .findOne({
        where: { referenceId: topup.id, referenceType: 'ADYEN_TOPUP' },
        order: { createdAt: 'DESC' },
      });

    topup.status = TopupStatus.COMPLETED;
    topup.walletTxId = lastTx?.id ?? null;
    topup.adyenPspReference = input.pspReference;
    await topupRepo.save(topup);
  }

  /**
   * Admin hoàn tiền 1 đơn nạp Adyen đã COMPLETED. Refund Adyen là BẤT ĐỒNG BỘ —
   * chỉ trả ack, chuyển REFUND_PENDING, CHƯA trừ ví. Ví chỉ bị trừ khi webhook
   * REFUND xác nhận thành công (xem settleAdyenRefund).
   */
  async refundAdyenTopup(
    topupId: string,
    adminUserId: string,
  ): Promise<CaptureTopupResult> {
    return asyncHandleOperation(async () => {
      return this.dataSource.transaction(async (manager) => {
        const topupRepo = manager.getRepository(WalletTopupOrderEntity);
        const topup = await topupRepo.findOne({
          where: { id: topupId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!topup || topup.provider !== 'ADYEN') {
          throw new NotFoundException('Không tìm thấy đơn nạp tiền Adyen');
        }
        if (
          topup.status === TopupStatus.REFUNDED ||
          topup.status === TopupStatus.REFUND_PENDING
        ) {
          throw new AppException('Đơn nạp này đang hoặc đã được hoàn tiền');
        }
        if (topup.status !== TopupStatus.COMPLETED || !topup.walletTxId) {
          throw new AppException('Chỉ hoàn tiền được đơn nạp đã thành công');
        }
        if (!topup.adyenPspReference) {
          throw new AppException(
            'Đơn nạp thiếu dữ liệu giao dịch Adyen (pspReference) — không thể hoàn tự động',
          );
        }

        const amountVnd = toNumber(topup.amountVnd);
        const wallet = await manager
          .getRepository(WalletEntity)
          .findOneByOrFail({ id: topup.walletId });
        if (toNumber(wallet.balance) < amountVnd) {
          throw new AppException(
            'Số dư ví không đủ để hoàn tiền (tiền nạp có thể đã được sử dụng)',
          );
        }

        const refund = await this.adyenService.refundPayment(
          topup.adyenPspReference,
          amountVnd,
          topup.id,
        );
        this.logger.log(
          `Admin ${adminUserId} khởi tạo hoàn tiền topup ${topup.id} (refund pspReference=${refund.pspReference})`,
        );

        topup.status = TopupStatus.REFUND_PENDING;
        topup.adyenRefundPspReference = refund.pspReference;
        await topupRepo.save(topup);

        return {
          topupId: topup.id,
          status: TopupStatus.REFUND_PENDING,
          amountVnd,
          balance: toNumber(wallet.balance),
        };
      });
    }, 'Không thể khởi tạo hoàn tiền đơn nạp');
  }

  /**
   * Chốt kết quả hoàn tiền Adyen từ webhook REFUND (đã lock qua transaction gọi từ
   * handleAdyenWebhook). success='true' mới trừ ví; false thì revert về COMPLETED.
   */
  private async settleAdyenRefund(
    manager: EntityManager,
    item: AdyenNotificationRequestItem,
  ): Promise<void> {
    const topupRepo = manager.getRepository(WalletTopupOrderEntity);
    const topup = await topupRepo.findOne({
      where: { adyenRefundPspReference: item.pspReference },
      lock: { mode: 'pessimistic_write' },
    });
    if (!topup || topup.status !== TopupStatus.REFUND_PENDING) return;

    // Lưu ý: success là string 'true'/'false', không phải boolean.
    if (item.success !== NotifySuccess.True) {
      topup.status = TopupStatus.COMPLETED;
      topup.failReason = `Adyen từ chối hoàn tiền: ${item.reason ?? 'không rõ lý do'}`;
      await topupRepo.save(topup);
      return;
    }

    const amountVnd = toNumber(topup.amountVnd);
    const wallet = await manager
      .getRepository(WalletEntity)
      .findOneByOrFail({ id: topup.walletId });

    await this.walletService.debitWallet(manager, {
      wallet,
      amount: amountVnd,
      type: WalletTransactionType.REFUND,
      referenceId: topup.id,
      referenceType: 'ADYEN_REFUND',
      description: `Hoàn tiền đơn nạp Adyen (${amountVnd.toLocaleString('vi-VN')}đ)`,
    });
    const lastTx = await manager
      .getRepository(WalletTransactionEntity)
      .findOne({
        where: { referenceId: topup.id, referenceType: 'ADYEN_REFUND' },
        order: { createdAt: 'DESC' },
      });

    topup.status = TopupStatus.REFUNDED;
    topup.refundedAt = new Date();
    topup.refundTxnNo = item.pspReference;
    topup.refundWalletTxId = lastTx?.id ?? null;
    await topupRepo.save(topup);
  }

  /** Dispatcher cho FinanceController — chọn đúng luồng refund theo provider. */
  async refundTopup(
    topupId: string,
    adminUserId: string,
  ): Promise<CaptureTopupResult> {
    const topup = await this.dataSource
      .getRepository(WalletTopupOrderEntity)
      .findOneBy({ id: topupId });
    if (!topup) {
      throw new NotFoundException('Không tìm thấy đơn nạp tiền');
    }
    if (topup.provider !== 'ADYEN') {
      throw new AppException(
        `Chưa hỗ trợ hoàn tiền tự động cho đơn nạp ${topup.provider}`,
      );
    }
    return this.refundAdyenTopup(topupId, adminUserId);
  }

  /** Admin: liệt kê đơn nạp toàn hệ thống (lọc provider/status). */
  async listAllTopups(query: {
    page?: number;
    limit?: number;
    provider?: string;
    status?: TopupStatus;
  }): Promise<{
    items: WalletTopupOrderEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const take = Math.min(100, Math.max(1, query.limit ?? 20));
    const page = Math.max(1, query.page ?? 1);

    const qb = this.dataSource
      .getRepository(WalletTopupOrderEntity)
      .createQueryBuilder('topup')
      .leftJoinAndSelect('topup.customer', 'customer')
      .leftJoinAndSelect('customer.user', 'customerUser')
      .leftJoinAndSelect('topup.tasker', 'tasker')
      .leftJoinAndSelect('tasker.user', 'taskerUser')
      .orderBy('topup.createdAt', 'DESC')
      .take(take)
      .skip((page - 1) * take);

    if (query.provider) {
      qb.andWhere('topup.provider = :provider', { provider: query.provider });
    }
    if (query.status) {
      qb.andWhere('topup.status = :status', { status: query.status });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit: take };
  }

  /** Danh sách thẻ đã lưu của user qua Adyen (stored payment methods). */
  async listMyCards(userId: string): Promise<SavedCardView[]> {
    return this.adyenService.listStoredPaymentMethods(userId);
  }

  /** Xóa thẻ đã lưu qua Adyen. */
  async removeMyCard(userId: string, cardId: string): Promise<void> {
    await this.adyenService.deleteStoredPaymentMethod(cardId, userId);
  }

  async listMyTopups(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{
    items: WalletTopupOrderEntity[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const customer = await this.findCustomer(userId);
    const take = Math.min(100, Math.max(1, limit));
    const skip = (Math.max(1, page) - 1) * take;

    const [items, total] = await this.dataSource
      .getRepository(WalletTopupOrderEntity)
      .findAndCount({
        where: { customerId: customer.id },
        order: { createdAt: 'DESC' },
        take,
        skip,
      });

    return {
      items,
      total,
      page: Math.max(1, page),
      limit: take,
      totalPages: Math.ceil(total / take),
    };
  }

  private async findCustomer(
    userId: string,
    manager = this.dataSource.manager,
  ): Promise<CustomerEntity> {
    const customer = await manager
      .getRepository(CustomerEntity)
      .findOne({ where: { user: { id: userId } }, relations: ['user'] });
    if (!customer) {
      throw new NotFoundException('Không tìm thấy hồ sơ khách hàng');
    }
    return customer;
  }

  private async findTasker(
    userId: string,
    manager = this.dataSource.manager,
  ): Promise<TaskerEntity> {
    const tasker = await manager
      .getRepository(TaskerEntity)
      .findOne({ where: { user: { id: userId } }, relations: ['user'] });
    if (!tasker) {
      throw new NotFoundException('Không tìm thấy hồ sơ tasker');
    }
    return tasker;
  }
}
