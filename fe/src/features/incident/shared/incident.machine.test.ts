import { describe, it, expect } from "vitest";
import {
  STATUS_TRANSITIONS,
  canWithdraw,
  checkAllocation,
  requiresTaskerResponse,
} from "./incident.machine";

describe("incident.machine — STATUS_TRANSITIONS", () => {
  it("cho phép các chuyển hợp lệ theo vòng đời", () => {
    expect(STATUS_TRANSITIONS.REPORTED).toContain("REVIEWING");
    expect(STATUS_TRANSITIONS.REVIEWING).toEqual(
      expect.arrayContaining([
        "AWAITING_RESPONSE",
        "AWAITING_PAYOUT",
        "REJECTED",
        "CLOSED",
      ]),
    );
    expect(STATUS_TRANSITIONS.AWAITING_PAYOUT).toContain("COMPENSATED");
  });

  it("CLOSED là terminal (không đi đâu)", () => {
    expect(STATUS_TRANSITIONS.CLOSED).toEqual([]);
  });

  it("không cho REPORTED nhảy thẳng sang chờ chi trả", () => {
    expect(STATUS_TRANSITIONS.REPORTED).not.toContain("AWAITING_PAYOUT");
  });

  it("đảo bồi thường được khai báo tường minh (COMPENSATED → REVIEWING)", () => {
    expect(STATUS_TRANSITIONS.COMPENSATED).toContain("REVIEWING");
  });
});

describe("incident.machine — canWithdraw", () => {
  it("cho rút khi chưa gửi quyết định cho Tasker", () => {
    expect(canWithdraw("REPORTED")).toBe(true);
    expect(canWithdraw("REVIEWING")).toBe(true);
  });

  it("chặn rút từ khi quyết định đã gửi Tasker trở đi", () => {
    expect(canWithdraw("AWAITING_RESPONSE")).toBe(false);
    expect(canWithdraw("AWAITING_PAYOUT")).toBe(false);
    expect(canWithdraw("COMPENSATED")).toBe(false);
    expect(canWithdraw("CLOSED")).toBe(false);
  });
});

describe("incident.machine — checkAllocation (bất biến tasker+platform=Σapproved)", () => {
  it("hợp lệ khi tổng phân bổ khớp tổng duyệt", () => {
    expect(checkAllocation(200000, 100000, 100000)).toEqual({ ok: true });
    expect(checkAllocation(200000, 200000, 0)).toEqual({ ok: true });
  });

  it("báo lỗi khi tổng phân bổ lệch", () => {
    const r = checkAllocation(200000, 100000, 50000);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/tổng phân bổ/i);
  });

  it("báo lỗi khi có số âm", () => {
    const r = checkAllocation(200000, -1, 200001);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/không hợp lệ/i);
  });
});

describe("incident.machine — requiresTaskerResponse", () => {
  it("Tasker chịu tiền thì bắt buộc cho phản biện", () => {
    expect(requiresTaskerResponse(1)).toBe(true);
  });

  it("Tasker không chịu tiền thì chốt thẳng", () => {
    expect(requiresTaskerResponse(0)).toBe(false);
  });
});
