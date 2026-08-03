import { BadRequestException } from '@nestjs/common';
import { WalletService } from './wallet.service';
import {
  SIGNED_AMOUNT_SQL,
  signedAmount,
} from './entity/wallet-transaction.entity';

type Internals = { normalizeAmount: (amount: number) => number };

function makeService(): Internals {
  return new WalletService({} as never, {} as never) as unknown as Internals;
}

describe('WalletService.normalizeAmount — nguyên hoá VND tại tầng ví', () => {
  const svc = makeService();

  it('làm tròn số lẻ xu về đồng nguyên', () => {
    expect(svc.normalizeAmount(500_000.4)).toBe(500_000);
    expect(svc.normalizeAmount(500_000.5)).toBe(500_001);
  });

  it('giữ nguyên số đã là số nguyên', () => {
    expect(svc.normalizeAmount(1_500_000)).toBe(1_500_000);
  });

  it('chặn số không hợp lệ', () => {
    for (const bad of [0, -1, NaN, Infinity]) {
      expect(() => svc.normalizeAmount(bad)).toThrow(BadRequestException);
    }
  });

  /**
   * Làm tròn TRƯỚC khi kiểm > 0: khoản dưới nửa đồng phải bị chặn, không được lặng lẽ
   * thành bút toán 0đ.
   */
  it('chặn khoản nhỏ hơn nửa đồng thay vì ghi bút toán 0đ', () => {
    expect(() => svc.normalizeAmount(0.4)).toThrow(BadRequestException);
  });
});

describe('signedAmount — quy ước dấu của bút toán ví', () => {
  it('tiền ra là số âm, tiền vào là số dương', () => {
    expect(signedAmount({ balanceBefore: 1_000, balanceAfter: 400 })).toBe(
      -600,
    );
    expect(signedAmount({ balanceBefore: 400, balanceAfter: 1_000 })).toBe(600);
  });

  it('cột `amount` luôn dương nên không dùng để tính dòng tiền ròng', () => {
    // Hai bút toán cùng amount=600 nhưng ngược chiều — chỉ signedAmount phân biệt được.
    const out = { balanceBefore: 1_000, balanceAfter: 400 };
    const inn = { balanceBefore: 400, balanceAfter: 1_000 };
    expect(signedAmount(out) + signedAmount(inn)).toBe(0);
  });

  it('bản SQL khớp với bản TS, có/không alias', () => {
    expect(SIGNED_AMOUNT_SQL()).toBe('(balance_after - balance_before)');
    expect(SIGNED_AMOUNT_SQL('wt')).toBe(
      '(wt.balance_after - wt.balance_before)',
    );
  });
});
