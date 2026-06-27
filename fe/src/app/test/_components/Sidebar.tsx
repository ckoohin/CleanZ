'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import LogoApp from '@/components/logo/LogoApp';
import { navGroups, type NavItem } from '../_lib/nav';

function isItemActive(item: NavItem, active: string): boolean {
  if (item.href === active) return true;
  if (item.children?.some((c) => c.href === active)) return true;
  if (item.href !== '/admin' && active.startsWith(item.href + '/')) return true;
  return false;
}

function Badge({ value, urgent }: { value: number; urgent?: boolean }) {
  return (
    <span
      className={cn(
        'ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums',
        urgent ? 'text-white' : 'text-[var(--c-ink-soft)]'
      )}
      style={urgent ? { background: 'var(--c-primary)' } : { background: 'var(--c-chip)' }}
    >
      {value}
    </span>
  );
}

function NavRow({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  active: string;
  collapsed: boolean;
  onNavigate: (href: string) => void;
}) {
  const activeNow = isItemActive(item, active);
  const hasChildren = !!item.children?.length;
  const [open, setOpen] = useState(activeNow);
  const Icon = item.icon;

  return (
    <li>
      <a
        href={item.href}
        title={collapsed ? item.title : undefined}
        onClick={(e) => {
          e.preventDefault();
          onNavigate(item.href);
          if (hasChildren) setOpen((o) => !o);
        }}
        className={cn(
          'group relative flex items-center gap-3 rounded-xl py-2 text-[13.5px] transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-primary)]/40',
          collapsed ? 'justify-center px-0' : 'px-3',
          activeNow
            ? 'font-semibold text-[var(--c-primary-strong)]'
            : 'font-medium text-[var(--c-ink-soft)] hover:bg-[var(--c-card-2)] hover:text-[var(--c-ink)]'
        )}
        style={activeNow ? { background: 'var(--c-primary-soft)' } : undefined}
      >
        {/* subtle amber accent on the active item */}
        <span
          aria-hidden
          className={cn('absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full transition-opacity', activeNow ? 'opacity-100' : 'opacity-0')}
          style={{ background: 'var(--c-primary)' }}
        />
        <Icon className={cn('size-[18px] shrink-0', activeNow ? 'text-[var(--c-primary)]' : 'text-[var(--c-muted)] group-hover:text-[var(--c-ink)]')} />
        {!collapsed && <span className="truncate">{item.title}</span>}
        {!collapsed && item.badge ? <Badge value={item.badge} urgent={item.badgeUrgent} /> : null}
        {!collapsed && hasChildren ? (
          <ChevronRight className={cn('size-4 shrink-0 text-[var(--c-muted)] transition-transform duration-200', !item.badge && 'ml-auto', open && 'rotate-90')} />
        ) : null}
        {collapsed && item.badge ? (
          <span className="absolute right-2 top-1.5 size-1.5 rounded-full" style={{ background: 'var(--c-primary)' }} />
        ) : null}
      </a>

      {!collapsed && hasChildren && open ? (
        <ul className="mt-0.5 space-y-0.5 border-l border-[var(--c-line-strong)] pl-3 ml-[19px]">
          {item.children!.map((c) => {
            const childActive = active === c.href;
            return (
              <li key={c.href}>
                <a
                  href={c.href}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate(c.href);
                  }}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg py-1.5 pl-3 pr-2 text-[13px] transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-primary)]/40',
                    childActive ? 'font-semibold text-[var(--c-primary-strong)]' : 'text-[var(--c-ink-soft)] hover:bg-[var(--c-card-2)] hover:text-[var(--c-ink)]'
                  )}
                >
                  <span className="size-1.5 shrink-0 rounded-full" style={{ background: childActive ? 'var(--c-primary)' : 'var(--c-muted)' }} />
                  <span className="truncate">{c.title}</span>
                </a>
              </li>
            );
          })}
        </ul>
      ) : null}
    </li>
  );
}

export function SidebarContent({
  active,
  collapsed,
  onNavigate,
}: {
  active: string;
  collapsed: boolean;
  onNavigate: (href: string) => void;
}) {
  return (
    <div className="flex h-full flex-col" style={{ background: 'var(--c-sidebar)' }}>
      {/* Brand — CleanZ logo */}
      <div
        className={cn('flex h-16 items-center border-b px-4', collapsed ? 'justify-center px-0' : '')}
        style={{ borderColor: 'var(--c-line)' }}
      >
        {collapsed ? (
          <LogoApp href="/test" variant="icon-only" size="sm" />
        ) : (
          <LogoApp href="/test" size="md" textClassName="text-[var(--c-ink)]" />
        )}
      </div>

      {/* Nav */}
      <nav className="cz-scroll flex-1 overflow-y-auto px-3 py-4">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-5">
            {!collapsed ? (
              <div className="mb-1.5 px-3 text-[10.5px] font-semibold uppercase tracking-[0.13em] text-[var(--c-muted)]">{group.label}</div>
            ) : (
              <div className="mx-auto mb-2 h-px w-6" style={{ background: 'var(--c-line)' }} />
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <NavRow key={item.href} item={item} active={active} collapsed={collapsed} onNavigate={onNavigate} />
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="border-t p-3" style={{ borderColor: 'var(--c-line)' }}>
        <button
          className={cn(
            'flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-[var(--c-card-2)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-primary)]/40',
            collapsed && 'justify-center'
          )}
        >
          <span
            className="grid size-9 shrink-0 place-items-center rounded-full text-[13px] font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #FFB951 0%, #FF9800 100%)' }}
          >
            QT
          </span>
          {!collapsed && (
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-[13px] font-semibold text-[var(--c-ink)]">Quản trị viên</div>
              <div className="truncate text-[11.5px] text-[var(--c-muted)]">admin@cleanz.vn</div>
            </div>
          )}
          {!collapsed && <ChevronRight className="size-4 shrink-0 text-[var(--c-muted)]" />}
        </button>
      </div>
    </div>
  );
}

export function Sidebar({
  active,
  collapsed,
  onNavigate,
}: {
  active: string;
  collapsed: boolean;
  onNavigate: (href: string) => void;
}) {
  return (
    <aside className={cn('hidden shrink-0 transition-[width] duration-300 ease-in-out lg:block', collapsed ? 'w-[72px]' : 'w-[260px]')}>
      <div
        className="fixed inset-y-0 left-0 z-30 hidden border-r lg:block"
        style={{ width: collapsed ? 72 : 260, borderColor: 'var(--c-line)', transition: 'width 300ms ease-in-out' }}
      >
        <SidebarContent active={active} collapsed={collapsed} onNavigate={onNavigate} />
      </div>
    </aside>
  );
}
