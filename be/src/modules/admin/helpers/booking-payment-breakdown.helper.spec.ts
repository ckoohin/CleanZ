import { PaymentMethod } from 'src/common/enums/payment-method.enum';
import { resolveBookingPaymentBreakdown } from './booking-payment-breakdown.helper';

describe('resolveBookingPaymentBreakdown', () => {
  it('tính đủ phí phần gốc qua ví và phụ thu bằng tiền mặt', () => {
    const result = resolveBookingPaymentBreakdown({
      subtotal: 413_333,
      surchargeAmount: 213_333,
      paymentMethod: PaymentMethod.WALLET,
      ledger: {
        explicitTaskerPlatformFee: 53_333,
        walletSettlementEarning: 150_000,
        hasSettlementEntries: true,
      },
    });

    expect(result).toEqual({
      platformFee: 103_333,
      taskerIncome: 310_000,
      commissionRate: 25,
      baseAmount: 200_000,
      basePlatformFee: 50_000,
      basePaymentMethod: PaymentMethod.WALLET,
      surchargeAmount: 213_333,
      surchargePlatformFee: 53_333,
      surchargePaymentMethod: PaymentMethod.CASH,
    });
  });

  it('tính toàn bộ phí từ khoản còn lại trong ví khi phụ thu cũng trả qua ví', () => {
    const result = resolveBookingPaymentBreakdown({
      subtotal: 413_333,
      surchargeAmount: 213_333,
      paymentMethod: PaymentMethod.WALLET,
      ledger: {
        explicitTaskerPlatformFee: 0,
        walletSettlementEarning: 310_000,
        hasSettlementEntries: true,
      },
    });

    expect(result).toEqual({
      platformFee: 103_333,
      taskerIncome: 310_000,
      commissionRate: 25,
      baseAmount: 200_000,
      basePlatformFee: 50_000,
      basePaymentMethod: PaymentMethod.WALLET,
      surchargeAmount: 213_333,
      surchargePlatformFee: 53_333,
      surchargePaymentMethod: PaymentMethod.WALLET,
    });
  });

  it('dùng bút toán khấu trừ tasker cho đơn thanh toán hoàn toàn bằng tiền mặt', () => {
    const result = resolveBookingPaymentBreakdown({
      subtotal: 413_333,
      surchargeAmount: 213_333,
      paymentMethod: PaymentMethod.CASH,
      ledger: {
        explicitTaskerPlatformFee: 103_333,
        walletSettlementEarning: null,
        hasSettlementEntries: true,
      },
    });

    expect(result).toMatchObject({
      platformFee: 103_333,
      taskerIncome: 310_000,
      commissionRate: 25,
      basePaymentMethod: PaymentMethod.CASH,
      surchargePaymentMethod: PaymentMethod.CASH,
    });
  });

  it('trả null khi booking chưa có bút toán quyết toán', () => {
    expect(
      resolveBookingPaymentBreakdown({
        subtotal: 200_000,
        surchargeAmount: 0,
        paymentMethod: PaymentMethod.WALLET,
        ledger: {
          explicitTaskerPlatformFee: 0,
          walletSettlementEarning: null,
          hasSettlementEntries: false,
        },
      }),
    ).toBeNull();
  });
});
