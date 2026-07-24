import { describe, expect, it } from "vitest";
import { getEarliestAvailableSchedule } from "./booking-schedule-time";

describe("getEarliestAvailableSchedule", () => {
  it("chọn mốc 15 phút gần nhất sau ít nhất 1 giờ", () => {
    const result = getEarliestAvailableSchedule(
      new Date("2026-07-24T18:07:00+07:00"),
    );

    expect(result).toEqual({
      scheduledDate: "2026-07-24",
      scheduledTime: "19:15",
    });
  });

  it("không làm tròn xuống nếu mốc 1 giờ vẫn còn giây lẻ", () => {
    const result = getEarliestAvailableSchedule(
      new Date("2026-07-24T18:00:30+07:00"),
    );

    expect(result.scheduledTime).toBe("19:15");
  });

  it("chuyển sang ngày kế tiếp khi hôm nay không còn đủ 1 giờ", () => {
    const result = getEarliestAvailableSchedule(
      new Date("2026-07-24T23:30:00+07:00"),
    );

    expect(result).toEqual({
      scheduledDate: "2026-07-25",
      scheduledTime: "00:30",
    });
  });
});
