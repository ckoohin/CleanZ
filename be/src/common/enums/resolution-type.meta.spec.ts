import { ResolutionType } from './resolution-type.enum';
import {
  MONEY_DIRECTION_LABEL_VI,
  MoneyDirection,
  RESOLUTION_MONEY_DIRECTION,
  moneyDirectionOf,
} from './resolution-type.meta';

describe('RESOLUTION_MONEY_DIRECTION', () => {
  /**
   * Chốt cứng ở đây thay vì tin vào `Record<ResolutionType, …>`: TypeScript chỉ
   * bắt lỗi lúc biên dịch, mà thêm một loại xử lý mới rồi quên khai báo hướng
   * tiền là thứ phải fail NGAY ở test, không phải fail ở báo cáo tài chính.
   */
  it('mọi loại xử lý đều được khai báo hướng dòng tiền', () => {
    for (const type of Object.values(ResolutionType)) {
      expect(RESOLUTION_MONEY_DIRECTION[type]).toBeDefined();
    }
  });

  it('mọi hướng dòng tiền đều có nhãn tiếng Việt', () => {
    for (const direction of Object.values(MoneyDirection)) {
      expect(MONEY_DIRECTION_LABEL_VI[direction]).toBeTruthy();
    }
  });

  it('phân đúng chiều: hoàn tiền/bồi thường là chi, phạt Tasker là thu', () => {
    expect(RESOLUTION_MONEY_DIRECTION[ResolutionType.REFUND]).toBe(
      MoneyDirection.OUTFLOW,
    );
    expect(RESOLUTION_MONEY_DIRECTION[ResolutionType.COMPENSATION]).toBe(
      MoneyDirection.OUTFLOW,
    );
    expect(RESOLUTION_MONEY_DIRECTION[ResolutionType.TASKER_PENALTY]).toBe(
      MoneyDirection.INFLOW,
    );
  });

  it('voucher và làm lại không được tính là tiền mặt', () => {
    expect(RESOLUTION_MONEY_DIRECTION[ResolutionType.VOUCHER]).toBe(
      MoneyDirection.NON_CASH,
    );
    expect(RESOLUTION_MONEY_DIRECTION[ResolutionType.RECLEAN]).toBe(
      MoneyDirection.NON_CASH,
    );
  });

  it('loại lạ coi như không phát sinh tiền, không đoán bừa', () => {
    expect(moneyDirectionOf('LOAI_MOI_CHUA_KHAI_BAO')).toBe(
      MoneyDirection.NONE,
    );
  });
});
