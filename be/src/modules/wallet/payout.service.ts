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
      this.configService.get('PAYOS_PAYOUT_CHECKSUM_KEY', { infer: true }) ??
      '';

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

  private authHeaders(): Record<string, string> {
    return {
      'x-client-id':
        this.configService.get('PAYOS_PAYOUT_CLIENT_ID', { infer: true }) ?? '',
      'x-api-key':
        this.configService.get('PAYOS_PAYOUT_API_KEY', { infer: true }) ?? '',
    };
  }

  /**
   * Số dư khả dụng của tài khoản chi hộ PayOS (VND) — đây là TIỀN THẬT dùng để
   * chi, khác hoàn toàn số dư ví trong DB (vốn chỉ là sổ kế toán nội bộ).
   *
   * Trả `null` khi không đọc được (PayOS lỗi/timeout) để nơi gọi tự quyết định:
   * đây là thông tin hỗ trợ, không phải cổng chặn — cổng chặn thật vẫn là chính
   * lệnh chi. Chặn nghiệp vụ chỉ vì endpoint theo dõi chập chờn là lợi bất cập hại.
   */
  async getAvailableBalance(): Promise<number | null> {
    try {
      const res = await axios.get<{
        code: string;
        desc: string;
        data?: { balance?: string | number } | null;
      }>(`${this.baseUrl}/v1/payouts-account/balance`, {
        headers: this.authHeaders(),
        family: 4,
        timeout: 10_000,
      });

      const raw = res.data?.data?.balance;
      if (raw === undefined || raw === null) {
        this.logger.warn(
          `Không đọc được số dư chi hộ PayOS: code=${res.data?.code}, desc=${res.data?.desc}`,
        );
        return null;
      }

      return Number(raw);
    } catch (err) {
      const axiosErr = err as AxiosError<{ desc?: string }>;
      this.logger.warn(
        `Không đọc được số dư chi hộ PayOS: httpStatus=${axiosErr.response?.status ?? 0}, desc=${axiosErr.response?.data?.desc ?? axiosErr.message}`,
      );
      return null;
    }
  }

  /**
   * Chặn sớm khi quỹ chi hộ không đủ, TRƯỚC khi trừ ví người dùng.
   *
   * Không có bước này thì luồng duyệt sẽ trừ ví → gọi PayOS → thất bại → hoàn ví
   * → đơn quay về PENDING: tiền không mất nhưng admin chỉ thấy "lỗi hệ thống" mà
   * không biết nguyên nhân là hết quỹ. Đọc số dư lỗi thì bỏ qua (fail-open) —
   * cổng chặn thật vẫn là chính lệnh chi.
   */
  async assertSufficientBalance(amount: number): Promise<void> {
    const balance = await this.getAvailableBalance();
    if (balance === null) return;

    if (balance < amount) {
      this.logger.error(
        `Quỹ chi hộ PayOS không đủ: cần ${amount}, còn ${balance}`,
      );
      throw new AppException(
        `Quỹ chi hộ PayOS không đủ để chi khoản này (cần ${amount.toLocaleString('vi-VN')}đ, còn ${balance.toLocaleString('vi-VN')}đ). Vui lòng nạp thêm quỹ rồi duyệt lại.`,
        503,
      );
    }
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
      `PayOS payout bắt đầu: referenceId=${referenceId}, amount=${params.amount}, toAccount=${params.toAccountNumber}, toBin=${params.toBin}, category=${params.category.join(',')}`,
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
          family: 4,
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
