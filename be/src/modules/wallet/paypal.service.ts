import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppException } from 'src/common/exceptions/app.exception';

interface PaypalTokenCache {
  accessToken: string;
  expiresAt: number; // epoch ms
}

export interface PaypalOrder {
  id: string;
  status: string;
  links: { href: string; rel: string; method: string }[];
}

export interface PaypalCaptureResult {
  id: string;
  status: string; // COMPLETED khi thành công
  captureId: string | null;
}

/**
 * Client PayPal Orders v2 (sandbox/live) — server-side create + capture.
 * Dùng global fetch (Node 18+). Secret chỉ nằm ở BE.
 */
@Injectable()
export class PaypalService {
  private readonly logger = new Logger(PaypalService.name);
  private tokenCache: PaypalTokenCache | null = null;

  constructor(private readonly configService: ConfigService) {}

  private get apiBase(): string {
    const explicit = this.configService.get<string>('PAYPAL_API_BASE');
    if (explicit) return explicit;
    const mode = (
      this.configService.get<string>('PAYPAL_MODE') ??
      this.configService.get<string>('PAYPAL_ENV') ??
      'sandbox'
    ).toLowerCase();
    return mode === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';
  }

  private get clientId(): string {
    const id = this.configService.get<string>('PAYPAL_CLIENT_ID');
    if (!id) {
      throw new AppException('Chưa cấu hình PAYPAL_CLIENT_ID', 500);
    }
    return id;
  }

  private get clientSecret(): string {
    const secret =
      this.configService.get<string>('PAYPAL_SECRET') ??
      this.configService.get<string>('PAYPAL_CLIENT_SECRET');
    if (!secret) {
      throw new AppException('Chưa cấu hình PAYPAL_SECRET', 500);
    }
    return secret;
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.tokenCache && this.tokenCache.expiresAt > now + 60_000) {
      return this.tokenCache.accessToken;
    }

    const basic = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString(
      'base64',
    );

    const res = await fetch(`${this.apiBase}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    const data = (await res.json().catch(() => ({}))) as {
      access_token?: string;
      expires_in?: number;
      error_description?: string;
    };

    if (!res.ok || !data.access_token) {
      this.logger.error(
        `PayPal token lỗi: ${res.status} ${JSON.stringify(data)}`,
      );
      throw new AppException('Không lấy được access token PayPal', 502);
    }

    this.tokenCache = {
      accessToken: data.access_token,
      expiresAt: now + (data.expires_in ?? 3000) * 1000,
    };
    return data.access_token;
  }

  /**
   * Tạo order intent=CAPTURE. `customId`/`referenceId` = id đơn nạp nội bộ (đối soát).
   */
  async createOrder(params: {
    amountUsd: number;
    customId: string;
    referenceId: string;
    returnUrl: string;
    cancelUrl: string;
    description?: string;
  }): Promise<PaypalOrder> {
    const token = await this.getAccessToken();
    const res = await fetch(`${this.apiBase}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: params.referenceId,
            custom_id: params.customId,
            description: params.description ?? 'Nạp ví CleanZ',
            amount: {
              currency_code: 'USD',
              value: params.amountUsd.toFixed(2),
            },
          },
        ],
        application_context: {
          brand_name: 'King Of Service',
          user_action: 'PAY_NOW',
          return_url: params.returnUrl,
          cancel_url: params.cancelUrl,
        },
      }),
    });

    const data = (await res.json().catch(() => ({}))) as PaypalOrder & {
      message?: string;
    };

    if (!res.ok || !data.id) {
      this.logger.error(
        `PayPal create order lỗi: ${res.status} ${JSON.stringify(data)}`,
      );
      throw new AppException('Không tạo được đơn thanh toán PayPal', 502);
    }

    return data;
  }

  /**
   * Capture order đã được người dùng approve. Trả status COMPLETED khi thành công.
   */
  async captureOrder(orderId: string): Promise<PaypalCaptureResult> {
    const token = await this.getAccessToken();
    const res = await fetch(
      `${this.apiBase}/v2/checkout/orders/${orderId}/capture`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    const data = (await res.json().catch(() => ({}))) as {
      id?: string;
      status?: string;
      message?: string;
      details?: { issue?: string; description?: string }[];
      purchase_units?: {
        payments?: { captures?: { id?: string; status?: string }[] };
      }[];
    };

    if (!res.ok) {
      const issue =
        data.details?.[0]?.description ?? data.message ?? `HTTP ${res.status}`;
      this.logger.error(
        `PayPal capture lỗi (${orderId}): ${res.status} ${JSON.stringify(data)}`,
      );
      throw new AppException(`Thanh toán PayPal thất bại: ${issue}`, 502);
    }

    const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
    return {
      id: data.id ?? orderId,
      status: data.status ?? capture?.status ?? 'UNKNOWN',
      captureId: capture?.id ?? null,
    };
  }
}
