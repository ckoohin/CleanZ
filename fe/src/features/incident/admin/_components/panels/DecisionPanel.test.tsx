import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { DecisionPanel } from "./DecisionPanel";
import type {
  IncidentAdminView,
  IncidentDecisionAction,
} from "@/features/incident/shared/incident.types";

const finalizeMutate = vi.fn();

vi.mock("../../hooks/useAdminIncident", () => {
  const hook = () => ({ mutate: vi.fn(), isPending: false });
  return {
    useSaveDecision: hook,
    useSendDecisionToTasker: hook,
    useFinalizeDecision: () => ({ mutate: finalizeMutate, isPending: false }),
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
      <DecisionPanel
        incident={makeIncident(["COMPENSATE"], "AWAITING_PAYOUT")}
      />,
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
      screen.getByText(/Đang trong thời hạn Tasker phản hồi/i),
    ).toBeInTheDocument();
  });
});

/**
 * "Gửi Tasker" và "Chốt" tác động lên bản quyết định ĐÃ LƯU. Nếu form còn khác
 * bản đã lưu mà hai nút vẫn bấm được, Admin sẽ chốt một con số khác con số họ
 * đang nhìn thấy — sai mà không có dấu hiệu nào báo.
 */
describe("DecisionPanel — chặn hành động khi form còn thay đổi chưa lưu", () => {
  it("tắt nút Chốt và cảnh báo khi vừa sửa số tiền duyệt", () => {
    render(
      <DecisionPanel incident={makeIncident(["SAVE_DECISION", "FINALIZE"])} />,
    );
    expect(
      screen.getByRole("button", { name: /Chốt quyết định/i }),
    ).toBeEnabled();

    fireEvent.change(screen.getByDisplayValue("200000"), {
      target: { value: "150000" },
    });

    expect(
      screen.getByRole("button", { name: /Chốt quyết định/i }),
    ).toBeDisabled();
    expect(screen.getByText(/Còn thay đổi chưa lưu/i)).toBeInTheDocument();
  });

  it("tắt nút Gửi Tasker khi form còn thay đổi chưa lưu", () => {
    render(
      <DecisionPanel
        incident={makeIncident(["SAVE_DECISION", "SEND_TO_TASKER"])}
      />,
    );
    fireEvent.change(screen.getByDisplayValue("200000"), {
      target: { value: "150000" },
    });

    expect(
      screen.getByRole("button", { name: /Gửi cho Tasker/i }),
    ).toBeDisabled();
  });
});

/**
 * Cảnh báo dưới ô nhập và cổng chặn nút Lưu phải dùng chung một vị từ. Tách đôi
 * thì ô báo đỏ mà nút vẫn bấm được, và lỗi chỉ lộ ra khi BE trả 422.
 */
describe("DecisionPanel — số tiền duyệt không hợp lệ thì chặn luôn nút Lưu", () => {
  const amountInput = () => screen.getByDisplayValue("200000");

  it("chặn khi nhập số lẻ", () => {
    render(<DecisionPanel incident={makeIncident(["SAVE_DECISION"])} />);
    fireEvent.change(amountInput(), { target: { value: "150000.5" } });

    expect(
      screen.getByRole("button", { name: /Lưu quyết định/i }),
    ).toBeDisabled();
    expect(screen.getByText(/Phải là số nguyên từ 1 đến/i)).toBeInTheDocument();
  });

  it("chặn khi nhập số âm", () => {
    render(<DecisionPanel incident={makeIncident(["SAVE_DECISION"])} />);
    fireEvent.change(amountInput(), { target: { value: "-5" } });

    expect(
      screen.getByRole("button", { name: /Lưu quyết định/i }),
    ).toBeDisabled();
  });

  it("chặn khi phân bổ Tasker/Quỹ có phần thập phân", () => {
    // Backend khai `@IsInt()` cho taskerBorneAmount/platformBorneAmount. Ô
    // number không chặn gõ tay "100000.5", nên form phải tự gác.
    render(<DecisionPanel incident={makeIncident(["SAVE_DECISION"])} />);
    // Hai ô phân bổ cùng giá trị 100000; đổi ô đầu là đủ để vi phạm.
    fireEvent.change(screen.getAllByDisplayValue("100000")[0], {
      target: { value: "100000.5" },
    });

    expect(
      screen.getByRole("button", { name: /Lưu quyết định/i }),
    ).toBeDisabled();
    expect(screen.getByText(/số nguyên VND/i)).toBeInTheDocument();
  });

  it("chặn khi duyệt vượt số khách yêu cầu", () => {
    render(<DecisionPanel incident={makeIncident(["SAVE_DECISION"])} />);
    fireEvent.change(amountInput(), { target: { value: "400000" } });

    expect(
      screen.getByRole("button", { name: /Lưu quyết định/i }),
    ).toBeDisabled();
  });

  it("bỏ chặn khi sửa lại thành số nguyên khớp phân bổ", () => {
    render(<DecisionPanel incident={makeIncident(["SAVE_DECISION"])} />);
    fireEvent.change(amountInput(), { target: { value: "150000.5" } });
    expect(
      screen.getByRole("button", { name: /Lưu quyết định/i }),
    ).toBeDisabled();

    fireEvent.change(screen.getByDisplayValue("150000.5"), {
      target: { value: "200000" },
    });

    expect(
      screen.getByRole("button", { name: /Lưu quyết định/i }),
    ).toBeEnabled();
  });
});

