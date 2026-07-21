import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
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
import { WalletTransactionEntity } from './entity/wallet-transaction.entity';
import type { Webhook } from '@payos/node';
import { PayosService } from './payos.service';
import { WalletService } from './wallet.service';

export interface TopupConfig {
  minVnd: number;
  maxVnd: number;
}

export interface CreateTopupResult {
  topupId: string;
  payosOrderCode: number;
  amountVnd: number;
  checkoutUrl: string | null;
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
    private readonly payosService: PayosService,
    private readonly systemConfig: SystemConfigService,
    private readonly configService: ConfigService,
  ) {}

  /** Hạn mức đang hiệu lực, để FE hiển thị và validate trước khi gọi PayOS. */
  async getTopupConfig(): Promise<TopupConfig> {
    const manager = this.dataSource.manager;
    const [minVnd, maxVnd] = await Promise.all([
      this.systemConfig.getRegisteredNumber(
        manager,
        SYSTEM_CONFIG_KEYS.TOPUP_MIN_VND,
      ),
      this.systemConfig.getRegisteredNumber(
        manager,
        SYSTEM_CONFIG_KEYS.TOPUP_MAX_VND,
      ),
    ]);

    return { minVnd, maxVnd };
  }

  async createTopup(
    userId: string,
    amountVnd: number,
    bookingId?: string,
    ownerType: WalletOwnerType = WalletOwnerType.CUSTOMER,
  ): Promise<CreateTopupResult> {
    return asyncHandleOperation(async () => {
      const { minVnd, maxVnd } = await this.getTopupConfig();

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

      // orderCode: timestamp ms mod 10^9 — max 9 chữ số, PayOS yêu cầu số nguyên dương.
      // Dùng ms (không chia 1000) để tránh collision khi 2 request đến trong cùng 1 giây.
      const orderCode = Date.now() % 1_000_000_000;

      const topupRepo = this.dataSource.getRepository(WalletTopupOrderEntity);
      const topup = await topupRepo.save(
        topupRepo.create({
          customerId: customer?.id ?? null,
          taskerId: tasker?.id ?? null,
          walletId: wallet.id,
          provider: 'PAYOS',
          status: TopupStatus.CREATED,
          amountVnd,
          amountUsd: null,
          fxRate: null,
          payosOrderCode: orderCode,
          bookingId: bookingId ?? null,
        }),
      );

      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ??
        'http://localhost:3020';
      const returnBase =
        ownerType === WalletOwnerType.TASKER
          ? '/tasker/earnings/topup'
          : '/customer/wallet/topup';

      try {
        const link = await this.payosService.createPaymentLink({
          amount: amountVnd,
          orderCode,
          description: `Nap vi CleanZ`,
          returnUrl: `${frontendUrl}/customer/wallet/topup/return?topupId=${topup.id}`,
          cancelUrl: `${frontendUrl}/customer/wallet/topup/cancel?topupId=${topup.id}`,
        });

        topup.paymentLinkId = link.paymentLinkId;
        await topupRepo.save(topup);

        return {
          topupId: topup.id,
          payosOrderCode: orderCode,
          amountVnd,
          checkoutUrl: link.checkoutUrl,
        };
      } catch (err) {
        topup.status = TopupStatus.FAILED;
        topup.failReason =
          err instanceof Error ? err.message : 'Tạo link PayOS thất bại';
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
      // Bước 1: đọc customer và topup ngoài transaction (không giữ lock khi gọi HTTP).
      const customer = await this.findCustomer(userId);

      const topupRepo = this.dataSource.getRepository(WalletTopupOrderEntity);
      const topupSnapshot = await topupRepo.findOne({ where: { id: topupId } });

      if (!topupSnapshot) {
        throw new NotFoundException('Không tìm thấy đơn nạp tiền');
      }
      if (topupSnapshot.customerId !== customer.id) {
        throw new AppException('Bạn không có quyền với đơn nạp này', 403);
      }
      if (topupSnapshot.status !== TopupStatus.CREATED || !topupSnapshot.payosOrderCode) {
        // Nếu đã COMPLETED trả kết quả nhanh, không cần vào transaction.
        if (topupSnapshot.status === TopupStatus.COMPLETED && topupSnapshot.walletTxId) {
          const wallet = await this.walletService.getOrCreateCustomerWallet(
            this.dataSource.manager,
            customer,
          );
          return {
            topupId: topupSnapshot.id,
            status: topupSnapshot.status,
            amountVnd: toNumber(topupSnapshot.amountVnd),
            balance: toNumber(wallet.balance),
          };
        }
        throw new AppException('Đơn nạp không ở trạng thái có thể thanh toán');
      }

      // Bước 2: gọi PayOS ngoài transaction — tránh giữ DB lock trong lúc chờ HTTP.
      const info = await this.payosService.getPaymentInfo(topupSnapshot.payosOrderCode);

      if (info.status !== 'PAID') {
        // Không mark FAILED ở đây — PayOS có thể trả PENDING khi chưa hoàn tất,
        // customer có thể thử lại. Chỉ throw để FE biết chưa xong.
        throw new AppException(
          'Thanh toán PayOS chưa hoàn tất, ví chưa được cộng tiền',
        );
      }

      // Bước 3: mở transaction chỉ cho phần ghi DB.
      return this.dataSource.transaction(async (manager) => {
        const lockedTopupRepo = manager.getRepository(WalletTopupOrderEntity);
        const topup = await lockedTopupRepo.findOne({
          where: { id: topupId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!topup) {
          throw new NotFoundException('Không tìm thấy đơn nạp tiền');
        }

        // Idempotent: concurrent request đã cộng ví trước.
        const getOwnerWallet = () =>
          this.walletService.getOrCreateCustomerWallet(manager, customer);

        if (topup.status === TopupStatus.COMPLETED && topup.walletTxId) {
          const wallet = await getOwnerWallet();
          return {
            topupId: topup.id,
            status: topup.status,
            amountVnd: toNumber(topup.amountVnd),
            balance: toNumber(wallet.balance),
          };
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
          referenceType: 'PAYOS_TOPUP',
          description: `Nạp tiền qua PayOS (${amountVnd.toLocaleString('vi-VN')}đ)`,
        });

        const lastTx = await manager
          .getRepository(WalletTransactionEntity)
          .findOne({
            where: { referenceId: topup.id, referenceType: 'PAYOS_TOPUP' },
            order: { createdAt: 'DESC' },
          });

        topup.status = TopupStatus.COMPLETED;
        topup.walletTxId = lastTx?.id ?? null;
        await lockedTopupRepo.save(topup);

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

  /** Xử lý webhook PayOS — credit ví nếu thanh toán thành công. Idempotent. */
  async handleWebhook(body: unknown): Promise<void> {
    const data = await this.payosService.verifyWebhook(body as Webhook);

    // data là WebhookData (SDK đã unwrap từ Webhook envelope)
    const orderCode = data.orderCode;
    if (!orderCode) return;

    await this.dataSource.transaction(async (manager) => {
      const topupRepo = manager.getRepository(WalletTopupOrderEntity);
      const topup = await topupRepo.findOne({
        where: { payosOrderCode: orderCode },
        lock: { mode: 'pessimistic_write' },
      });

      if (!topup) return;

      // Idempotent
      if (topup.status === TopupStatus.COMPLETED && topup.walletTxId) return;

      // Chỉ cộng ví khi PayOS báo thành công ('00')
      if (data.code !== '00') {
        topup.status = TopupStatus.FAILED;
        topup.failReason = `Webhook PayOS code=${data.code}`;
        await topupRepo.save(topup);
        return;
      }

      if (!topup.customerId) return;
      const customer = await manager
        .getRepository(CustomerEntity)
        .findOne({ where: { id: topup.customerId } });
      if (!customer) return;

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
        referenceType: 'PAYOS_TOPUP',
        description: `Nạp tiền qua PayOS webhook (${amountVnd.toLocaleString('vi-VN')}đ)`,
      });

      const lastTx = await manager
        .getRepository(WalletTransactionEntity)
        .findOne({
          where: { referenceId: topup.id, referenceType: 'PAYOS_TOPUP' },
          order: { createdAt: 'DESC' },
        });

      topup.status = TopupStatus.COMPLETED;
      topup.walletTxId = lastTx?.id ?? null;
      await topupRepo.save(topup);
    });
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
