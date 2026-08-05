import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReportWizard } from "./ReportWizard";

/**
 * Cố ý THẤP HƠN hằng dự phòng `CLAIM_MAX` (20 triệu): form phải bám trần admin
 * cấu hình lúc chạy, không bám hằng biên dịch cứng.
 */
const { createMutate, CONFIGURED_CLAIM_MAX } = vi.hoisted(() => ({
  createMutate: vi.fn(),
  CONFIGURED_CLAIM_MAX: 8_000_000,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

vi.mock("../hooks/useCustomerIncident", () => ({
  useCreateIncident: () => ({ mutate: createMutate, isPending: false }),
  useUploadEvidence: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useReportConfig: () => ({ data: { claimMax: CONFIGURED_CLAIM_MAX } }),
}));

const amountInputs = () =>
  screen.getAllByPlaceholderText(/Số tiền yêu cầu/i) as HTMLInputElement[];

function setup() {
  render(<ReportWizard bookingId="bk-1" />);
  fireEvent.change(screen.getByPlaceholderText(/Hư hỏng tài sản sau ca dọn/i), {
    target: { value: "Vỡ kính" },
  });
  fireEvent.change(screen.getByPlaceholderText(/Mô tả tình huống sự cố/i), {
    target: { value: "Tasker làm vỡ kính bàn" },
  });
}

/**
 * Backend chặn theo TỔNG (`totalClaimed > claimMax`), không theo từng hạng mục
 * — đúng như chú thích của chính hằng `CLAIM_MAX`. Thiếu điều kiện tổng ở form
 * thì khách tải xong hết ảnh rồi mới bị từ chối.
 */
describe("ReportWizard — trần số tiền áp cho TỔNG", () => {
  it("cảnh báo khi tổng vượt trần dù từng hạng mục đều dưới trần", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: /Thêm hạng mục/i }));

    const perItem = String(CONFIGURED_CLAIM_MAX - 1);
    amountInputs().forEach((input) =>
      fireEvent.change(input, { target: { value: perItem } }),
    );

    expect(screen.getByText(/Tổng số tiền yêu cầu vượt trần/i)).toBeInTheDocument();
  });

  it("không gửi lên server khi tổng vượt trần", () => {
    createMutate.mockClear();
    setup();
    fireEvent.click(screen.getByRole("button", { name: /Thêm hạng mục/i }));

    const perItem = String(CONFIGURED_CLAIM_MAX - 1);
    amountInputs().forEach((input) =>
      fireEvent.change(input, { target: { value: perItem } }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Gửi báo cáo/i }));

    expect(createMutate).not.toHaveBeenCalled();
  });

  it("không cảnh báo khi tổng còn trong trần", () => {
    setup();
    fireEvent.change(amountInputs()[0], { target: { value: "1000000" } });

    expect(
      screen.queryByText(/Tổng số tiền yêu cầu vượt trần/i),
    ).not.toBeInTheDocument();
  });

  it("chặn số tiền có phần thập phân — backend chỉ nhận VND nguyên", () => {
    createMutate.mockClear();
    setup();
    fireEvent.change(amountInputs()[0], { target: { value: "500000.5" } });
    fireEvent.click(screen.getByRole("button", { name: /Gửi báo cáo/i }));

    expect(createMutate).not.toHaveBeenCalled();
    expect(screen.getByText(/số tiền nguyên không lẻ/i)).toBeInTheDocument();
  });

  it("chặn theo trần ADMIN CẤU HÌNH, không theo hằng dự phòng của FE", () => {
    // 10 triệu: dưới hằng dự phòng 20 triệu nhưng vượt trần cấu hình 8 triệu.
    // Nếu form còn bám hằng cứng thì ca này lọt qua rồi bị backend từ chối.
    createMutate.mockClear();
    setup();
    fireEvent.change(amountInputs()[0], { target: { value: "10000000" } });
    fireEvent.click(screen.getByRole("button", { name: /Gửi báo cáo/i }));

    expect(screen.getByText(/vượt trần/i)).toBeInTheDocument();
    expect(createMutate).not.toHaveBeenCalled();
  });
});
