import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  CompensatePanel,
  ManualCompensatePanel,
  ReverseCompensationPanel,
} from "./CompensationPanels";
import type { PayoutPreview } from "@/features/incident/shared/incident.types";

const { manualMutate, uploadMutateAsync, toastError } = vi.hoisted(() => ({
  manualMutate: vi.fn(),
  uploadMutateAsync: vi.fn().mockResolvedValue({ id: "ev-1" }),
  toastError: vi.fn(),
}));

// Hook tanstack-query → mock để không cần QueryClient/http.
vi.mock("../../hooks/useAdminIncident", () => {
  const hook = () => ({ mutate: vi.fn(), isPending: false, mutateAsync: vi.fn() });
  return {
    useCompensate: hook,
    useCompensateManual: () => ({
      mutate: manualMutate,
      isPending: false,
      mutateAsync: vi.fn(),
    }),
    useReverseCompensation: hook,
    useUploadTransferProof: () => ({
      mutate: vi.fn(),
      isPending: false,
      mutateAsync: uploadMutateAsync,
    }),
  };
});

vi.mock("@/lib/toast", () => ({
  toast: { error: toastError, success: vi.fn() },
}));

/** Tasker chịu 150k nhưng ví chỉ còn 100k → quỹ phải ứng 50k. */
const preview: PayoutPreview = {
  customerRefund: 200000,
  recoverableFromTasker: 100000,
  uncoveredFromTasker: 50000,
  platformPayout: 100000,
  taskerWalletBalance: 100000,
};

