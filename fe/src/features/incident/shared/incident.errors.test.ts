import { describe, it, expect } from "vitest";
import {
  conflictMessage,
  isConflict,
  isDecisionVersionConflict,
  VERSION_CONFLICT_MESSAGE,
} from "./incident.errors";

function conflict(code: string, message: string) {
  return { response: { status: 409, data: { code, message } } };
}

/**
 * Module incident dùng 409 cho cả xung đột phiên bản LẪN hàng loạt điều kiện nghiệp vụ.
 * Trước đây FE dịch mọi 409 thành "phiên bản quyết định đã thay đổi, dữ liệu đã được tải
 * lại" — vừa giấu lý do thật, vừa gợi ý sai cách xử lý: admin nghe vậy thì bấm lại, trong
 * khi quỹ nền tảng vẫn cạn và lần bấm nào cũng sẽ hỏng y hệt.
 */
describe("conflictMessage — 409 không đồng nghĩa với xung đột phiên bản", () => {
  it("giữ câu chuẩn cho ĐÚNG xung đột phiên bản", () => {
    const e = conflict(
      "DECISION_VERSION_CONFLICT",
      "Quyết định đã được thay đổi ở nơi khác — tải lại trước khi tiếp tục",
    );

    expect(isDecisionVersionConflict(e)).toBe(true);
    expect(conflictMessage(e)).toBe(VERSION_CONFLICT_MESSAGE);
  });

  it("quỹ nền tảng cạn: nói đúng lý do, không nói phiên bản đã đổi", () => {
    const e = conflict(
      "PLATFORM_FUND_INSUFFICIENT",
      "Quỹ nền tảng không đủ số dư để chi bồi thường — cần nạp quỹ hoặc dùng luồng chuyển khoản thủ công.",
    );

    expect(conflictMessage(e)).toContain("Quỹ nền tảng không đủ");
    expect(conflictMessage(e)).not.toBe(VERSION_CONFLICT_MESSAGE);
  });

  it.each([
    [
      "TASKER_RESPONSE_WAITING",
      "Đang trong thời hạn Tasker phản biện — chưa được chốt",
    ],
    ["COMPENSATION_ALREADY_PAID", "Bồi thường đã được chi"],
    [
      "REVERSAL_WINDOW_EXPIRED",
      "Quá hạn tự động thu hồi (72h kể từ lúc chi trả)",
    ],
    ["TASKER_RESPONSE_WINDOW_EXPIRED", "Đã quá thời hạn phản hồi quyết định"],
  ])("%s: hiện message của backend", (code, message) => {
    const e = conflict(code, message);

    expect(isDecisionVersionConflict(e)).toBe(false);
    expect(conflictMessage(e)).toBe(message);
  });

  it("409 không kèm mã: vẫn dùng message backend, không đoán là xung đột phiên bản", () => {
    const e = {
      response: { status: 409, data: { message: "Xung đột khi tạo sự cố" } },
    };

    expect(conflictMessage(e)).toBe("Xung đột khi tạo sự cố");
  });

  it("nhận diện đúng 409 và bỏ qua status khác", () => {
    expect(isConflict(conflict("X", "y"))).toBe(true);
    expect(isConflict({ response: { status: 422, data: {} } })).toBe(false);
    expect(isConflict(new Error("network"))).toBe(false);
  });
});
