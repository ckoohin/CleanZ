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
    useSaveDecisionDraft: hook,
    useSubmitDecisionDraft: hook,
    useReviewDecisionResponse: hook,
    useReviseDecision: hook,
    useExtendTaskerResponse: hook,
    useFinalizeDecision: hook,
    useSecondApproval: hook,
  };
});

function makeIncident(
  allowedActions: IncidentDecisionAction[],
  status = "PENDING_TASKER_RESPONSE",
): IncidentAdminView {
  return {
    id: "inc-1",
    damageItems: [
      {
        id: "item-1",
        description: "Vỡ kính",
        claimedAmount: 300000,
        verifiedAmount: 240000,
        approvedAmount: 200000,
        verificationStatus: "VERIFIED",
      },
    ],
    approvedAmount: 200000,
    taskerBorneAmount: 100000,
    platformBorneAmount: 100000,
    allocationReason: "50/50",
    decisionResponses: [],
    decision: {
      version: 1,
      status,
      responseWindowStatus: "OPEN",
      taskerResponseDeadline: null,
      responsibilityParty: "SHARED",
      responsibilityReason: "Hai bên cùng có lỗi nên chia sẻ trách nhiệm",
      taskerDecisionReason: "tasker chịu",
      customerDecisionSummary: "tóm tắt cho khách",
      internalDecisionNote: "note nội bộ",
      allowedActions,
      blockedReasons: [],
      policyVersion: null,
      policyCapSnapshot: null,
      dualApprovalThresholdSnapshot: null,
      responseWindowHoursSnapshot: null,
      finalizedAt: null,
      secondApprovedAt: null,
    },
  } as unknown as IncidentAdminView;
}

describe("DecisionPanel — gating theo allowedActions (BE-driven)", () => {
  it("bật nút Gửi cho Tasker khi allowedActions có SUBMIT_DRAFT (regression: trước dùng sai key)", () => {
    render(<DecisionPanel incident={makeIncident(["SAVE_DRAFT", "SUBMIT_DRAFT"], "DRAFT")} />);
    const submit = screen.getByRole("button", { name: /Gửi cho Tasker/i });
    expect(submit).toBeEnabled();
  });

  it("tắt nút Gửi cho Tasker khi allowedActions KHÔNG có SUBMIT_DRAFT", () => {
    render(<DecisionPanel incident={makeIncident(["RESPOND"])} />);
    const submit = screen.getByRole("button", { name: /Gửi cho Tasker/i });
    expect(submit).toBeDisabled();
  });

  it("hiện khối Sửa lại khi allowedActions có REVISE_DECISION", () => {
    render(<DecisionPanel incident={makeIncident(["REVISE_DECISION", "RESPOND"])} />);
    expect(
      screen.getByRole("button", { name: /Sửa .* tạo phiên bản mới/i }),
    ).toBeInTheDocument();
  });

  it("ẩn khối Sửa lại khi không có REVISE_DECISION", () => {
    render(<DecisionPanel incident={makeIncident(["SAVE_DRAFT", "SUBMIT_DRAFT"], "DRAFT")} />);
    expect(
      screen.queryByRole("button", { name: /Sửa .* tạo phiên bản mới/i }),
    ).not.toBeInTheDocument();
  });

  it("bật nút Chốt quyết định khi allowedActions có FINALIZE", () => {
    render(<DecisionPanel incident={makeIncident(["FINALIZE"])} />);
    expect(
      screen.getByRole("button", { name: /Chốt quyết định/i }),
    ).toBeEnabled();
  });

  it("bật nút Lưu nháp khi allowedActions có SAVE_DRAFT", () => {
    render(<DecisionPanel incident={makeIncident(["SAVE_DRAFT", "SUBMIT_DRAFT"], "DRAFT")} />);
    expect(screen.getByRole("button", { name: /Lưu nháp/i })).toBeEnabled();
  });

  it("tắt nút Lưu nháp khi decision đã FINAL (không lọt 409 trên sự cố đã đóng)", () => {
    render(<DecisionPanel incident={makeIncident(["COMPENSATE"], "FINAL")} />);
    expect(screen.getByRole("button", { name: /Lưu nháp/i })).toBeDisabled();
  });
});
