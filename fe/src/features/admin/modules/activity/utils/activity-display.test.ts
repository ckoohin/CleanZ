import { describe, it, expect } from "vitest";
import {
  getActivityBusinessRows,
  getActivityChangeRows,
} from "./activity-display";
import type { AdminActivityItem } from "../types/activity.types";

const activity = (over: Partial<AdminActivityItem>): AdminActivityItem =>
  ({
    id: "a1",
    actor: "Admin",
    actorEmail: "admin@test.local",
    role: "ADMIN",
    action: "Chi trả bồi thường qua ví",
    actionCode: "INCIDENT.COMPENSATE",
    severity: "CRITICAL",
    reason: null,
    correlationId: null,
    resource: "sự cố",
    targetLabel: "IC-1",
    targetType: "INCIDENT",
    affectedCount: null,
    businessData: null,
    changes: null,
    status: "SUCCESS",
    errorMessage: null,
    timestamp: "2026-08-20T03:00:00.000Z",
    ...over,
  }) as AdminActivityItem;

describe("getActivityBusinessRows — Việt hoá khối số liệu nghiệp vụ", () => {
  it("dịch tên trường thay vì phơi khoá kỹ thuật", () => {
    const rows = getActivityBusinessRows(
      activity({
        businessData: {
          approvedAmount: 1_200_000,
          taskerBorneAmount: 800_000,
          uncoveredLiability: 200_000,
        },
      }),
    );

    expect(rows.map((r) => r.label)).toEqual([
      "Số tiền duyệt bồi thường",
      "Phần Tasker chịu",
      "Phần Tasker chưa trả nổi (quỹ ứng)",
    ]);
  });

  it("định dạng tiền theo kiểu Việt Nam, kể cả khi numeric về dạng chuỗi", () => {
    const rows = getActivityBusinessRows(
      activity({
        businessData: { approvedAmount: 1_200_000, lossAmount: "300000.00" },
      }),
    );
    expect(rows[0].value).toBe("1.200.000 ₫");
    // Cột numeric của Postgres về FE là chuỗi — không ép số thì hiện "300000.00".
    expect(rows[1].value).toBe("300.000 ₫");
  });

  it("không gắn đuôi tiền cho trường đếm", () => {
    const rows = getActivityBusinessRows(
      activity({
        businessData: { parsed: 1200, newDecisionVersion: 2 },
      }),
    );
    expect(rows[0].value).toBe("1.200");
    expect(rows[1].value).toBe("2");
  });

  it("dịch giá trị enum nghiệp vụ", () => {
    const rows = getActivityBusinessRows(
      activity({ businessData: { compensationSource: "MIXED" } }),
    );
    expect(rows[0].value).toBe("Cả Tasker và quỹ nền tảng");
  });

  it("nói rõ khi backend đã ẩn mã nội bộ, và khi trường rỗng", () => {
    const rows = getActivityBusinessRows(
      activity({
        businessData: {
          incidentId: "[REFERENCE]",
          proofEvidenceId: null,
          hasTransferProof: true,
        },
      }),
    );
    expect(rows[0].value).toBe("Mã nội bộ (đã ẩn)");
    expect(rows[1].value).toBe("—");
    expect(rows[2].value).toBe("Có");
  });

  it("trả mảng rỗng khi log không có số liệu nghiệp vụ", () => {
    expect(getActivityBusinessRows(activity({ businessData: null }))).toEqual(
      [],
    );
  });
});

describe("getActivityChangeRows — dùng chung từ điển nghiệp vụ", () => {
  it("gọi tên trường giống hệt khối số liệu nghiệp vụ", () => {
    const rows = getActivityChangeRows(
      activity({
        changes: {
          fields: {
            deliveredAmount: { before: 0, after: 1_000_000 },
          },
        },
      }),
    );
    // Cùng một trường phải cùng một tên ở mọi khối, nếu không người đọc tưởng đây là
    // hai số liệu khác nhau.
    expect(rows[0].label).toBe("Khách thực nhận");
  });
});
