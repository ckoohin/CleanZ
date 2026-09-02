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
  useReportConfig: () => ({
    data: {
      claimMax: CONFIGURED_CLAIM_MAX,
      reportWindowHours: 48,
      reportWindowSevereHours: 72,
    },
  }),
}));

/**
 * Hai đơn đã hoàn thành: một còn hạn, một hoàn thành từ lâu nên đã qua cả cửa sổ rộng
 * nhất. Kèm một đơn đã huỷ để chắc rằng picker chỉ lấy COMPLETED — đúng tập backend nhận.
 */
vi.mock("@/features/booking/hooks/useCustomerBooking", () => ({
  useMyBookingHistory: () => ({
    isLoading: false,
    data: {
      items: [
        {
          id: "bk-fresh",
          bookingCode: "BK-COMPLETED",
          status: "COMPLETED",
          service: { name: "Dọn nhà" },
          completedAt: new Date(Date.now() - 3600_000).toISOString(),
        },
        {
          id: "bk-stale",
          bookingCode: "BK-STALE",
          status: "COMPLETED",
          service: { name: "Dọn nhà" },
          completedAt: new Date(Date.now() - 200 * 3600_000).toISOString(),
        },
        {
          id: "bk-cancelled",
          bookingCode: "BK-CANCELLED",
          status: "CANCELLED",
          service: { name: "Dọn nhà" },
          completedAt: null,
        },
      ],
    },
  }),
}));

const amountInputs = () =>
  screen.getAllByPlaceholderText(
    /Số tiền muốn được đền/i,
  ) as HTMLInputElement[];

function setup() {
  render(<ReportWizard bookingId="bk-1" />);
  fireEvent.change(screen.getByPlaceholderText(/Hư hỏng tài sản sau ca dọn/i), {
    target: { value: "Vỡ kính" },
  });
  fireEvent.change(screen.getByPlaceholderText(/Kể lại sự việc/i), {
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
    fireEvent.click(
      screen.getByRole("button", { name: /Thêm khoản thiệt hại/i }),
    );

    const perItem = String(CONFIGURED_CLAIM_MAX - 1);
    amountInputs().forEach((input) =>
      fireEvent.change(input, { target: { value: perItem } }),
    );

    expect(
      screen.getByText(/Tổng số tiền yêu cầu vượt mức tối đa/i),
    ).toBeInTheDocument();
  });

  it("không gửi lên server khi tổng vượt trần", () => {
    createMutate.mockClear();
    setup();
    fireEvent.click(
      screen.getByRole("button", { name: /Thêm khoản thiệt hại/i }),
    );

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
      screen.queryByText(/Tổng số tiền yêu cầu vượt mức tối đa/i),
    ).not.toBeInTheDocument();
  });

  it("chặn số tiền có phần thập phân — backend chỉ nhận VND nguyên", () => {
    createMutate.mockClear();
    setup();
    fireEvent.change(amountInputs()[0], { target: { value: "500000.5" } });
    fireEvent.click(screen.getByRole("button", { name: /Gửi báo cáo/i }));

    expect(createMutate).not.toHaveBeenCalled();
    expect(screen.getByText(/số tiền chẵn/i)).toBeInTheDocument();
  });

  it("chặn theo trần ADMIN CẤU HÌNH, không theo hằng dự phòng của FE", () => {
    // 10 triệu: dưới hằng dự phòng 20 triệu nhưng vượt trần cấu hình 8 triệu.
    // Nếu form còn bám hằng cứng thì ca này lọt qua rồi bị backend từ chối.
    createMutate.mockClear();
    setup();
    fireEvent.change(amountInputs()[0], { target: { value: "10000000" } });
    fireEvent.click(screen.getByRole("button", { name: /Gửi báo cáo/i }));

    expect(screen.getByText(/vượt mức tối đa/i)).toBeInTheDocument();
    expect(createMutate).not.toHaveBeenCalled();
  });
});

/**
 * Không có `bookingId` thì trước đây form hiện một ô text trống và khách phải TỰ GÕ UUID
 * của đơn — trong khi link duy nhất tới màn hình này (nút "Báo cáo" ở danh sách sự cố)
 * không truyền gì cả. Nghĩa là lối vào chính thức của cả tính năng không dùng được.
 */
describe("ReportWizard — chọn đơn thay vì gõ mã đơn", () => {
  it("không có bookingId: hiện danh sách đơn đã hoàn thành, KHÔNG có ô nhập mã đơn", () => {
    render(<ReportWizard />);

    expect(screen.getByText(/BK-COMPLETED/)).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText(/Chọn đơn đã hoàn thành/i),
    ).not.toBeInTheDocument();
  });

  it("chưa chọn đơn thì chưa mở phần khai thiệt hại", () => {
    render(<ReportWizard />);

    expect(
      screen.queryByPlaceholderText(/Hư hỏng tài sản sau ca dọn/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Gửi báo cáo/i }),
    ).not.toBeInTheDocument();
  });

  it("chọn đơn xong mới mở form, và hiện đúng đơn đã chọn", () => {
    render(<ReportWizard />);
    fireEvent.click(screen.getByText(/BK-COMPLETED/));

    expect(
      screen.getByPlaceholderText(/Hư hỏng tài sản sau ca dọn/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/BK-COMPLETED · Dọn nhà/)).toBeInTheDocument();
  });

  it("đơn quá hạn báo cáo bị khoá — không để khách khai xong rồi mới bị từ chối", () => {
    render(<ReportWizard />);

    const stale = screen.getByText(/BK-STALE/).closest("button");
    expect(stale).toBeDisabled();
    expect(screen.getByText(/đã hết hạn báo cáo/i)).toBeInTheDocument();
  });

  it("vào từ link của một đơn cụ thể: mở thẳng form, không cho đổi đơn", () => {
    render(<ReportWizard bookingId="bk-1" />);

    expect(
      screen.getByPlaceholderText(/Hư hỏng tài sản sau ca dọn/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Đổi đơn/i }),
    ).not.toBeInTheDocument();
  });
});
