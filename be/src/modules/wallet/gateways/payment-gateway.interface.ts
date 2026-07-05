import { TopupProvider } from 'src/common/enums/topup-provider.enum';

/** DI token cho cổng thanh toán (provider-agnostic). */
export const PAYMENT_GATEWAY = 'PAYMENT_GATEWAY';

export interface CreateOrderInput {
  /** Số tiền tính bằng đơn vị của `currency`, dạng chuỗi 2 chữ số thập phân, vd "1.23". */
  amountValue: string;
  currency: string;
  /** Khoá tham chiếu nội bộ (id đơn nạp) — cổng trả lại để đối chiếu. */
  referenceId: string;
  returnUrl: string;
  cancelUrl: string;
  description?: string;
}

export interface CreateOrderResult {
  orderId: string;
  approveUrl: string | null;
}

export interface OrderStatusResult {
  /** Trạng thái chuẩn hoá: CREATED | APPROVED | COMPLETED | VOIDED | ... */
  status: string;
  captureId: string | null;
  paidAmount: string | null;
  currency: string | null;
  /** Id tham chiếu nội bộ do cổng echo lại (custom_id) — nếu có. */
  referenceId: string | null;
  raw: unknown;
}

/**
 * Trừu tượng hoá cổng thanh toán để nạp tiền vào ví.
 * Hiện có PayPalGateway; cắm thêm cổng khác chỉ cần implement interface này.
 */
export interface PaymentGateway {
  readonly provider: TopupProvider;
  createOrder(input: CreateOrderInput): Promise<CreateOrderResult>;
  getOrder(orderId: string): Promise<OrderStatusResult>;
  captureOrder(orderId: string): Promise<OrderStatusResult>;
  /** Xác thực chữ ký webhook (server-to-server) trước khi tin payload. */
  verifyWebhook(
    headers: Record<string, string | string[] | undefined>,
    body: unknown,
  ): Promise<boolean>;
}
