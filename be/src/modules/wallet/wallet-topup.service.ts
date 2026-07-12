import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { TopupStatus } from 'src/common/enums/topup-status.enum';
import { WalletTransactionType } from 'src/common/enums/wallet-transaction-type.enum';
import { AppException } from 'src/common/exceptions/app.exception';
import { toNumber } from 'src/common/helpers/number.helper';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { CustomerEntity } from 'src/modules/customer/entity/customer.entity';
import { SYSTEM_CONFIG_KEYS } from 'src/modules/system-config/system-config.keys';
import { SystemConfigService } from 'src/modules/system-config/system-config.service';
import { WalletTopupOrderEntity } from './entity/wallet-topup-order.entity';
import { WalletTransactionEntity } from './entity/wallet-transaction.entity';
import { PaypalService } from './paypal.service';
import { WalletService } from './wallet.service';

export interface TopupConfig {
  minVnd: number;
  maxVnd: number;
  fxRate: number;
}

export interface CreateTopupResult {
  topupId: string;
  paypalOrderId: string;
  amountVnd: number;
  amountUsd: number;
  approveUrl: string | null;
}

export interface CaptureTopupResult {
  topupId: string;
  status: TopupStatus;
  amountVnd: number;
  balance: number;
}

@Injectable()
export class WalletTopupService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly walletService: WalletService,
    private readonly paypalService: PaypalService,
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
  ): Promise<CreateTopupResult> {
    return asyncHandleOperation(async () => {
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

      const customer = await this.findCustomer(userId);
      const wallet = await this.walletService.getOrCreateCustomerWallet(
        this.dataSource.manager,
        customer,
      );

      const amountUsd = Math.max(
        0.01,
        Math.round((amountVnd / fxRate) * 100) / 100,
      );

      const topupRepo = this.dataSource.getRepository(WalletTopupOrderEntity);
      const topup = await topupRepo.save(
        topupRepo.create({
          customerId: customer.id,
          walletId: wallet.id,
          provider: 'PAYPAL',
          status: TopupStatus.CREATED,
          amountVnd,
          amountUsd,
          fxRate,
          bookingId: bookingId ?? null,
        }),
      );

      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ??
        'http://localhost:3020';

      try {
        const order = await this.paypalService.createOrder({
          amountUsd,
          customId: topup.id,
          referenceId: topup.id,
          returnUrl: `${frontendUrl}/customer/wallet/topup/return?topupId=${topup.id}`,
          cancelUrl: `${frontendUrl}/customer/wallet/topup/cancel?topupId=${topup.id}`,
          description: `Nạp ví CleanZ ${amountVnd.toLocaleString('vi-VN')}đ`,
        });

        topup.paypalOrderId = order.id;
        await topupRepo.save(topup);

        const approveUrl =
          order.links?.find((l) => l.rel === 'approve')?.href ?? null;

        return {
          topupId: topup.id,
          paypalOrderId: order.id,
          amountVnd,
          amountUsd,
          approveUrl,
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

        const customer = await this.findCustomer(userId);
        if (topup.customerId !== customer.id) {
          throw new AppException('Bạn không có quyền với đơn nạp này', 403);
        }

        // Idempotent: đã cộng ví rồi thì trả kết quả cũ, không capture/cộng lại.
        if (topup.status === TopupStatus.COMPLETED && topup.walletTxId) {
          const wallet = await this.walletService.getOrCreateCustomerWallet(
            manager,
            customer,
          );
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

        const wallet = await this.walletService.getOrCreateCustomerWallet(
          manager,
          customer,
        );
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

        const freshWallet = await this.walletService.getOrCreateCustomerWallet(
          manager,
          customer,
        );

        return {
          topupId: topup.id,
          status: TopupStatus.COMPLETED,
          amountVnd,
          balance: toNumber(freshWallet.balance),
        };
      });
    }, 'Không thể hoàn tất nạp tiền');
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

  private async findCustomer(userId: string): Promise<CustomerEntity> {
    const customer = await this.dataSource
      .getRepository(CustomerEntity)
      .findOne({ where: { user: { id: userId } }, relations: ['user'] });
    if (!customer) {
      throw new NotFoundException('Không tìm thấy hồ sơ khách hàng');
    }
    return customer;
  }
}
