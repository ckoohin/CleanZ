import { describe, it, expect } from "vitest";
import {
  canWithdraw,
  checkAllocation,
  isIntegerAmount,
} from "./incident.machine";

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

  it("chặn phần thập phân — backend chỉ nhận VND số nguyên (@IsInt)", () => {
    // Ô number của trình duyệt không chặn gõ tay "100000.5"; nếu form không
    // gác thì giá trị đi hết hành trình rồi mới bị backend trả 422.
    const r = checkAllocation(200000, 100000.5, 99999.5);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/số nguyên/i);
  });

  it("chặn thập phân kể cả khi tổng cộng lại vừa khớp", () => {
    expect(checkAllocation(0.3, 0.1, 0.2).ok).toBe(false);
  });
});

describe("incident.machine — isIntegerAmount", () => {
  it("nhận số nguyên không âm", () => {
    expect(isIntegerAmount(0)).toBe(true);
    expect(isIntegerAmount(200000)).toBe(true);
  });

  it("từ chối thập phân, số âm và giá trị không phải số", () => {
    expect(isIntegerAmount(100.5)).toBe(false);
    expect(isIntegerAmount(-1)).toBe(false);
    expect(isIntegerAmount(Number("abc"))).toBe(false);
  });
});
