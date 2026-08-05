import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DecisionResponseComposer } from "./DecisionResponseComposer";
import type { IncidentTaskerView } from "@/features/incident/shared/incident.types";

vi.mock("../hooks/useTaskerIncident", () => ({
  useUpsertDecisionResponse: () => ({ mutate: vi.fn(), isPending: false }),
  useTaskerUploadEvidence: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

function makeIncident(
  over: Partial<IncidentTaskerView> = {},
): IncidentTaskerView {
  return {
    id: "inc-1",
    status: "AWAITING_RESPONSE",
    decisionVersion: 2,
    canRespondToDecision: true,
    taskerResponseDeadline: "2026-07-05T10:00:00+07:00",
    ...over,
  } as unknown as IncidentTaskerView;
}

/**
 * Người sắp bị trừ tiền phải được nói đúng lý do họ không phản biện được. Trước
 * đây cả hai trường hợp đều rơi vào một câu "Chưa mở cửa sổ phản hồi" — nói
 * ngược sự thật khi hạn đã trôi qua.
 */
describe("DecisionResponseComposer — phân biệt CHƯA MỞ và ĐÃ HẾT HẠN", () => {
  it("hết hạn: báo quá hạn kèm mốc hạn chót, không nói 'chưa mở'", () => {
    render(
      <DecisionResponseComposer
        incident={makeIncident({
          status: "AWAITING_RESPONSE",
          canRespondToDecision: false,
        })}
      />,
    );

    expect(screen.getByText(/Đã quá hạn phản hồi/i)).toBeInTheDocument();
    expect(screen.queryByText(/Chưa mở cửa sổ/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Hạn chót là/i)).toBeInTheDocument();
  });

  it("chưa tới lượt phản biện: báo chưa mở, không báo quá hạn", () => {
    render(
      <DecisionResponseComposer
        incident={makeIncident({
          status: "REVIEWING",
          canRespondToDecision: false,
        })}
      />,
    );

    expect(screen.getByText(/Chưa mở cửa sổ phản hồi/i)).toBeInTheDocument();
    expect(screen.queryByText(/quá hạn/i)).not.toBeInTheDocument();
  });

  it("đang mở: hiện form gửi phản hồi", () => {
    render(<DecisionResponseComposer incident={makeIncident()} />);

    expect(
      screen.getByRole("button", { name: /Gửi phản hồi/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/quá hạn/i)).not.toBeInTheDocument();
  });

  it("chọn Không đồng ý thì bắt buộc giải thích", () => {
    render(<DecisionResponseComposer incident={makeIncident()} />);

    fireEvent.click(screen.getByRole("button", { name: "Không đồng ý" }));

    expect(screen.getByRole("button", { name: /Gửi phản hồi/i })).toBeDisabled();
  });
});
