import { describe, expect, it } from "vitest";
import { ROUTES } from "@/constants/routes";
import { crumbsFor, isItemActive, navGroups } from "./nav.config";

describe("admin check-in navigation", () => {
  const checkinItem = navGroups
    .flatMap((group) => group.items)
    .find((item) => item.title === "Quản lý check-in");

  it("gộp ba màn hình vào một menu cha", () => {
    expect(checkinItem?.children).toEqual([
      { title: "Đơn hàng", href: ROUTES.ADMIN.BOOKINGS },
      { title: "Đối soát check-in", href: ROUTES.ADMIN.CHECKIN_REVIEWS },
      { title: "Khách hàng vắng mặt", href: ROUTES.ADMIN.ABSENCE_REPORTS },
    ]);
  });

  it.each([
    ROUTES.ADMIN.BOOKINGS,
    ROUTES.ADMIN.CHECKIN_REVIEWS,
    ROUTES.ADMIN.ABSENCE_REPORTS,
  ])("giữ menu cha active tại %s", (pathname) => {
    expect(checkinItem && isItemActive(checkinItem, pathname)).toBe(true);
  });

  it("giữ breadcrumb của từng màn hình con", () => {
    expect(crumbsFor(ROUTES.ADMIN.CHECKIN_REVIEWS)).toEqual([
      "Nghiệp vụ",
      "Quản lý check-in",
      "Đối soát check-in",
    ]);
    expect(crumbsFor(ROUTES.ADMIN.ABSENCE_REPORTS)).toEqual([
      "Nghiệp vụ",
      "Quản lý check-in",
      "Khách hàng vắng mặt",
    ]);
  });
});
