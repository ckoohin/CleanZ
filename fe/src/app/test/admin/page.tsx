'use client';

import { useEffect, useState } from 'react';
import { X, Hammer } from 'lucide-react';
import { Sidebar, SidebarContent } from '../_components/Sidebar';
import { Topbar } from '../_components/Topbar';
import { CustomerManagement } from '../_components/CustomerManagement';
import { navGroups } from '../_lib/nav';

const SCOPED_CSS = `
.cz-admin{
  --sb-w:260px;
  --c-canvas:#F4F6F9;
  --c-card:#FFFFFF;
  --c-card-2:#F6F8FB;
  --c-ink:#0F1B33;
  --c-ink-soft:#51607A;
  --c-muted:#8A95A8;
  --c-line:#ECEEF3;
  --c-line-strong:#DFE3EC;
  --c-chip:#EEF1F6;
  --c-primary:#FFA000;
  --c-primary-strong:#B45309;
  --c-primary-soft:#FFF3E0;
  --c-hero:#FFF7EA;
  --c-sidebar:#FFFFFF;
  --c-topbar:rgba(255,255,255,0.82);
  --c-scroll:rgba(15,27,51,0.20);
  --c-scroll-hover:rgba(15,27,51,0.34);
}
.dark .cz-admin{
  --c-canvas:#0A0E16;
  --c-card:#111722;
  --c-card-2:#161D2A;
  --c-ink:#EAEEF6;
  --c-ink-soft:#AEB9CC;
  --c-muted:#6E7A92;
  --c-line:rgba(255,255,255,0.08);
  --c-line-strong:rgba(255,255,255,0.14);
  --c-chip:rgba(255,255,255,0.10);
  --c-primary:#FFB300;
  --c-primary-strong:#FFC24B;
  --c-primary-soft:rgba(255,179,0,0.14);
  --c-hero:#141A26;
  --c-sidebar:#0E131C;
  --c-topbar:rgba(10,14,22,0.82);
  --c-scroll:rgba(255,255,255,0.16);
  --c-scroll-hover:rgba(255,255,255,0.30);
}
@keyframes kos-rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.kos-rise{animation:kos-rise .5s cubic-bezier(.19,1,.22,1) both}
@keyframes kos-ping{75%,100%{transform:scale(2);opacity:0}}
.kos-ping{animation:kos-ping 1.7s cubic-bezier(0,0,.2,1) infinite}
@media (prefers-reduced-motion: reduce){
  .kos-rise{animation:none}
  .kos-ping{animation:none}
}
/* themed thin scrollbar (fixes the white default scrollbar in dark mode) */
.cz-scroll{ scrollbar-width: thin; scrollbar-color: var(--c-scroll) transparent; }
.cz-scroll::-webkit-scrollbar{ width: 8px; height: 8px; }
.cz-scroll::-webkit-scrollbar-track{ background: transparent; }
.cz-scroll::-webkit-scrollbar-thumb{ background-color: var(--c-scroll); border-radius: 9999px; border: 2px solid transparent; background-clip: padding-box; }
.cz-scroll::-webkit-scrollbar-thumb:hover{ background-color: var(--c-scroll-hover); }
/* sidebar width (for centering the floating bar within the content area) */
.cz-admin.cz-collapsed{ --sb-w:72px; }
/* floating bulk-action bar — fixed at bottom-center of the content area */
.cz-bulkbar{ position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%); z-index: 40; animation: cz-bar-in .22s ease-out both; transition: left .3s ease; }
@media (min-width: 1024px){ .cz-bulkbar{ left: calc(50% + var(--sb-w, 0px) / 2); } }
@keyframes cz-bar-in{ from{ opacity: 0; transform: translateX(-50%) translateY(14px); } to{ opacity: 1; transform: translateX(-50%) translateY(0); } }
@media (prefers-reduced-motion: reduce){ .cz-bulkbar{ animation: none; } }
`;

function titleFor(href: string): string {
  for (const g of navGroups) {
    for (const it of g.items) {
      if (it.href === href) return it.title;
      const ch = it.children?.find((c) => c.href === href);
      if (ch) return ch.title;
    }
  }
  return 'Trang';
}

function ComingSoon({ title }: { title: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-24 text-center"
      style={{ borderColor: 'var(--c-line-strong)' }}
    >
      <div className="grid size-14 place-items-center rounded-2xl" style={{ background: 'var(--c-primary-soft)', color: 'var(--c-primary-strong)' }}>
        <Hammer className="size-6" />
      </div>
      <h2 className="mt-4 font-sans text-[22px] font-bold tracking-tight text-[var(--c-ink)]">{title}</h2>
      <p className="mt-1 text-[13px] text-[var(--c-muted)]">Màn hình demo đang được xây dựng.</p>
    </div>
  );
}

export default function TestAdminPage() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [active, setActive] = useState('/admin');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- đọc class trên <html> chỉ có sau khi mount (SSR không có document)
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMobileOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    try {
      localStorage.setItem('theme', next);
    } catch {
      /* ignore */
    }
  };

  const navigate = (href: string) => {
    setActive(href);
    setMobileOpen(false);
  };

  return (
    <div
      className={`cz-admin flex h-screen w-full overflow-hidden font-sans${collapsed ? ' cz-collapsed' : ''}`}
      style={{ background: 'var(--c-canvas)', color: 'var(--c-ink)' }}
    >
      <style dangerouslySetInnerHTML={{ __html: SCOPED_CSS }} />

      <Sidebar active={active} collapsed={collapsed} onNavigate={navigate} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          active={active}
          theme={theme}
          onToggleTheme={toggleTheme}
          onToggleCollapse={() => setCollapsed((c) => !c)}
          onOpenMobile={() => setMobileOpen(true)}
        />
        <main className="cz-scroll flex-1 overflow-y-auto p-4 md:p-6">
          {active === '/admin/customers' ? (
            <CustomerManagement />
          ) : (
            <ComingSoon title={titleFor(active)} />
          )}
        </main>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-[#0B1020]/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} aria-hidden />
          <div className="absolute inset-y-0 left-0 w-[270px] border-r shadow-2xl" style={{ borderColor: 'var(--c-line)' }}>
            <SidebarContent active={active} collapsed={false} onNavigate={navigate} />
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
