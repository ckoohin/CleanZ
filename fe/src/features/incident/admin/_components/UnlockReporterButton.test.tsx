import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UnlockReporterButton } from "./UnlockReporterButton";

const { unlockMutate } = vi.hoisted(() => ({ unlockMutate: vi.fn() }));

vi.mock("../hooks/useAdminIncident", () => ({
  useUnlockReporter: () => ({ mutate: unlockMutate, isPending: false }),
}));

describe("UnlockReporterButton", () => {
  it("không hiện gì khi khách vốn không bị khoá", () => {
    const { container } = render(
      <UnlockReporterButton id="i1" customerName="Nguyễn A" lockedUntil={null} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("hiện nút khi khách đang bị khoá quyền báo cáo", () => {
    render(
      <UnlockReporterButton
        id="i1"
        customerName="Nguyễn A"
        lockedUntil="2999-12-31T00:00:00.000Z"
      />,
    );
    expect(
      screen.getByRole("button", { name: /Gỡ khoá quyền báo cáo/i }),
    ).toBeInTheDocument();
  });

  it("không gọi API khi mới bấm — phải xác nhận trước", () => {
    unlockMutate.mockClear();
    render(
      <UnlockReporterButton
        id="i1"
        customerName="Nguyễn A"
        lockedUntil="2999-12-31T00:00:00.000Z"
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Gỡ khoá quyền báo cáo/i }),
    );

    expect(unlockMutate).not.toHaveBeenCalled();
  });

  it("nói rõ phạm vi gỡ khoá là toàn tài khoản, không riêng sự cố này", () => {
    render(
      <UnlockReporterButton
        id="i1"
        customerName="Nguyễn A"
        lockedUntil="2999-12-31T00:00:00.000Z"
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Gỡ khoá quyền báo cáo/i }),
    );

    expect(screen.getByText(/toàn bộ tài khoản của khách/i)).toBeInTheDocument();
    expect(screen.getByText(/Nguyễn A/)).toBeInTheDocument();
  });

  it("chỉ gọi API sau khi Admin xác nhận", () => {
    unlockMutate.mockClear();
    render(
      <UnlockReporterButton
        id="i1"
        customerName="Nguyễn A"
        lockedUntil="2999-12-31T00:00:00.000Z"
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Gỡ khoá quyền báo cáo/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Xác nhận gỡ khoá/i }));

    expect(unlockMutate).toHaveBeenCalledTimes(1);
  });
});
