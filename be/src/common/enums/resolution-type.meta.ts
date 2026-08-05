import { ResolutionType } from './resolution-type.enum';

/**
 * Hướng dòng tiền của một kết luận xử lý ticket.
 *
 * `ticket_resolutions.amount` luôn KHÔNG ÂM (`@Min(0)` trong
 * `CreateResolutionDto`) — dấu của khoản tiền nằm ở `type`, không nằm ở con số.
 * Thiếu bảng này thì mọi nơi cộng tiền sẽ gộp lẫn tiền trả cho khách với tiền
 * thu của Tasker vào cùng một tổng, ra con số không trả lời được câu hỏi nào.
 */
export enum MoneyDirection {
  /** Nền tảng chi ra (trả cho khách). */
  OUTFLOW = 'OUTFLOW',
  /** Nền tảng thu về (khấu trừ Tasker). */
  INFLOW = 'INFLOW',
  /** Bù bằng hiện vật hoặc cam kết khuyến mãi — chưa phải tiền mặt. */
  NON_CASH = 'NON_CASH',
  /** Không phát sinh giá trị. */
  NONE = 'NONE',
}

/**
 * ĐÂY LÀ NGỮ NGHĨA NGHIỆP VỤ, KHÔNG PHẢI CHUYỆN HIỂN THỊ — nên nó nằm cạnh
 * enum chứ không nằm trong file nhãn của báo cáo.
 *
 * Hiện `RESOLUTION_EXECUTOR` vẫn là `NoopResolutionExecutor` (record-only,
 * dòng tiền thuộc Phase 2). Khi executor thật ra đời, nó phải dùng CHÍNH bảng
 * này để quyết định ghi nợ hay ghi có vào ví. Nếu để bảng nằm lẫn trong code
 * báo cáo, Phase 2 gần như chắc chắn viết lại một bản thứ hai, và hai bản sẽ
 * trôi khỏi nhau — kiểu sai không ai phát hiện cho tới lúc tiền chạy ngược.
 */
export const RESOLUTION_MONEY_DIRECTION: Record<
  ResolutionType,
  MoneyDirection
> = {
  [ResolutionType.REFUND]: MoneyDirection.OUTFLOW,
  [ResolutionType.COMPENSATION]: MoneyDirection.OUTFLOW,
  [ResolutionType.TASKER_PENALTY]: MoneyDirection.INFLOW,
  [ResolutionType.VOUCHER]: MoneyDirection.NON_CASH,
  [ResolutionType.RECLEAN]: MoneyDirection.NON_CASH,
  [ResolutionType.EXPLANATION]: MoneyDirection.NONE,
};

export const MONEY_DIRECTION_LABEL_VI: Record<MoneyDirection, string> = {
  [MoneyDirection.OUTFLOW]: 'Chi cho khách',
  [MoneyDirection.INFLOW]: 'Thu từ Tasker',
  [MoneyDirection.NON_CASH]: 'Không phải tiền mặt',
  [MoneyDirection.NONE]: 'Không phát sinh',
};

/** Loại xử lý lạ (dữ liệu cũ) coi như không phát sinh tiền, không đoán bừa. */
export function moneyDirectionOf(type: string): MoneyDirection {
  return (
    RESOLUTION_MONEY_DIRECTION[type as ResolutionType] ?? MoneyDirection.NONE
  );
}
