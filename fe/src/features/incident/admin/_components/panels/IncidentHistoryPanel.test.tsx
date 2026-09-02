import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { IncidentHistoryPanel } from "./IncidentHistoryPanel";
import type { IncidentHistoryEntry } from "@/features/incident/shared/incident.types";

const { historyMock } = vi.hoisted(() => ({ historyMock: vi.fn() }));

vi.mock("../../hooks/useAdminIncident", () => ({
  useAdminIncidentHistory: (id: string, enabled: boolean) =>
    historyMock(id, enabled),
}));

function entry(over: Partial<IncidentHistoryEntry> = {}): IncidentHistoryEntry {
  return {
    id: "log-1",
    dimension: "STATUS",
    oldValue: "REPORTED",
    newValue: "REVIEWING",
    reason: "Admin tiếp nhận thẩm định — tạm giữ ví Tasker 900000 VND",
    changedByName: "Nguyễn Quản Trị",
    changedByRole: "ADMIN",
    actorType: "ADMIN",
    createdAt: "2026-07-04T09:00:00+07:00",
    ...over,
  };
}

function mockEntries(entries: IncidentHistoryEntry[]) {
  historyMock.mockReturnValue({ data: entries, isLoading: false });
}

/**
 * `incident_status_logs` được ghi ở mọi bước từ đầu nhưng không API nào đọc và không màn
 * hình nào hiện. Với module đã gỡ duyệt cấp hai, "mọi thao tác để lại vết xem được ngay
 * trên hồ sơ" chính là kiểm soát thay thế — nên nó phải đọc được, và phải đọc đúng.
 */
describe("IncidentHistoryPanel", () => {
  it("dịch mã trạng thái sang nhãn tiếng Việt, kèm người thao tác và lý do", () => {
    mockEntries([entry()]);
    render(<IncidentHistoryPanel incidentId="inc-1" enabled />);

    expect(screen.getByText(/Nguyễn Quản Trị/)).toBeInTheDocument();
    expect(screen.getByText(/tạm giữ ví Tasker/i)).toBeInTheDocument();
    // Không được hiện mã thô như "REPORTED" / "REVIEWING".
    expect(screen.queryByText("REVIEWING")).not.toBeInTheDocument();
  });

  it("phân biệt HỆ THỐNG tự chạy với KHÔNG RÕ AI — hai kết luận khác nhau", () => {
    mockEntries([
      entry({
        id: "log-sys",
        actorType: "SYSTEM",
        changedByName: null,
        newValue: "CLOSED",
        reason: "Tự đóng do quá hạn tiếp nhận (housekeeping)",
      }),
      entry({ id: "log-old", actorType: null, changedByName: null }),
    ]);
    render(<IncidentHistoryPanel incidentId="inc-1" enabled />);

    expect(screen.getByText(/Không có người thao tác/)).toBeInTheDocument();
    expect(screen.getByText(/Không rõ/)).toBeInTheDocument();
  });

  it("đánh dấu riêng các dòng thuộc trục dòng tiền", () => {
    mockEntries([
      entry({
        dimension: "COMPENSATION",
        oldValue: null,
        newValue: "DEBT_WRITTEN_OFF",
        reason: "Xoá nợ 250000 VND — lý do: không thu hồi được",
      }),
    ]);
    render(<IncidentHistoryPanel incidentId="inc-1" enabled />);

    expect(screen.getByText("Dòng tiền")).toBeInTheDocument();
    // Giá trị không có nhãn thì giữ nguyên văn, không bịa ra chữ đẹp hơn.
    expect(screen.getByText("DEBT_WRITTEN_OFF")).toBeInTheDocument();
  });

  it("không gọi API khi tab nhật ký chưa mở", () => {
    historyMock.mockClear();
    historyMock.mockReturnValue({ data: [], isLoading: false });
    render(<IncidentHistoryPanel incidentId="inc-1" enabled={false} />);

    expect(historyMock).toHaveBeenCalledWith("inc-1", false);
  });

  it("hồ sơ chưa có thao tác nào: nói rõ, không để khoảng trắng", () => {
    mockEntries([]);
    render(<IncidentHistoryPanel incidentId="inc-1" enabled />);

    expect(screen.getByText(/Chưa có thao tác nào/i)).toBeInTheDocument();
  });
});
