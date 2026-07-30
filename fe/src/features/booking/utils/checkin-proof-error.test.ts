import { describe, expect, it } from "vitest";
import {
  extractCheckinErrorMessage,
  getCheckinProofReason,
} from "./checkin-proof-error";

function apiError(message: unknown) {
  return { response: { data: { message } } };
}

describe("getCheckinProofReason", () => {
  it.each([
    "Hãy chụp ảnh địa chỉ để xác minh",
    "Địa chỉ booking chưa có tọa độ để xác minh tự động. Vui lòng chụp ảnh hiện trường để check-in; Admin sẽ kiểm tra thủ công.",
    "Tín hiệu GPS đang có sai số ~25000m (cho phép tối đa 100m). Vui lòng lấy lại vị trí, hoặc chụp ảnh hiện trường để Admin xác minh.",
    "Vị trí hiện tại chưa đúng, vui lòng kiểm tra lại hoặc gửi ảnh minh chứng để tiếp tục.",
    "Không lấy được vị trí của bạn. Vui lòng bật định vị, hoặc chụp ảnh minh chứng để check-in.",
  ])("nhận diện yêu cầu mở sheet ảnh: %s", (message) => {
    expect(getCheckinProofReason(apiError(message))).toBe(message);
  });

  it("không coi lỗi check-in thông thường là yêu cầu ảnh", () => {
    expect(
      getCheckinProofReason(
        apiError("Chưa đến cửa sổ check-in. Còn 10 phút nữa."),
      ),
    ).toBeNull();
  });

  it("đọc message đầu tiên khi backend trả về mảng", () => {
    expect(extractCheckinErrorMessage(apiError(["Lỗi thứ nhất"]))).toBe(
      "Lỗi thứ nhất",
    );
  });
});
