import { Injectable, Logger } from '@nestjs/common';

export interface VietQRBank {
  bin: string;
  shortName: string;
  name: string;
}

interface VietQRBankRaw {
  bin: string;
  shortName: string;
  name: string;
  transferSupported: number;
}

interface VietQRResponse {
  code: string;
  data: VietQRBankRaw[];
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

@Injectable()
export class BankListService {
  private readonly logger = new Logger(BankListService.name);
  private cache: VietQRBank[] | null = null;
  private cacheAt = 0;

  async getBanks(): Promise<VietQRBank[]> {
    if (this.cache && Date.now() - this.cacheAt < CACHE_TTL_MS) {
      return this.cache;
    }

    try {
      const res = await fetch('https://api.vietqr.io/v2/banks');
      const data = (await res.json()) as VietQRResponse;

      const banks: VietQRBank[] = (data.data ?? [])
        .filter((b) => b.transferSupported === 1)
        .map((b) => ({ bin: b.bin, shortName: b.shortName, name: b.name }));

      this.cache = banks;
      this.cacheAt = Date.now();
      return banks;
    } catch (err) {
      this.logger.error(`Không tải được danh sách ngân hàng: ${String(err)}`);
      if (this.cache) return this.cache;
      throw err;
    }
  }

  getBankByBin(bin: string): VietQRBank | undefined {
    return this.cache?.find((b) => b.bin === bin);
  }
}
