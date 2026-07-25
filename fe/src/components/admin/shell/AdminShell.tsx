"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Sidebar, SidebarContent } from "./Sidebar";
import { Topbar } from "./Topbar";

const COLLAPSE_KEY = "cz-admin-collapsed";

/**
 * The CleanZ admin shell — fixed sidebar + sticky topbar, only <main> scrolls
 * (internal-scroll model, design system §4). Carries the `cz-admin` class so the
 * `--c-*` tokens resolve for the whole subtree.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Restore collapsed preference.
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- đồng bộ state sau mount / khi mở form; giữ nguyên hành vi hiện tại
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const toggleCollapse = () =>
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });

  // Close mobile drawer on Escape.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  return (
    <div
      className={`cz-admin flex h-screen w-full overflow-hidden font-sans${collapsed ? " cz-collapsed" : ""}`}
      style={{ background: "var(--c-canvas)", color: "var(--c-ink)" }}
    >
      <Sidebar collapsed={collapsed} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onToggleCollapse={toggleCollapse} onOpenMobile={() => setMobileOpen(true)} />
        <main className="cz-scroll flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-[#0B1020]/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div
            className="absolute inset-y-0 left-0 w-[270px] border-r shadow-2xl"
            style={{ borderColor: "var(--c-line)" }}
          >
            <SidebarContent collapsed={false} onNavigate={() => setMobileOpen(false)} />
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Đóng"
              className="absolute right-3 top-5 grid size-8 place-items-center rounded-lg text-[var(--c-muted)] transition-colors hover:bg-[var(--c-card-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-primary)]/40"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
