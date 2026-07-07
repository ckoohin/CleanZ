import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CompensatePanel } from "./CompensationPanels";

// Hook tanstack-query → mock để không cần QueryClient/http.
vi.mock("../../hooks/useAdminIncident", () => ({
  useCompensate: () => ({ mutate: vi.fn(), isPending: false }),
}));

describe("CompensatePanel", () => {
  it("hiển thị lý do chặn thay cho nút khi bị block", () => {
    render(
      <CompensatePanel id="i1" amount={200000} blockedReason="Chưa đủ Admin #2" />,
    );
    expect(screen.getByText("Chưa đủ Admin #2")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("hiển thị nút chi trả với số tiền khi không bị block", () => {
    render(<CompensatePanel id="i1" amount={200000} blockedReason={undefined} />);
    const btn = screen.getByRole("button");
    expect(btn.textContent).toContain("Chi trả bồi thường");
    expect(btn.textContent).toContain("200.000đ");
  });

  it("wording tiền thật + gợi ý khi thiếu quỹ nền tảng", () => {
    const { container } = render(
      <CompensatePanel id="i1" amount={200000} blockedReason={undefined} />,
    );
    expect(container.textContent).toMatch(/Chi trả bồi thường/);
    // Nút luôn hiển thị nhắc trường hợp quỹ nền tảng không đủ.
    expect(container.textContent).toMatch(/quỹ nền tảng không đủ/i);
  });
});
