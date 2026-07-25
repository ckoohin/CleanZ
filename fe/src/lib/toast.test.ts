import { afterEach, describe, expect, it } from "vitest";
import { getToastDedupeId, toast } from "./toast";

afterEach(() => {
  toast.dismiss();
});

describe("toast deduplication", () => {
  it("dùng cùng ID cho hai lỗi giống hệt nhau", () => {
    const firstId = toast.error("Phiên đăng nhập đã hết hạn");
    const secondId = toast.error("Phiên đăng nhập đã hết hạn");

    expect(secondId).toBe(firstId);
    expect(
      toast
        .getToasts()
        .filter(
          (item) =>
            "title" in item &&
            item.title === "Phiên đăng nhập đã hết hạn",
        ),
    ).toHaveLength(1);
  });

  it("không gộp hai thông báo có mô tả khác nhau", () => {
    expect(
      getToastDedupeId("error", "Không thể lưu", {
        description: "Đơn hàng A",
      }),
    ).not.toBe(
      getToastDedupeId("error", "Không thể lưu", {
        description: "Đơn hàng B",
      }),
    );
  });

  it("tôn trọng ID do call-site cung cấp", () => {
    expect(
      getToastDedupeId("success", "Đã lưu", { id: "save-profile" }),
    ).toBe("save-profile");
  });
});
