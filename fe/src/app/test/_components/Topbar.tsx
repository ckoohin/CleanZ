'use client';

import { PanelLeft, Menu, Search, Bell, Sun, Moon, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { navGroups } from '../_lib/nav';

function crumbsFor(active: string): string[] {
  for (const group of navGroups) {
    for (const item of group.items) {
      if (item.href === active) return [group.label, item.title];
      const child = item.children?.find((c) => c.href === active);
      if (child) return [group.label, item.title, child.title];
      if (item.href !== '/admin' && active.startsWith(item.href + '/')) return [group.label, item.title];
    }
  }
  return ['Tổng quan', 'Bảng điều khiển'];
}

export function Topbar({
  active,
  theme,
  onToggleTheme,
  onToggleCollapse,
  onOpenMobile,
}: {
  active: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onToggleCollapse: () => void;
  onOpenMobile: () => void;
}) {
  const crumbs = crumbsFor(active);

  return (
    <header
      className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b px-3 backdrop-blur-md sm:px-5"
      style={{ borderColor: 'var(--c-line)', background: 'var(--c-topbar)' }}
    >
      <button
        onClick={onToggleCollapse}
        aria-label="Thu gọn thanh điều hướng"
        className="hidden size-9 place-items-center rounded-lg text-[var(--c-ink-soft)] transition-colors hover:bg-[var(--c-card-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-primary)]/40 lg:grid"
      >
        <PanelLeft className="size-[18px]" />
      </button>
      <button
        onClick={onOpenMobile}
        aria-label="Mở thanh điều hướng"
        className="grid size-9 place-items-center rounded-lg text-[var(--c-ink-soft)] transition-colors hover:bg-[var(--c-card-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-primary)]/40 lg:hidden"
      >
        <Menu className="size-[18px]" />
      </button>

      <nav aria-label="Breadcrumb" className="hidden items-center gap-1.5 text-[13px] sm:flex">
        <span className="font-medium text-[var(--c-muted)]">CleanZ</span>
        {crumbs.map((c, i) => (
          <span key={c + i} className="flex items-center gap-1.5">
            <ChevronRight className="size-3.5 text-[var(--c-muted)]" />
            <span className={cn(i === crumbs.length - 1 ? 'font-semibold text-[var(--c-ink)]' : 'text-[var(--c-muted)]')}>{c}</span>
          </span>
        ))}
      </nav>

      <button
        className="ml-auto flex h-9 w-9 items-center gap-2 rounded-lg border px-0 text-[var(--c-muted)] transition-colors hover:border-[var(--c-primary)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-primary)]/40 md:ml-6 md:mr-auto md:w-72 md:px-3"
        style={{ borderColor: 'var(--c-line-strong)', background: 'var(--c-card-2)' }}
        aria-label="Tìm kiếm"
      >
        <Search className="mx-auto size-4 md:mx-0" />
        <span className="hidden text-[13px] md:inline">Tìm đơn, tasker, khách hàng…</span>
        <kbd className="ml-auto hidden items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[11px] font-medium md:inline-flex" style={{ borderColor: 'var(--c-line-strong)' }}>
          ⌘K
        </kbd>
      </button>

      <div className="flex items-center gap-1.5">
        <span
          className="hidden items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-semibold text-[var(--c-ink-soft)] xl:inline-flex"
          style={{ borderColor: 'var(--c-line-strong)', background: 'var(--c-card-2)' }}
        >
          <span className="relative flex size-2">
            <span className="kos-ping absolute inline-flex size-full rounded-full opacity-75" style={{ background: '#10B981' }} />
            <span className="relative inline-flex size-2 rounded-full" style={{ background: '#10B981' }} />
          </span>
          142 tasker trực tuyến
        </span>

        <button
          aria-label="Thông báo"
          className="relative grid size-9 place-items-center rounded-lg text-[var(--c-ink-soft)] transition-colors hover:bg-[var(--c-card-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-primary)]/40"
        >
          <Bell className="size-[18px]" />
          <span className="absolute right-2 top-2 size-2 rounded-full ring-2 ring-[color:var(--c-canvas)]" style={{ background: 'var(--c-primary)' }} />
        </button>

        <button
          onClick={onToggleTheme}
          aria-label="Đổi giao diện sáng/tối"
          className="grid size-9 place-items-center rounded-lg text-[var(--c-ink-soft)] transition-colors hover:bg-[var(--c-card-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-primary)]/40"
        >
          {theme === 'dark' ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
        </button>

        <button
          aria-label="Tài khoản"
          className="ml-1 grid size-9 shrink-0 place-items-center rounded-full text-[13px] font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-primary)]/40"
          style={{ background: 'linear-gradient(135deg, #FFB951 0%, #FF9800 100%)' }}
        >
          QT
        </button>
      </div>
    </header>
  );
}
