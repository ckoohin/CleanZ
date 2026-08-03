import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DecisionPanel } from "./DecisionPanel";
import type {
  IncidentAdminView,
  IncidentDecisionAction,
} from "@/features/incident/shared/incident.types";

vi.mock("../../hooks/useAdminIncident", () => {
  const hook = () => ({ mutate: vi.fn(), isPending: false });
  return {
    useSaveDecision: hook,
    useSendDecisionToTasker: hook,
    useFinalizeDecision: hook,
  };
});

function makeIncident(
  allowedActions: IncidentDecisionAction[],
  status: IncidentAdminView["status"] = "REVIEWING",
): IncidentAdminView {
  return {
    id: "inc-1",
    status,
    damageItems: [
      {
        id: "item-1",
        description: "Vỡ kính",
        claimedAmount: 300000,
        verifiedAmount: 200000,
        approvedAmount: 200000,
        verificationStatus: "VERIFIED",
        evidences: [],
      },
    ],
    approvedAmount: 200000,
    taskerBorneAmount: 100000,
    platformBorneAmount: 100000,
    allocationReason: "50/50",
    decisionResponses: [],
    decision: {
      version: 1,
      outcome: "COMPENSATE",
      taskerResponseDeadline: null,
      sentTaskerBorneAmount: null,
      responsibilityParty: "SHARED",
      responsibilityReason: "Hai bên cùng có lỗi nên chia sẻ trách nhiệm",
      taskerDecisionReason: "tasker chịu",
      customerDecisionSummary: "tóm tắt cho khách hàng",
      internalDecisionNote: "note nội bộ",
      allowedActions,
      blockedReasons: [],
      policyVersion: null,
      policyCapSnapshot: null,
      responseWindowHoursSnapshot: null,
      finalizedAt: null,
      requiresTaskerResponse: true,
    },
  } as unknown as IncidentAdminView;
}

describe("DecisionPanel — gating theo allowedActions (BE-driven)", () => {
  it("hiện khối Gửi Tasker khi allowedActions có SEND_TO_TASKER", () => {
    render(
      <DecisionPanel
        incident={makeIncident(["SAVE_DECISION", "SEND_TO_TASKER"])}
      />,
    );
    expect(
      screen.getByRole("button", { name: /Gửi cho Tasker/i }),
    ).toBeEnabled();
  });

  it("ẩn khối Gửi Tasker khi BE không cho (Tasker không chịu tiền)", () => {
    render(
      <DecisionPanel incident={makeIncident(["SAVE_DECISION", "FINALIZE"])} />,
    );
    expect(
      screen.queryByRole("button", { name: /Gửi cho Tasker/i }),
    ).not.toBeInTheDocument();
  });

  it("bật nút Chốt quyết định khi allowedActions có FINALIZE", () => {
    render(<DecisionPanel incident={makeIncident(["FINALIZE"])} />);
    expect(
      screen.getByRole("button", { name: /Chốt quyết định/i }),
    ).toBeEnabled();
  });

  it("tắt nút Chốt khi BE chưa cho (đang chờ Tasker phản biện)", () => {
    render(
      <DecisionPanel
        incident={makeIncident(["SAVE_DECISION"], "AWAITING_RESPONSE")}
      />,
    );
    expect(
      screen.getByRole("button", { name: /Chốt quyết định/i }),
    ).toBeDisabled();
  });

  it("bật nút Lưu quyết định khi allowedActions có SAVE_DECISION", () => {
    render(<DecisionPanel incident={makeIncident(["SAVE_DECISION"])} />);
    expect(
      screen.getByRole("button", { name: /Lưu quyết định/i }),
    ).toBeEnabled();
  });

  it("tắt nút Lưu khi sự cố đã chốt (không lọt 409 trên hồ sơ đã đóng)", () => {
    render(
      <DecisionPanel incident={makeIncident(["COMPENSATE"], "AWAITING_PAYOUT")} />,
    );
    expect(
      screen.getByRole("button", { name: /Lưu quyết định/i }),
    ).toBeDisabled();
  });

  it("giải thích blockedReasons bằng tiếng Việt thay vì mã lỗi", () => {
    const inc = makeIncident(["SAVE_DECISION"], "AWAITING_RESPONSE");
    inc.decision.blockedReasons = ["WAITING_FOR_TASKER_RESPONSE"];
    render(<DecisionPanel incident={inc} />);
    expect(
      screen.getByText(/Đang trong thời hạn Tasker phản biện/i),
    ).toBeInTheDocument();
  });
});
