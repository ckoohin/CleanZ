import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PayOS } from '@payos/node';
import type { WebhookData, Webhook } from '@payos/node';
import { AppException } from 'src/common/exceptions/app.exception';

export interface PayosPaymentLink {
  checkoutUrl: string;
  qrCode: string;
  paymentLinkId: string;
  orderCode: number;
  bin: string;
  accountNumber: string;
  accountName: string;
}

export interface PayosPaymentInfo {
  orderCode: number;
  /** PAID | PENDING | CANCELLED | EXPIRED | ... */
  status: string;
  amount: number;
}

@Injectable()
export class PayosService {
  private readonly logger = new Logger(PayosService.name);
  private readonly payos: PayOS;

  constructor(private readonly configService: ConfigService) {
    const clientId = this.configService.get<string>('PAYOS_CLIENT_ID') ?? '';
    const apiKey = this.configService.get<string>('PAYOS_API_KEY') ?? '';
    const checksumKey =
      this.configService.get<string>('PAYOS_CHECKSUM_KEY') ?? '';

    if (!clientId || !apiKey || !checksumKey) {
      this.logger.warn(
        'PAYOS_CLIENT_ID / PAYOS_API_KEY / PAYOS_CHECKSUM_KEY chưa được cấu hình',
      );
    }

    this.payos = new PayOS({ clientId, apiKey, checksumKey });
  }

  async createPaymentLink(params: {
    amount: number;
    description: string;
    orderCode: number;
    returnUrl: string;
    cancelUrl: string;
    buyerName?: string;
    buyerEmail?: string;
    buyerPhone?: string;
  }): Promise<PayosPaymentLink> {
    try {
      const result = await this.payos.paymentRequests.create({
        amount: params.amount,
        description: params.description,
        orderCode: params.orderCode,
        returnUrl: params.returnUrl,
        cancelUrl: params.cancelUrl,
        ...(params.buyerName && { buyerName: params.buyerName }),
        ...(params.buyerEmail && { buyerEmail: params.buyerEmail }),
        ...(params.buyerPhone && { buyerPhone: params.buyerPhone }),
      });

      return {
        checkoutUrl: result.checkoutUrl,
        qrCode: result.qrCode,
        paymentLinkId: result.paymentLinkId,
        orderCode: result.orderCode,
        bin: result.bin,
        accountNumber: result.accountNumber,
        accountName: result.accountName,
      };
    } catch (err) {
      this.logger.error(`PayOS createPaymentLink lỗi: ${String(err)}`);
      throw new AppException('Không tạo được link thanh toán PayOS', 502);
    }
  }

  async getPaymentInfo(orderCode: number): Promise<PayosPaymentInfo> {
    try {
      const result = await this.payos.paymentRequests.get(orderCode);
      return {
        orderCode: result.orderCode,
        status: result.status,
        amount: result.amount,
      };
    } catch (err) {
      this.logger.error(
        `PayOS getPaymentInfo lỗi (${orderCode}): ${String(err)}`,
      );
      throw new AppException('Không lấy được thông tin thanh toán PayOS', 502);
    }
  }

  async cancelPaymentLink(orderCode: number): Promise<void> {
    try {
      await this.payos.paymentRequests.cancel(orderCode);
      this.logger.log(`PayOS link cancelled: orderCode=${orderCode}`);
    } catch (err) {
      // Bỏ qua nếu link đã cancel/expired/paid — không ném lỗi làm rollback.
      this.logger.warn(
        `PayOS cancelPaymentLink (${orderCode}) bỏ qua: ${String(err)}`,
      );
    }
  }

  async verifyWebhook(body: Webhook): Promise<WebhookData> {
    try {
      return await this.payos.webhooks.verify(body);
    } catch (err) {
      this.logger.warn(`PayOS webhook signature không hợp lệ: ${String(err)}`);
      throw new AppException('Webhook PayOS không hợp lệ', 400);
    }
  }
}
