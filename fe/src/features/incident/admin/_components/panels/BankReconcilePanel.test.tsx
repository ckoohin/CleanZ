import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BankReconcilePanel } from "./BankReconcilePanel";

const { matchMutate, unmatchMutate, matchedData, suggestionData } = vi.hoisted(
  () => ({
    matchMutate: vi.fn(),
    unmatchMutate: vi.fn(),
    matchedData: { current: [] as unknown[] },
    suggestionData: { current: [] as unknown[] },
  }),
);

vi.mock("@/features/admin/modules/reconciliation/bank-statement", () => ({
  useIncidentBankEntries: () => ({ data: matchedData.current }),
  useBankSuggestions: () => ({ data: suggestionData.current }),
  useMatchBankEntry: () => ({ mutate: matchMutate, isPending: false }),
  useUnmatchBankEntry: () => ({ mutate: unmatchMutate, isPending: false }),
}));

const entry = (over: Record<string, unknown> = {}) => ({
  id: "e1",
  bankRef: "FT-A",
  txnAt: "2026-08-20T03:00:00.000Z",
  direction: "DEBIT",
  amount: 1_000_000,
  counterpartyAccount: "0123",
  counterpartyName: "Khach Hang",
  description: "CLEANZ BOI THUONG IC-1",
  status: "MATCHED",
  note: null,
  matchedIncident: { id: "i1", incidentCode: "IC-1" },
  matchedAt: "2026-08-20T04:00:00.000Z",
  ...over,
});

describe("BankReconcilePanel", () => {
  beforeEach(() => {
    matchedData.current = [];
    suggestionData.current = [];
    matchMutate.mockClear();
    unmatchMutate.mockClear();
  });

  it("nói rõ khoản chi mới chỉ có lời khai khi chưa đối chiếu dòng nào", () => {
    render(<BankReconcilePanel incidentId="i1" declaredOutflow={1_000_000} />);
    expect(
      screen.getByText(/mới chỉ có lời khai của admin/),
    ).toBeInTheDocument();
  });

  it("báo đã được ngân hàng xác nhận khi tổng khớp đúng số đã khai", () => {
    matchedData.current = [entry()];
    render(<BankReconcilePanel incidentId="i1" declaredOutflow={1_000_000} />);
    expect(screen.getByText(/Ngân hàng đã xác nhận đủ/)).toBeInTheDocument();
  });

  it("chỉ ra phần lệch khi tổng sao kê khác số đã khai", () => {
    matchedData.current = [
      entry(),
      entry({ id: "e2", bankRef: "FT-B", amount: 300_000 }),
    ];
    render(<BankReconcilePanel incidentId="i1" declaredOutflow={1_000_000} />);
    expect(screen.getByText(/lệch/)).toBeInTheDocument();
    expect(screen.getByText("+300.000đ")).toBeInTheDocument();
  });

  it("hiện lý do của từng gợi ý thay vì bắt tin một thứ hạng vô danh", () => {
    suggestionData.current = [
      {
        ...entry({ id: "s1", status: "UNMATCHED", matchedIncident: null }),
        reasons: [
          "Nội dung có mã sự cố IC-1",
          "Số tiền khớp đúng khoản đã chi",
        ],
        score: 150,
      },
    ];
    render(<BankReconcilePanel incidentId="i1" declaredOutflow={1_000_000} />);
    expect(screen.getByText("Nội dung có mã sự cố IC-1")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /Đây đúng là khoản đã chuyển/i }),
    );
    expect(matchMutate).toHaveBeenCalledWith({
      entryId: "s1",
      incidentId: "i1",
    });
  });

  it("bắt buộc lý do đủ dài trước khi gỡ đối chiếu", () => {
    matchedData.current = [entry()];
    const c = render(
      <BankReconcilePanel incidentId="i1" declaredOutflow={1_000_000} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Gỡ đối chiếu/i }));
    const confirm = screen.getByRole("button", { name: /Xác nhận gỡ/i });
    expect(confirm).toBeDisabled();

    fireEvent.change(
      c.container.querySelector("textarea") as HTMLTextAreaElement,
      {
        target: { value: "Gắn nhầm dòng của khoản chi khác" },
      },
    );
    expect(
      screen.getByRole("button", { name: /Xác nhận gỡ/i }),
    ).not.toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /Xác nhận gỡ/i }));
    expect(unmatchMutate).toHaveBeenCalledWith(
      { entryId: "e1", reason: "Gắn nhầm dòng của khoản chi khác" },
      expect.anything(),
    );
  });
});