/**
 * Chốt quyết định giờ đi qua hộp thoại xác nhận: nút ngoài chỉ MỞ hộp thoại, nút trong
 * mới thật sự gọi API. Hai nút cùng nhãn nên phải lấy nút nằm trong `alertdialog`.
 */
function confirmFinalize() {
  fireEvent.click(screen.getByRole("button", { name: /Chốt quyết định/i }));
  const dialog = screen.getByRole("alertdialog");
  fireEvent.click(
    within(dialog).getByRole("button", { name: /^Chốt quyết định$/i }),
  );
}

describe("DecisionPanel — cảnh cáo gian lận bám theo quyết định đã lưu", () => {
  it("không hiện ô đánh dấu gian lận khi bản đã lưu không phải Bác bỏ", () => {
    render(<DecisionPanel incident={makeIncident(["FINALIZE"])} />);

    fireEvent.click(screen.getByRole("button", { name: /Bác bỏ/i }));

    expect(
      screen.queryByLabelText(/báo cáo sai sự thật/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Đánh dấu báo cáo sai sự thật/i),
    ).not.toBeInTheDocument();
  });

  it("gửi rejectAsFraud khi bản đã lưu là Bác bỏ và Admin tích chọn", () => {
    finalizeMutate.mockClear();
    const inc = makeIncident(["FINALIZE"]);
    inc.decision.outcome = "REJECT";
    render(<DecisionPanel incident={inc} />);

    fireEvent.click(screen.getByRole("checkbox"));
    confirmFinalize();

    expect(finalizeMutate).toHaveBeenCalledWith(
      { expectedDecisionVersion: 1, rejectAsFraud: true },
      expect.anything(),
    );
  });

  it("không gửi rejectAsFraud khi bản đã lưu là Bồi thường", () => {
    finalizeMutate.mockClear();
    render(<DecisionPanel incident={makeIncident(["FINALIZE"])} />);

    confirmFinalize();

    expect(finalizeMutate).toHaveBeenCalledWith(
      { expectedDecisionVersion: 1 },
      expect.anything(),
    );
  });
});

/**
 * Chốt quyết định sinh nghĩa vụ tiền và là điểm không quay lại rẻ: sau đó `saveDecision`
 * bị khoá, muốn sửa phải thu hồi quyết định. Một cú bấm nhầm tốn nhiều thao tác hơn hẳn
 * một hộp thoại — nên nút không được gọi API ngay.
 */
describe("DecisionPanel — xác nhận trước khi chốt", () => {
  it("bấm nút chỉ mở hộp thoại, chưa gọi API", () => {
    finalizeMutate.mockClear();
    render(<DecisionPanel incident={makeIncident(["FINALIZE"])} />);

    fireEvent.click(screen.getByRole("button", { name: /Chốt quyết định/i }));

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(finalizeMutate).not.toHaveBeenCalled();
  });

  it("huỷ hộp thoại thì không chốt gì cả", () => {
    finalizeMutate.mockClear();
    render(<DecisionPanel incident={makeIncident(["FINALIZE"])} />);

    fireEvent.click(screen.getByRole("button", { name: /Chốt quyết định/i }));
    fireEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: /^Huỷ$/i,
      }),
    );

    expect(finalizeMutate).not.toHaveBeenCalled();
  });

  it("hộp thoại cảnh báo riêng khi kèm cảnh cáo gian lận", () => {
    const inc = makeIncident(["FINALIZE"]);
    inc.decision.outcome = "REJECT";
    render(<DecisionPanel incident={inc} />);

    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /Chốt quyết định/i }));

    expect(
      within(screen.getByRole("alertdialog")).getByText(
        /một cảnh cáo gian lận/i,
      ),
    ).toBeInTheDocument();
  });
});

/**
 * "Chấp nhận hạng mục nhưng duyệt 0đ" là kết luận tự mâu thuẫn — khách đọc hạng mục ghi
 * "Đã xác minh" rồi thấy 0đ sẽ không hiểu mình được công nhận hay bị từ chối. Backend đã
 * chặn (INVALID_APPROVED_AMOUNT); form phải chặn trước để không ăn 422 sau khi soạn xong.
 */
describe("DecisionPanel — chấp nhận thì phải duyệt > 0", () => {
  it("chặn nút Lưu khi hạng mục được chấp nhận nhưng duyệt 0đ", () => {
    render(<DecisionPanel incident={makeIncident(["SAVE_DECISION"])} />);
    fireEvent.change(screen.getByDisplayValue("200000"), {
      target: { value: "0" },
    });

    expect(
      screen.getByRole("button", { name: /Lưu quyết định/i }),
    ).toBeDisabled();
    expect(
      screen.getByText(/không đền thì chọn "Từ chối"/i),
    ).toBeInTheDocument();
  });

  it("chọn Từ chối thì 0đ là hợp lệ, không còn báo lỗi", () => {
    render(<DecisionPanel incident={makeIncident(["SAVE_DECISION"])} />);
    fireEvent.change(screen.getAllByRole("combobox")[0], {
      target: { value: "REJECTED" },
    });

    expect(
      screen.queryByText(/không đền thì chọn "Từ chối"/i),
    ).not.toBeInTheDocument();
  });
});
