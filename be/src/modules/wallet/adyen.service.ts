import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Client,
  CheckoutAPI,
  EnvironmentEnum,
  hmacValidator,
  Types,
} from '@adyen/api-library';
import { AppException } from 'src/common/exceptions/app.exception';

export interface AdyenSession {
  id: string;
  sessionData: string;
}

export interface AdyenRefundResult {
  pspReference: string;
  status: string;
}

export type AdyenNotificationRequestItem =
  Types.notification.NotificationRequestItem;

export interface AdyenSavedCard {
  id: string;
  brand: string | null;
  lastFour: string | null;
  expiryMonth: string | null;
  expiryYear: string | null;
}

/**
 * Client Adyen Checkout API (sandbox/live) — Sessions flow cho Web Drop-in.
 * Dùng SDK chính thức `@adyen/api-library` (ký/verify HMAC do SDK xử lý,
 * không tự viết) để tránh lặp lại lớp lỗi ký sai đã gặp với VNPay.
 */
@Injectable()
export class AdyenService {
  private readonly logger = new Logger(AdyenService.name);
  private checkoutApi: CheckoutAPI | null = null;

  constructor(private readonly configService: ConfigService) {}

  private get apiKey(): string {
    const key = this.configService.get<string>('ADYEN_API_KEY');
    if (!key) throw new AppException('Chưa cấu hình ADYEN_API_KEY', 500);
    return key;
  }

  private get merchantAccount(): string {
    const account = this.configService.get<string>('ADYEN_MERCHANT_ACCOUNT');
    if (!account) {
      throw new AppException('Chưa cấu hình ADYEN_MERCHANT_ACCOUNT', 500);
    }
    return account;
  }

  private get hmacKey(): string {
    const key = this.configService.get<string>('ADYEN_HMAC_KEY');
    if (!key) throw new AppException('Chưa cấu hình ADYEN_HMAC_KEY', 500);
    return key;
  }

  private get environment(): EnvironmentEnum {
    const env = (
      this.configService.get<string>('ADYEN_ENVIRONMENT') ?? 'TEST'
    ).toUpperCase();
    return env === 'LIVE' ? EnvironmentEnum.LIVE : EnvironmentEnum.TEST;
  }

  get clientKey(): string {
    const key = this.configService.get<string>('ADYEN_CLIENT_KEY');
    if (!key) throw new AppException('Chưa cấu hình ADYEN_CLIENT_KEY', 500);
    return key;
  }

  private get checkout(): CheckoutAPI {
    if (!this.checkoutApi) {
      const client = new Client({
        apiKey: this.apiKey,
        environment: this.environment,
      });
      this.checkoutApi = new CheckoutAPI(client);
    }
    return this.checkoutApi;
  }

