import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CompensatePanel, ReverseCompensationPanel } from "./CompensationPanels";
import type { PayoutPreview } from "@/features/incident/shared/incident.types";

// Hook tanstack-query → mock để không cần QueryClient/http.
vi.mock("../../hooks/useAdminIncident", () => {
  const hook = () => ({ mutate: vi.fn(), isPending: false, mutateAsync: vi.fn() });
  return {
    useCompensate: hook,
    useCompensateManual: hook,
    useReverseCompensation: hook,
    useUploadTransferProof: hook,
  };
});

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
