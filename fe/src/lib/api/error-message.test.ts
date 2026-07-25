import { describe, expect, it } from "vitest";
import { getApiErrorMessage } from "./error-message";

describe("getApiErrorMessage — phân loại lỗi 401", () => {
  it("ưu tiên message nghiệp vụ an toàn do backend trả về", () => {
    expect(
      getApiErrorMessage({
        response: {
          status: 401,
          data: { message: "Email hoặc mật khẩu không đúng" },
        },
      }),
    ).toBe("Email hoặc mật khẩu không đúng");
  });

  it("giữ message hết phiên do backend đã chuẩn hóa", () => {
    expect(
      getApiErrorMessage({
        response: {
          status: 401,
          data: {
            message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
          },
        },
      }),
    ).toBe("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
  });

  it("rơi về message phiên khi response 401 chỉ chứa nội dung kỹ thuật", () => {
    expect(
      getApiErrorMessage({
        response: {
          status: 401,
          data: { message: "Unauthorized" },
        },
      }),
    ).toBe("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
  });

  it("không để fallback của thao tác ghi đè lỗi hết phiên", () => {
    expect(
      getApiErrorMessage(
        {
          response: {
            status: 401,
            data: { message: "Unauthorized" },
          },
        },
        "Không thể cập nhật dữ liệu",
      ),
    ).toBe("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
  });
});
