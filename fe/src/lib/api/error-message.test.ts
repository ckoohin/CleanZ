import { describe, expect, it } from "vitest";
import { getApiErrorMessage, unwrapBlobError } from "./error-message";

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

/** Dựng lỗi axios đúng hình dạng thật của một request `responseType: 'blob'`. */
function blobError(status: number, body: unknown, type = "application/json") {
  return {
    response: {
      status,
      data: new Blob([typeof body === "string" ? body : JSON.stringify(body)], {
        type,
      }) as unknown,
    },
  };
}

describe("unwrapBlobError — body lỗi của request tải file", () => {
  it("đọc được message thật của server nằm trong Blob", async () => {
    // Chưa bóc: getApiErrorMessage không đọc nổi Blob nên chỉ ra câu chung theo
    // mã HTTP, message nghiệp vụ của backend bị nuốt mất.
    const error = blobError(400, {
      message: "Lỗi khi dựng danh sách ticket để xuất Excel",
    });
    expect(getApiErrorMessage(error)).toBe(
      "Thông tin gửi lên không hợp lệ. Vui lòng kiểm tra lại.",
    );

    await unwrapBlobError(error);

    expect(getApiErrorMessage(error)).toBe(
      "Lỗi khi dựng danh sách ticket để xuất Excel",
    );
  });

  it("giữ câu theo mã HTTP khi body không phải JSON hợp lệ", async () => {
    const error = blobError(429, "<html>Too Many Requests</html>");

    await unwrapBlobError(error);

    expect(getApiErrorMessage(error)).toBe(
      "Bạn thao tác quá nhanh. Vui lòng chờ một chút rồi thử lại.",
    );
  });

  it("không đụng vào Blob không phải JSON — đó là file tải về, không phải lỗi", async () => {
    const error = blobError(
      200,
      "noi dung file",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    await unwrapBlobError(error);

    expect(error.response.data).toBeInstanceOf(Blob);
  });

  it("không vỡ khi lỗi không có response (mất mạng)", async () => {
    await expect(
      unwrapBlobError({ code: "ERR_NETWORK" }),
    ).resolves.toBeUndefined();
  });

  it("giữ nguyên body đã là JSON sẵn", async () => {
    const error = {
      response: { status: 403, data: { message: "Không đủ quyền" } },
    };

    await unwrapBlobError(error);

    expect(error.response.data).toEqual({ message: "Không đủ quyền" });
  });
});
