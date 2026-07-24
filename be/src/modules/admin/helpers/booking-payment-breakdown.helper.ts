import { PaymentMethod } from 'src/common/enums/payment-method.enum';

export interface BookingSettlementLedgerSnapshot {
  explicitTaskerPlatformFee: number;
  walletSettlementEarning: number | null;
  hasSettlementEntries: boolean;
}

export interface BookingPaymentBreakdown {
  platformFee: number;
  taskerIncome: number;
  commissionRate: number;
  baseAmount: number;
  basePlatformFee: number;
  basePaymentMethod: PaymentMethod;
  surchargeAmount: number;
  surchargePlatformFee: number;
  surchargePaymentMethod: PaymentMethod | null;
}

interface ResolveBookingPaymentBreakdownInput {
  subtotal: number;
  surchargeAmount: number;
  paymentMethod: PaymentMethod;
  ledger: BookingSettlementLedgerSnapshot;
}

/**
 * Dựng lại kết quả quyết toán từ ledger.
 *
 * Với đơn WALLET + phụ thu CASH, hoa hồng phần gốc không có bút toán
 * PLATFORM_FEE riêng: nó là phần tiền còn lại trong ví SYSTEM sau khi trả công
 * tasker. Vì vậy phải cộng khoản giữ lại này với phí phụ thu đã khấu trừ trên ví
 * tasker, thay vì chỉ lấy bút toán PLATFORM_FEE.
 */
export function resolveBookingPaymentBreakdown(
  input: ResolveBookingPaymentBreakdownInput,
): BookingPaymentBreakdown | null {
  if (!input.ledger.hasSettlementEntries) return null;

  const subtotal = Math.max(Math.round(input.subtotal), 0);
  const surchargeAmount = Math.min(
    Math.max(Math.round(input.surchargeAmount), 0),
    subtotal,
  );
  const explicitTaskerPlatformFee = Math.max(
    Math.round(input.ledger.explicitTaskerPlatformFee),
    0,
  );
  const walletSettlementEarning =
    input.ledger.walletSettlementEarning === null
      ? null
      : Math.max(Math.round(input.ledger.walletSettlementEarning), 0);

  const isHybridWalletCash =
    input.paymentMethod === PaymentMethod.WALLET &&
    surchargeAmount > 0 &&
    explicitTaskerPlatformFee > 0 &&
    walletSettlementEarning !== null;

  let platformFee: number;
  if (
    input.paymentMethod === PaymentMethod.WALLET &&
    walletSettlementEarning !== null
  ) {
    const walletSettledSubtotal = Math.max(
      subtotal - (isHybridWalletCash ? surchargeAmount : 0),
      0,
    );
    const feeRetainedInSystemWallet = Math.max(
      walletSettledSubtotal - walletSettlementEarning,
      0,
    );
    platformFee = feeRetainedInSystemWallet + explicitTaskerPlatformFee;
  } else {
    platformFee = explicitTaskerPlatformFee;
  }

  platformFee = Math.min(platformFee, subtotal);
  const commissionRate =
    subtotal > 0 ? Number(((platformFee / subtotal) * 100).toFixed(2)) : 0;
  const baseAmount = Math.max(subtotal - surchargeAmount, 0);

  const basePlatformFee = isHybridWalletCash
    ? Math.max(platformFee - explicitTaskerPlatformFee, 0)
    : Math.min(Math.round((baseAmount * commissionRate) / 100), platformFee);
  const surchargePlatformFee = Math.max(platformFee - basePlatformFee, 0);

  return {
    platformFee,
    taskerIncome: Math.max(subtotal - platformFee, 0),
    commissionRate,
    baseAmount,
    basePlatformFee,
    basePaymentMethod: input.paymentMethod,
    surchargeAmount,
    surchargePlatformFee,
    surchargePaymentMethod:
      surchargeAmount <= 0
        ? null
        : isHybridWalletCash
          ? PaymentMethod.CASH
          : input.paymentMethod,
  };
}
