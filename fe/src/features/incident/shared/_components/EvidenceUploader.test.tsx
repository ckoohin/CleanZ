import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EvidenceUploader } from "./EvidenceUploader";
import type { Evidence } from "../incident.types";

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }));
vi.mock("@/lib/toast", () => ({
  toast: { error: toastError, success: vi.fn() },
}));

const img = (name: string, size = 1024) => {
  const file = new File(["x"], name, { type: "image/png" });
  Object.defineProperty(file, "size", { value: size });
  return file;
};

function renderUploader(upload: (f: File) => Promise<Evidence>) {
  const onChange = vi.fn();
  const { container } = render(
    <EvidenceUploader upload={upload} value={[]} onChange={onChange} max={4} />,
  );
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  return { onChange, input };
}

describe("EvidenceUploader — ảnh đã tải lên không được mất khi lô lỗi giữa chừng", () => {
  it("giữ lại ảnh đã upload thành công khi ảnh sau đó lỗi", async () => {
    const upload = vi
      .fn()
      .mockResolvedValueOnce({ id: "ev-1", url: "u1" })
      .mockRejectedValueOnce(new Error("mạng lỗi"));
    const { onChange, input } = renderUploader(upload);

    fireEvent.change(input, { target: { files: [img("a.png"), img("b.png")] } });

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    // Trước đây throw nhảy qua onChange: ảnh a.png đã nằm trên server nhưng
    // biến mất khỏi giao diện, khách phải tải lại từ đầu.
    expect(onChange).toHaveBeenCalledWith([{ id: "ev-1", url: "u1" }]);
  });

  it("không gọi onChange khi không ảnh nào lên được", async () => {
    const upload = vi.fn().mockRejectedValue(new Error("mạng lỗi"));
    const { onChange, input } = renderUploader(upload);

    fireEvent.change(input, { target: { files: [img("a.png")] } });

    await waitFor(() => expect(upload).toHaveBeenCalled());
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("EvidenceUploader — chặn ảnh không hợp lệ ngay ở client", () => {
  it("từ chối định dạng ngoài JPEG/PNG mà không gọi upload", async () => {
    toastError.mockClear();
    const upload = vi.fn();
    const { input } = renderUploader(upload);

    fireEvent.change(input, {
      target: { files: [new File(["x"], "anh.webp", { type: "image/webp" })] },
    });

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        expect.stringMatching(/JPEG hoặc PNG/i),
      ),
    );
    expect(upload).not.toHaveBeenCalled();
  });

  it("từ chối ảnh vượt 5MB mà không tốn một vòng lên server", async () => {
    toastError.mockClear();
    const upload = vi.fn();
    const { input } = renderUploader(upload);

    fireEvent.change(input, { target: { files: [img("to.png", 6 * 1024 * 1024)] } });

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/5MB/i)),
    );
    expect(upload).not.toHaveBeenCalled();
  });

  it("ảnh hỏng nằm giữa lô không chặn những ảnh hợp lệ còn lại", async () => {
    const upload = vi.fn().mockResolvedValue({ id: "ev-2", url: "u2" });
    const { onChange, input } = renderUploader(upload);

    fireEvent.change(input, {
      target: {
        files: [
          new File(["x"], "anh.webp", { type: "image/webp" }),
          img("hop-le.png"),
        ],
      },
    });

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(upload).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([{ id: "ev-2", url: "u2" }]);
  });

  it("chỉ nhận đúng định dạng BE cho phép trong hộp thoại chọn tệp", () => {
    const { input } = renderUploader(vi.fn());
    expect(input.accept).toBe("image/jpeg,image/png,image/jpg");
  });
});

describe("EvidenceUploader — vượt số ảnh tối đa", () => {
  it("nói rõ đã bỏ bớt thay vì im lặng cắt", async () => {
    toastError.mockClear();
    const upload = vi.fn().mockResolvedValue({ id: "ev", url: "u" });
    const onChange = vi.fn();
    const { container } = render(
      <EvidenceUploader upload={upload} value={[]} onChange={onChange} max={1} />,
    );

    fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: { files: [img("a.png"), img("b.png")] },
    });

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/tối đa 1 ảnh/i)),
    );
    expect(upload).toHaveBeenCalledTimes(1);
  });
});

describe("EvidenceUploader — xoá ảnh đã chọn", () => {
  it("nút xoá có nhãn cho trình đọc màn hình", () => {
    const onChange = vi.fn();
    render(
      <EvidenceUploader
        upload={vi.fn()}
        value={[{ id: "ev-1", url: "u1" } as Evidence]}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Xoá ảnh" }));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