  /**
   * Tạo phiên thanh toán cho Web Drop-in. `amountVnd` là số nguyên VND —
   * VND là đồng tiền zero-decimal với Adyen nên KHÔNG nhân 100 như VNPay.
   */
  async createSession(input: {
    amountVnd: number;
    reference: string;
    returnUrl: string;
    shopperReference?: string;
    storePaymentMethod?: boolean;
    shopperIp?: string;
  }): Promise<AdyenSession> {
    try {
      const res = await this.checkout.PaymentsApi.sessions({
        amount: { value: input.amountVnd, currency: 'VND' },
        merchantAccount: this.merchantAccount,
        reference: input.reference,
        returnUrl: input.returnUrl,
        countryCode: 'VN',
        channel:
          'Web' as Types.checkout.CreateCheckoutSessionRequest.ChannelEnum,
        ...(input.shopperReference
          ? { shopperReference: input.shopperReference }
          : {}),
        ...(input.storePaymentMethod !== undefined
          ? { storePaymentMethod: input.storePaymentMethod }
          : {}),
        // Bắt buộc khi storePaymentMethod=true: khách chủ động bấm nạp mỗi lần
        // (không phải lịch cố định/tự động) nên dùng CardOnFile.
        ...(input.storePaymentMethod
          ? {
              recurringProcessingModel:
                'CardOnFile' as Types.checkout.CreateCheckoutSessionRequest.RecurringProcessingModelEnum,
            }
          : {}),
        ...(input.shopperIp ? { shopperIP: input.shopperIp } : {}),
      });

      if (!res.sessionData) {
        throw new Error('Thiếu sessionData trong phản hồi Adyen');
      }
      return { id: res.id, sessionData: res.sessionData };
    } catch (err) {
      this.logger.error(
        `Adyen tạo session lỗi (${input.reference}): ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new AppException('Không tạo được phiên thanh toán Adyen', 502);
    }
  }

  /** BE tự xác nhận kết quả session sau khi Drop-in resolve — không tin trạng thái FE báo. */
  async getSessionResult(
    sessionId: string,
    sessionResult: string,
  ): Promise<Types.checkout.SessionResultResponse> {
    try {
      return await this.checkout.PaymentsApi.getResultOfPaymentSession(
        sessionId,
        sessionResult,
      );
    } catch (err) {
      this.logger.error(
        `Adyen lấy kết quả session lỗi (${sessionId}): ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new AppException(
        'Không xác nhận được kết quả thanh toán Adyen',
        502,
      );
    }
  }

  /**
   * Charge trực tiếp bằng thẻ đã lưu (server-initiated, không qua Drop-in) —
   * dùng cho booking khi khách đã có sẵn `storedPaymentMethodId`. Đồng bộ,
   * trả kết quả cuối ngay (Authorised/Refused), khác với refund/webhook.
   */
  async chargeStoredPaymentMethod(input: {
    amountVnd: number;
    reference: string;
    storedPaymentMethodId: string;
    shopperReference: string;
    returnUrl: string;
  }): Promise<{ resultCode: string; pspReference: string | null }> {
    try {
      const res = await this.checkout.PaymentsApi.payments({
        amount: { value: input.amountVnd, currency: 'VND' },
        merchantAccount: this.merchantAccount,
        reference: input.reference,
        returnUrl: input.returnUrl,
        shopperReference: input.shopperReference,
        shopperInteraction:
          'ContAuth' as Types.checkout.PaymentRequest.ShopperInteractionEnum,
        recurringProcessingModel:
          'CardOnFile' as Types.checkout.PaymentRequest.RecurringProcessingModelEnum,
        paymentMethod: {
          type: 'scheme',
          storedPaymentMethodId: input.storedPaymentMethodId,
        } as unknown as Types.checkout.PaymentRequestPaymentMethod,
      });
      return {
        resultCode: res.resultCode ?? '',
        pspReference: res.pspReference ?? null,
      };
    } catch (err) {
      this.logger.error(
        `Adyen charge thẻ đã lưu lỗi (${input.reference}): ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new AppException('Không charge được thẻ đã lưu qua Adyen', 502);
    }
  }

  /**
   * Yêu cầu hoàn tiền — CHỈ trả ack ("received"), KHÔNG phải kết quả cuối.
   * Kết quả thật đến sau qua webhook eventCode=REFUND.
   */
  async refundPayment(
    paymentPspReference: string,
    amountVnd: number,
    reference: string,
  ): Promise<AdyenRefundResult> {
    try {
      const res = await this.checkout.ModificationsApi.refundCapturedPayment(
        paymentPspReference,
        {
          amount: { value: amountVnd, currency: 'VND' },
          merchantAccount: this.merchantAccount,
          reference,
        },
      );
      return { pspReference: res.pspReference, status: res.status };
    } catch (err) {
      this.logger.error(
        `Adyen refund lỗi (${paymentPspReference}): ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new AppException('Không gọi được API hoàn tiền Adyen', 502);
    }
  }

  /** Verify chữ ký HMAC webhook — dùng thẳng SDK, không tự viết thuật toán ký. */
  verifyWebhookHmac(item: AdyenNotificationRequestItem): boolean {
    try {
      return new hmacValidator().validateHMAC(item, this.hmacKey);
    } catch (err) {
      this.logger.warn(
        `Adyen verify HMAC lỗi: ${err instanceof Error ? err.message : String(err)}`,
      );
      return false;
    }
  }

  async listStoredPaymentMethods(
    shopperReference: string,
  ): Promise<AdyenSavedCard[]> {
    try {
      const res =
        await this.checkout.RecurringApi.getTokensForStoredPaymentDetails(
          shopperReference,
          this.merchantAccount,
        );
      return (res.storedPaymentMethods ?? []).map((m) => ({
        id: m.id ?? '',
        brand: m.brand ?? null,
        lastFour: m.lastFour ?? null,
        expiryMonth: m.expiryMonth ?? null,
        expiryYear: m.expiryYear ?? null,
      }));
    } catch (err) {
      this.logger.error(
        `Adyen lấy danh sách thẻ đã lưu lỗi (${shopperReference}): ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new AppException('Không lấy được danh sách thẻ đã lưu', 502);
    }
  }

  async deleteStoredPaymentMethod(
    storedPaymentMethodId: string,
    shopperReference: string,
  ): Promise<void> {
    try {
      await this.checkout.RecurringApi.deleteTokenForStoredPaymentDetails(
        storedPaymentMethodId,
        shopperReference,
        this.merchantAccount,
      );
    } catch (err) {
      this.logger.error(
        `Adyen xóa thẻ đã lưu lỗi (${storedPaymentMethodId}): ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new AppException('Không xóa được thẻ đã lưu', 502);
    }
  }
}
