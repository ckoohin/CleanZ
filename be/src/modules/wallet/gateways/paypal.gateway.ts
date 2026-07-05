import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppException } from 'src/common/exceptions/app.exception';
import { TopupProvider } from 'src/common/enums/topup-provider.enum';
import {
  CreateOrderInput,
  CreateOrderResult,
  OrderStatusResult,
  PaymentGateway,
} from './payment-gateway.interface';

interface PayPalTokenResponse {
  access_token: string;
  expires_in: number;
}

interface PayPalLink {
  href: string;
  rel: string;
  method?: string;
}

interface PayPalCapture {
  id: string;
  status?: string;
  amount?: { value?: string; currency_code?: string };
}

interface PayPalOrderResponse {
  id: string;
  status: string;
  links?: PayPalLink[];
  purchase_units?: Array<{
    custom_id?: string;
    payments?: { captures?: PayPalCapture[] };
  }>;
}

/**
 * Cổng PayPal (REST Orders API v2, intent CAPTURE).
 * Không dùng SDK — gọi trực tiếp qua fetch. Đọc credential từ env qua ConfigService.
 * Nếu thiếu credential, chỉ ném lỗi khi được GỌI (app vẫn boot được mà không cần PayPal).
 */
@Injectable()
export class PayPalGateway implements PaymentGateway {
  readonly provider = TopupProvider.PAYPAL;
  private readonly logger = new Logger(PayPalGateway.name);
  private cachedToken: { value: string; expiresAt: number } | null = null;

  constructor(private readonly configService: ConfigService) {}

  private get baseUrl(): string {
    const mode = (
      this.configService.get<string>('PAYPAL_MODE') ?? 'sandbox'
    ).toLowerCase();
    return mode === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';
  }

  private getCredentials(): { clientId: string; secret: string } {
    const clientId = this.configService.get<string>('PAYPAL_CLIENT_ID');
    const secret = this.configService.get<string>('PAYPAL_SECRET');
    if (!clientId || !secret) {
      throw new AppException(
        'Chưa cấu hình PayPal (PAYPAL_CLIENT_ID / PAYPAL_SECRET)',
        500,
      );
    }
    return { clientId, secret };
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && this.cachedToken.expiresAt > now + 60_000) {
      return this.cachedToken.value;
    }
    const { clientId, secret } = this.getCredentials();
    const auth = Buffer.from(`${clientId}:${secret}`).toString('base64');
    const res = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`PayPal token error ${res.status}: ${text}`);
      throw new AppException('Không lấy được access token PayPal', 502);
    }
    const data = (await res.json()) as PayPalTokenResponse;
    this.cachedToken = {
      value: data.access_token,
      expiresAt: now + data.expires_in * 1000,
    };
    return data.access_token;
  }

  private async authedFetch<T>(
    path: string,
    init: RequestInit,
  ): Promise<{ ok: boolean; status: number; data: T }> {
    const token = await this.getAccessToken();
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    });
    const text = await res.text();
    const data = (text ? JSON.parse(text) : {}) as T;
    if (!res.ok) {
      this.logger.error(`PayPal ${path} error ${res.status}: ${text}`);
    }
    return { ok: res.ok, status: res.status, data };
  }

  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    const { data, ok } = await this.authedFetch<PayPalOrderResponse>(
      '/v2/checkout/orders',
      {
        method: 'POST',
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [
            {
              custom_id: input.referenceId,
              description: input.description?.slice(0, 127),
              amount: {
                currency_code: input.currency,
                value: input.amountValue,
              },
            },
          ],
          application_context: {
            return_url: input.returnUrl,
            cancel_url: input.cancelUrl,
            shipping_preference: 'NO_SHIPPING',
            user_action: 'PAY_NOW',
          },
        }),
      },
    );
    if (!ok || !data.id) {
      throw new AppException('Không tạo được đơn thanh toán PayPal', 502);
    }
    const approveUrl =
      data.links?.find((l) => l.rel === 'approve')?.href ?? null;
    return { orderId: data.id, approveUrl };
  }

  async getOrder(orderId: string): Promise<OrderStatusResult> {
    const { data, ok } = await this.authedFetch<PayPalOrderResponse>(
      `/v2/checkout/orders/${orderId}`,
      { method: 'GET' },
    );
    if (!ok) {
      throw new AppException('Không truy vấn được đơn PayPal', 502);
    }
    return this.mapOrder(data);
  }

  async captureOrder(orderId: string): Promise<OrderStatusResult> {
    const { data, ok } = await this.authedFetch<PayPalOrderResponse>(
      `/v2/checkout/orders/${orderId}/capture`,
      { method: 'POST', body: JSON.stringify({}) },
    );
    if (!ok) {
      throw new AppException('Không capture được đơn PayPal', 502);
    }
    return this.mapOrder(data);
  }

  async verifyWebhook(
    headers: Record<string, string | string[] | undefined>,
    body: unknown,
  ): Promise<boolean> {
    const webhookId = this.configService.get<string>('PAYPAL_WEBHOOK_ID');
    if (!webhookId) {
      this.logger.warn('PAYPAL_WEBHOOK_ID chưa cấu hình — bỏ qua verify');
      return false;
    }
    const pick = (key: string): string => {
      const value = headers[key] ?? headers[key.toLowerCase()];
      return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
    };
    const { data, ok } = await this.authedFetch<{
      verification_status: string;
    }>('/v1/notifications/verify-webhook-signature', {
      method: 'POST',
      body: JSON.stringify({
        auth_algo: pick('paypal-auth-algo'),
        cert_url: pick('paypal-cert-url'),
        transmission_id: pick('paypal-transmission-id'),
        transmission_sig: pick('paypal-transmission-sig'),
        transmission_time: pick('paypal-transmission-time'),
        webhook_id: webhookId,
        webhook_event: body,
      }),
    });
    return ok && data.verification_status === 'SUCCESS';
  }

  private mapOrder(order: PayPalOrderResponse): OrderStatusResult {
    const unit = order.purchase_units?.[0];
    const capture = unit?.payments?.captures?.[0];
    return {
      status: order.status,
      captureId: capture?.id ?? null,
      paidAmount: capture?.amount?.value ?? null,
      currency: capture?.amount?.currency_code ?? null,
      referenceId: unit?.custom_id ?? null,
      raw: order,
    };
  }
}