describe("CompensatePanel", () => {
  it("hiển thị lý do chặn thay cho nút khi bị block", () => {
    render(
      <CompensatePanel id="i1" amount={200000} blockedReason="Chưa chốt quyết định" />,
    );
    expect(screen.getByText("Chưa chốt quyết định")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("hiển thị nút chi trả với số tiền khi không bị block", () => {
    render(<CompensatePanel id="i1" amount={200000} />);
    const btn = screen.getByRole("button", { name: /Chi trả bồi thường/i });
    expect(btn.textContent).toContain("200.000đ");
  });

  it("hiện SỐ THỰC TẾ sẽ ghi sổ, không phải phân bổ danh nghĩa", () => {
    const { container } = render(
      <CompensatePanel id="i1" amount={200000} preview={preview} />,
    );
    // Trừ ví Tasker = số dư khả dụng (100k), KHÔNG phải 150k theo phân bổ.
    expect(container.textContent).toContain("100.000đ");
    // Phần Tasker không đủ được nêu rõ là ghi nợ.
    expect(container.textContent).toMatch(/ghi nợ/i);
    expect(container.textContent).toContain("50.000đ");
  });

  it("luôn có lối vào luồng chuyển khoản thủ công, không cần bấm lỗi trước", () => {
    render(<CompensatePanel id="i1" amount={200000} preview={preview} />);
    expect(
      screen.getByRole("button", { name: /Chuyển khoản thủ công/i }),
    ).toBeInTheDocument();
  });
});

/**
 * Trước đây nút đảo bật cho mọi hồ sơ đã chi, kể cả khi BE chắc chắn từ chối — Admin gõ
 * xong lý do, bấm, rồi mới nhận 409. Ba điều kiện đó BE biết ngay lúc dựng view.
 */
describe("ReverseCompensationPanel", () => {
  it("giải thích bằng tiếng Việt thay vì bật nút chắc chắn thất bại", () => {
    render(
      <ReverseCompensationPanel
        id="i1"
        decisionVersion={3}
        blockedReasons={["REVERSAL_WINDOW_EXPIRED"]}
      />,
    );
    expect(screen.getByText(/quá 72 giờ/i)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("nêu đủ các lý do khi có nhiều hơn một", () => {
    const { container } = render(
      <ReverseCompensationPanel
        id="i1"
        decisionVersion={3}
        blockedReasons={["REVERSAL_MANUAL_PAYOUT", "REVERSAL_DEBT_RECOVERY_STARTED"]}
      />,
    );
    expect(container.textContent).toMatch(/chuyển khoản ngoài ví/i);
    expect(container.textContent).toMatch(/thu hồi nợ/i);
  });

  it("không bị chặn thì hiện nút đảo bình thường", () => {
    render(<ReverseCompensationPanel id="i1" decisionVersion={3} />);
    expect(
      screen.getByRole("button", { name: /Thu hồi bồi thường/i }),
    ).toBeInTheDocument();
  });
});

/**
 * Chi thủ công đưa tiền ra ngoài ví, nên nơi nhận phải vào sổ cùng lúc — ảnh
 * minh chứng không tra cứu hay đối soát được.
 */
describe("ManualCompensatePanel — ghi nhận nơi nhận tiền", () => {
  const fillRecipient = () => {
    fireEvent.change(screen.getByLabelText("Ngân hàng của khách"), {
      target: { value: "vcb" },
    });
    fireEvent.change(screen.getByLabelText("Số tài khoản khách"), {
      target: { value: "0011223344" },
    });
  };

  it("chặn xác nhận khi chưa nhập ngân hàng và số tài khoản", () => {
    render(<ManualCompensatePanel id="i1" code="SC-1" amount={200000} />);
    expect(
      screen.getByRole("button", { name: /Xác nhận đã chuyển khoản/i }),
    ).toBeDisabled();
    expect(screen.getByText(/được ghi vào\s+sổ chi để đối soát/i)).toBeInTheDocument();
  });

  it("vẫn chặn khi đã nhập tài khoản nhưng chưa có ảnh minh chứng", () => {
    render(<ManualCompensatePanel id="i1" code="SC-1" amount={200000} />);
    fillRecipient();
    expect(
      screen.getByRole("button", { name: /Xác nhận đã chuyển khoản/i }),
    ).toBeDisabled();
  });

  it("gửi kèm ngân hàng và số tài khoản vào ghi chú chi trả", async () => {
    manualMutate.mockClear();
    const { container } = render(
      <ManualCompensatePanel id="i1" code="SC-1" amount={200000} />,
    );
    fillRecipient();

    fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: {
        files: [new File(["x"], "proof.png", { type: "image/png" })],
      },
    });
    await screen.findByText(/proof\.png/);

    fireEvent.click(
      screen.getByRole("button", { name: /Xác nhận đã chuyển khoản/i }),
    );

    expect(manualMutate).toHaveBeenCalledWith({
      proofEvidenceId: "ev-1",
      note: "Chuyển khoản VCB · STK 0011223344 · ND CLEANZ BOI THUONG SC-1",
    });
  });
});

describe("ManualCompensatePanel — chặn ảnh không hợp lệ ngay ở client", () => {
  const pick = (file: File) => {
    const { container } = render(
      <ManualCompensatePanel id="i1" code="SC-1" amount={200000} />,
    );
    fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: { files: [file] },
    });
    return container;
  };

  it("từ chối file không phải JPEG/PNG mà không tốn một vòng lên server", () => {
    uploadMutateAsync.mockClear();
    toastError.mockClear();

    pick(new File(["x"], "hop-dong.pdf", { type: "application/pdf" }));

    expect(uploadMutateAsync).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith(
      expect.stringMatching(/JPEG hoặc PNG/i),
    );
  });

  it("từ chối ảnh vượt 5MB — trần khớp với endpoint upload của BE", () => {
    uploadMutateAsync.mockClear();
    toastError.mockClear();
    const big = new File(["x"], "to-qua.png", { type: "image/png" });
    Object.defineProperty(big, "size", { value: 6 * 1024 * 1024 });

    pick(big);

    expect(uploadMutateAsync).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/5MB/i));
  });

  it("xoá giá trị input để chọn lại đúng file đó vẫn nhận", () => {
    const container = pick(
      new File(["x"], "proof.png", { type: "image/png" }),
    );
    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    expect(input.value).toBe("");
  });
});
