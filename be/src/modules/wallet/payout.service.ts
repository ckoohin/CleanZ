import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { createHmac } from 'crypto';
import { AppException } from 'src/common/exceptions/app.exception';
import type { AllConfigType } from 'src/config/config.type';

interface CreatePayoutParams {
  amount: number;
  description: string;
  toBin: string;
  toAccountNumber: string;
  category: string[];
}

interface PayOSPayoutResponse {
  code: string;
  desc: string;
  data?: {
    referenceId?: string;
    status?: string;
    [key: string]: unknown;
  };
}

@Injectable()
export class PayoutService {
  private readonly logger = new Logger(PayoutService.name);
  private readonly baseUrl = 'https://api-merchant.payos.vn';

  constructor(private readonly configService: ConfigService<AllConfigType>) {}

  private buildSignature(fields: Record<string, unknown>): string {
    const checksumKey =
      this.configService.get('PAYOS_PAYOUT_CHECKSUM_KEY', { infer: true }) ?? '';

    const payload = Object.keys(fields)
      .sort()
      .map((key) => {
        const value = fields[key];
        let strValue: string;
        if (value === null || value === undefined) {
          strValue = '';
        } else if (typeof value === 'object') {
          strValue = JSON.stringify(value);
        } else {
          strValue = String(value as string | number | boolean);
        }
        return `${encodeURIComponent(key)}=${encodeURIComponent(strValue)}`;
      })
      .join('&');

    return createHmac('sha256', checksumKey).update(payload).digest('hex');
  }

  async createSinglePayout(params: CreatePayoutParams): Promise<string> {
    const clientId =
      this.configService.get('PAYOS_PAYOUT_CLIENT_ID', { infer: true }) ?? '';
    const apiKey =
      this.configService.get('PAYOS_PAYOUT_API_KEY', { infer: true }) ?? '';

    const referenceId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();

    const body: Record<string, unknown> = {
      referenceId,
      amount: params.amount,
      description: params.description,
      toBin: params.toBin,
      toAccountNumber: params.toAccountNumber,
      category: params.category,
    };

    const signature = this.buildSignature(body);

    this.logger.log(
      `PayOS payout bắt đầu: referenceId=${referenceId}, amount=${params.amount}, toAccount=${params.toAccountNumber}, toBin=${params.toBin}, category=${params.category}`,
    );

    let responseData: PayOSPayoutResponse;

    try {
      const res = await axios.post<PayOSPayoutResponse>(
        `${this.baseUrl}/v1/payouts`,
        body,
        {
          headers: {
            'x-client-id': clientId,
            'x-api-key': apiKey,
            'x-idempotency-key': idempotencyKey,
            'x-signature': signature,
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(
        `PayOS payout HTTP response: referenceId=${referenceId}, status=${res.status}, body=${JSON.stringify(res.data)}`,
      );

      responseData = res.data;
    } catch (err) {
      const axiosErr = err as AxiosError<PayOSPayoutResponse>;
      const httpStatus = axiosErr.response?.status ?? 0;
      const body = axiosErr.response?.data;
      this.logger.error(
        `PayOS payout HTTP error: referenceId=${referenceId}, httpStatus=${httpStatus}, body=${JSON.stringify(body)}, message=${axiosErr.message}`,
      );
      throw new AppException(
        `PayOS payout thất bại: ${body?.desc ?? axiosErr.message}`,
        502,
      );
    }

    if (responseData.code !== '00') {
      this.logger.error(
        `PayOS payout thất bại (code≠00): referenceId=${referenceId}, code=${responseData.code}, desc=${responseData.desc}, data=${JSON.stringify(responseData.data)}`,
      );
      throw new AppException(
        `PayOS payout thất bại: ${responseData.desc} (code=${responseData.code})`,
        502,
      );
    }

    this.logger.log(
      `PayOS payout thành công: referenceId=${referenceId}, amount=${params.amount}, toAccount=${params.toAccountNumber}, payosStatus=${responseData.data?.status}`,
    );

    return referenceId;
  }
}
