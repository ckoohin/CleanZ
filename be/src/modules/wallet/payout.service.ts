import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { AppException } from 'src/common/exceptions/app.exception';
import type { AllConfigType } from 'src/config/config.type';

interface CreatePayoutParams {
  amount: number;
  description: string;
  toBin: string;
  toAccountNumber: string;
}

@Injectable()
export class PayoutService {
  private readonly logger = new Logger(PayoutService.name);
  private readonly baseUrl = 'https://api-merchant.payos.vn';

  constructor(private readonly configService: ConfigService<AllConfigType>) {}

  private buildSignature(fields: Record<string, unknown>): string {
    const checksumKey =
      this.configService.get('PAYOS_CHECKSUM_KEY', { infer: true }) ?? '';

    const payload = Object.keys(fields)
      .sort()
      .map((key) => {
        const value = fields[key];
        let strValue: string;
        if (value === null || value === undefined) {
          strValue = '';
        } else if (Array.isArray(value)) {
          strValue = JSON.stringify(value);
        } else {
          strValue = String(value);
        }
        return `${encodeURIComponent(key)}=${encodeURIComponent(strValue)}`;
      })
      .join('&');

    return createHmac('sha256', checksumKey).update(payload).digest('hex');
  }

  async createSinglePayout(params: CreatePayoutParams): Promise<void> {
    const clientId =
      this.configService.get('PAYOS_CLIENT_ID', { infer: true }) ?? '';
    const apiKey =
      this.configService.get('PAYOS_API_KEY', { infer: true }) ?? '';

    const referenceId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();

    const body: Record<string, unknown> = {
      referenceId,
      amount: params.amount,
      description: params.description,
      toBin: params.toBin,
      toAccountNumber: params.toAccountNumber,
    };

    const signature = this.buildSignature(body);

    const res = await fetch(`${this.baseUrl}/v1/payouts`, {
      method: 'POST',
      headers: {
        'x-client-id': clientId,
        'x-api-key': apiKey,
        'x-idempotency-key': idempotencyKey,
        'x-signature': signature,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      let desc = `HTTP ${res.status}`;
      try {
        const json = (await res.json()) as { desc?: string };
        if (json.desc) desc = json.desc;
      } catch {
        // ignore json parse error
      }
      this.logger.error(`PayOS payout thất bại: ${desc}`);
      throw new AppException(`PayOS payout thất bại: ${desc}`, 502);
    }

    this.logger.log(
      `PayOS payout thành công: referenceId=${referenceId}, amount=${params.amount}`,
    );
  }
}
