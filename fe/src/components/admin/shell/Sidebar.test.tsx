import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SidebarContent } from "./Sidebar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin",
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.ComponentProps<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/logo/LogoApp", () => ({
  default: () => <div data-testid="admin-logo" />,
}));

vi.mock("./AdminUserMenu", () => ({
  AdminUserMenu: ({ trigger }: { trigger: React.ReactNode }) => trigger,
  useAdminUser: () => ({ user: null }),
}));

vi.mock("@/components/admin/ui/AdminAvatar", () => ({
  AdminAvatar: () => <div data-testid="admin-avatar" />,
}));

describe("Admin Sidebar check-in menu", () => {
  it("cho phép mở và thu gọn ba mục quản lý check-in", () => {
    render(<SidebarContent collapsed={false} />);

    const parent = screen.getByRole("link", { name: "Quản lý check-in" });
    const row = parent.parentElement;
    expect(row).not.toBeNull();
    expect(
      screen.queryByRole("link", { name: "Đối soát check-in" }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      within(row as HTMLElement).getByRole("button", { name: "Mở rộng" }),
    );
    expect(
      screen.getByRole("link", { name: "Đối soát check-in" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Khách hàng vắng mặt" }),
    ).toBeInTheDocument();

    fireEvent.click(
      within(row as HTMLElement).getByRole("button", { name: "Thu gọn" }),
    );
    expect(
      screen.queryByRole("link", { name: "Đối soát check-in" }),
    ).not.toBeInTheDocument();
  });
});
