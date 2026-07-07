import { describe, it, expect } from "vitest";
import {
  STATUS_TRANSITIONS,
  canWithdraw,
  checkAllocation,
} from "./incident.machine";

describe("incident.machine — STATUS_TRANSITIONS", () => {
  it("cho phép các chuyển hợp lệ theo vòng đời", () => {
    expect(STATUS_TRANSITIONS.REPORTED).toContain("INVESTIGATING");
    expect(STATUS_TRANSITIONS.INVESTIGATING).toEqual(
      expect.arrayContaining(["APPROVED", "REJECTED", "CLOSED"]),
    );
    expect(STATUS_TRANSITIONS.APPROVED).toEqual(["COMPENSATED"]);
  });

  it("CLOSED là terminal (không đi đâu)", () => {
    expect(STATUS_TRANSITIONS.CLOSED).toEqual([]);
  });

  it("không cho REPORTED nhảy thẳng APPROVED", () => {
    expect(STATUS_TRANSITIONS.REPORTED).not.toContain("APPROVED");
  });
});

describe("incident.machine — canWithdraw", () => {
  it("cho rút khi REPORTED/INVESTIGATING và chưa động tới tiền (comp=NONE)", () => {
    expect(canWithdraw("REPORTED", "NONE")).toBe(true);
    expect(canWithdraw("INVESTIGATING", "NONE")).toBe(true);
  });

  it("chặn rút khi đã bắt đầu xử lý bồi thường", () => {
    expect(canWithdraw("INVESTIGATING", "PENDING")).toBe(false);
    expect(canWithdraw("INVESTIGATING", "RECORDED")).toBe(false);
  });

  it("chặn rút ở trạng thái cuối", () => {
    expect(canWithdraw("APPROVED", "NONE")).toBe(false);
    expect(canWithdraw("CLOSED", "NONE")).toBe(false);
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
