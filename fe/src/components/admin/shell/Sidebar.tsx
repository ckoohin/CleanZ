"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import LogoApp from "@/components/logo/LogoApp";
import { ROUTES } from "@/constants/routes";
import { navGroups, isItemActive, type NavItem } from "./nav.config";
import { AdminUserMenu, useAdminUser } from "./AdminUserMenu";
import { AdminAvatar } from "@/components/admin/ui/AdminAvatar";

function Badge({ value, urgent }: { value: number; urgent?: boolean }) {
  return (
    <span
      className={cn(
        "ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums",
        urgent ? "text-white" : "text-[var(--c-ink-soft)]"
      )}
      style={urgent ? { background: "var(--c-primary)" } : { background: "var(--c-chip)" }}
    >
      {value}
    </span>
  );
}

function NavRow({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const activeNow = isItemActive(item, pathname);
  const hasChildren = !!item.children?.length;
  const [open, setOpen] = useState(activeNow);
  const Icon = item.icon;

  // Auto-expand the section the user navigates into.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (activeNow) setOpen(true);
  }, [activeNow]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <li>
      <div
        className={cn(
          "group relative flex items-center rounded-xl transition-colors",
          activeNow
            ? "text-[var(--c-primary-strong)]"
            : "text-[var(--c-ink-soft)] hover:bg-[var(--c-card-2)] hover:text-[var(--c-ink)]"
        )}
        style={activeNow ? { background: "var(--c-primary-soft)" } : undefined}
      >
        {/* amber accent on the active item */}
        <span
          aria-hidden
          className={cn(
            "absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full transition-opacity",
            activeNow ? "opacity-100" : "opacity-0"
          )}
          style={{ background: "var(--c-primary)" }}
        />
        <Link
          href={item.href}
          title={collapsed ? item.title : undefined}
          onClick={(e) => {
            if (hasChildren && !collapsed) {
              setOpen((o) => !o);
            }
            onNavigate?.();
          }}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-3 py-2 text-[13.5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-primary)]/40 rounded-xl",
            collapsed ? "justify-center px-0" : "px-3",
            activeNow ? "font-semibold" : "font-medium"
          )}
        >
          <Icon
            className={cn(
              "size-[18px] shrink-0",
              activeNow ? "text-[var(--c-primary)]" : "text-[var(--c-muted)] group-hover:text-[var(--c-ink)]"
            )}
          />
          {!collapsed && <span className="truncate">{item.title}</span>}
          {!collapsed && item.badge ? <Badge value={item.badge} urgent={item.badgeUrgent} /> : null}
          {collapsed && item.badge ? (
            <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full" style={{ background: "var(--c-primary)" }} />
          ) : null}
        </Link>
        {!collapsed && hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Thu gọn" : "Mở rộng"}
            className="mr-1.5 grid size-6 shrink-0 place-items-center rounded-md text-[var(--c-muted)] transition-colors hover:bg-[var(--c-card-2)] hover:text-[var(--c-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-primary)]/40"
          >
            <ChevronRight className={cn("size-4 transition-transform duration-200", open && "rotate-90")} />
          </button>
        ) : null}
      </div>

      {!collapsed && hasChildren && open ? (
        <ul className="ml-[19px] mt-0.5 space-y-0.5 border-l border-[var(--c-line-strong)] pl-3">
          {item.children!.map((c) => {
            const childActive = pathname === c.href;
            return (
              <li key={c.href || c.title}>
                <Link
                  href={c.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg py-1.5 pl-3 pr-2 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-primary)]/40",
                    childActive
                      ? "font-semibold text-[var(--c-primary-strong)]"
                      : "text-[var(--c-ink-soft)] hover:bg-[var(--c-card-2)] hover:text-[var(--c-ink)]"
                  )}
                >
                  <span
                    className="size-1.5 shrink-0 rounded-full"
                    style={{ background: childActive ? "var(--c-primary)" : "var(--c-muted)" }}
                  />
                  <span className="truncate">{c.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </li>
  );
}

export function SidebarContent({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const { user } = useAdminUser();

  return (
    <div className="flex h-full flex-col" style={{ background: "var(--c-sidebar)" }}>
      {/* Brand */}
      <div
        className={cn("flex h-16 items-center border-b px-4", collapsed && "justify-center px-0")}
        style={{ borderColor: "var(--c-line)" }}
      >
        {collapsed ? (
          <LogoApp href={ROUTES.ADMIN.DASHBOARD} variant="icon-only" size="sm" />
        ) : (
          <LogoApp href={ROUTES.ADMIN.DASHBOARD} size="md" textClassName="text-[var(--c-ink)]" />
        )}
      </div>

      {/* Nav */}
      <nav className="cz-scroll flex-1 overflow-y-auto px-3 py-4">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-5">
            {!collapsed ? (
              <div className="mb-1.5 px-3 text-[10.5px] font-semibold uppercase tracking-[0.13em] text-[var(--c-muted)]">
                {group.label}
              </div>
            ) : (
              <div className="mx-auto mb-2 h-px w-6" style={{ background: "var(--c-line)" }} />
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <NavRow key={item.href || item.title} item={item} collapsed={collapsed} onNavigate={onNavigate} />
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="border-t p-3" style={{ borderColor: "var(--c-line)" }}>
        <AdminUserMenu
          side="top"
          align="start"
          trigger={
            <button
              className={cn(
                "flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-[var(--c-card-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-primary)]/40",
                collapsed && "justify-center"
              )}
            >
              <AdminAvatar initials={user?.initials ?? "QT"} src={user?.avatar} size="md" />
              {!collapsed && (
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="truncate text-[13px] font-semibold text-[var(--c-ink)]">
                    {user?.fullName ?? "Quản trị viên"}
                  </div>
                  <div className="truncate text-[11.5px] text-[var(--c-muted)]">
                    {user?.email ?? ""}
                  </div>
                </div>
              )}
              {!collapsed && <ChevronRight className="size-4 shrink-0 text-[var(--c-muted)]" />}
            </button>
          }
        />
      </div>
    </div>
  );
}

export function Sidebar({ collapsed }: { collapsed: boolean }) {
  return (
    <aside
      className={cn(
        "hidden shrink-0 transition-[width] duration-300 ease-in-out lg:block",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      <div
        className="fixed inset-y-0 left-0 z-30 hidden border-r lg:block"
        style={{
          width: collapsed ? 72 : 260,
          borderColor: "var(--c-line)",
          transition: "width 300ms ease-in-out",
        }}
      >
        <SidebarContent collapsed={collapsed} />
      </div>
    </aside>
  );
}
