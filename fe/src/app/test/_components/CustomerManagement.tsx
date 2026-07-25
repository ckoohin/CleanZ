'use client';

import { useMemo, useState } from 'react';
import { toast } from '@/lib/toast';
import {
  Search,
  X,
  Plus,
  Download,
  MoreHorizontal,
  Eye,
  Pencil,
  Bell,
  Lock,
  Unlock,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Users,
  UserPlus,
  UserCheck,
  Gem,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatVnd } from '../_lib/mock';
import { customers, customerStats, STATUS_META, TIER_META, type Customer, type CustomerStatus } from '../_lib/customers';

const card = 'rounded-2xl border bg-[var(--c-card)] border-[var(--c-line)] shadow-[0_1px_2px_rgba(15,27,51,0.04),0_8px_24px_-14px_rgba(15,27,51,0.10)]';
const PAGE_SIZE = 10;

function StatCard({ icon: Icon, label, value, delta, tint }: { icon: LucideIcon; label: string; value: string; delta?: string; tint: string }) {
  return (
    <div className={cn(card, 'flex items-center gap-4 p-4')}>
      <span className="grid size-11 shrink-0 place-items-center rounded-xl" style={{ background: `${tint}1f`, color: tint }}>
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--c-muted)]">{label}</div>
        <div className="mt-0.5 flex items-baseline gap-2">
          <span className="text-[22px] font-bold leading-none text-[var(--c-ink)] tabular-nums">{value}</span>
          {delta && (
            <span className="inline-flex items-center gap-0.5 text-[12px] font-bold text-[#0E9F6E]">
              <TrendingUp className="size-3" />
              {delta}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function Avatar({ initials }: { initials: string }) {
  return (
    <span
      className="grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white"
      style={{ background: 'linear-gradient(135deg, #FFC774 0%, #FF9800 100%)' }}
    >
      {initials}
    </span>
  );
}

const STATUS_TABS: { key: 'all' | CustomerStatus; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'active', label: 'Hoạt động' },
  { key: 'new', label: 'Mới' },
  { key: 'locked', label: 'Đã khoá' },
];

export function CustomerManagement() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | CustomerStatus>('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const counts = useMemo(() => {
    const c = { all: customers.length, active: 0, new: 0, locked: 0 } as Record<string, number>;
    customers.forEach((x) => (c[x.status] += 1));
    return c;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers.filter((c) => {
      const matchStatus = status === 'all' || c.status === status;
      const matchQuery = !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.phone.replace(/\s/g, '').includes(q.replace(/\s/g, ''));
      return matchStatus && matchQuery;
    });
  }, [query, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const pageIds = pageItems.map((c) => c.id);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  const resetTo = (fn: () => void) => {
    fn();
    setPage(1);
  };

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const startIdx = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(safePage * PAGE_SIZE, filtered.length);

  return (
    <div className="space-y-5">
      {/* Floating bulk action bar — fixed, doesn't push the layout */}
      {selected.size > 0 && (
        <div
          className="cz-bulkbar flex items-center gap-1 rounded-2xl border p-1.5 pl-2 shadow-[0_16px_40px_-12px_rgba(15,27,51,0.4)]"
          style={{ borderColor: 'var(--c-line-strong)', background: 'var(--c-card)' }}
        >
          <span className="flex items-center gap-2 pr-1 text-[13px] font-semibold text-[var(--c-ink)]">
            <span className="grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #FFB951, #FF9800)' }}>
              {selected.size}
            </span>
            đã chọn
          </span>
          <span className="mx-1 h-6 w-px" style={{ background: 'var(--c-line)' }} />
          <button
            onClick={() => toast.success(`Đã gửi thông báo tới ${selected.size} khách hàng`)}
            className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[12.5px] font-semibold text-[var(--c-ink-soft)] transition-colors hover:bg-[var(--c-card-2)] hover:text-[var(--c-ink)]"
          >
            <Bell className="size-3.5" /> Gửi thông báo
          </button>
          <button
            onClick={() => toast.warning(`Đã khoá ${selected.size} khách hàng`)}
            className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[12.5px] font-semibold text-[#E11D48] transition-colors hover:bg-[#E11D48]/10"
          >
            <Lock className="size-3.5" /> Khoá
          </button>
          <span className="mx-1 h-6 w-px" style={{ background: 'var(--c-line)' }} />
          <button
            onClick={() => setSelected(new Set())}
            aria-label="Bỏ chọn"
            className="grid size-8 place-items-center rounded-xl text-[var(--c-muted)] transition-colors hover:bg-[var(--c-card-2)] hover:text-[var(--c-ink)]"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-sans text-[24px] font-bold leading-tight tracking-tight text-[var(--c-ink)]">Quản lý khách hàng</h1>
          <p className="mt-0.5 text-[13px] text-[var(--c-muted)]">Theo dõi, tìm kiếm và quản lý tài khoản khách hàng CleanZ</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => toast.info('Đang xuất danh sách khách hàng…')}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--c-line-strong)] bg-[var(--c-card)] px-3 text-[12.5px] font-semibold text-[var(--c-ink-soft)] transition-colors hover:text-[var(--c-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-primary)]/40"
          >
            <Download className="size-4" /> Xuất Excel
          </button>
          <button
            onClick={() => toast.success('Mở form thêm khách hàng')}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-[12.5px] font-semibold text-white shadow-[0_8px_18px_-8px_rgba(255,152,0,0.7)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-primary)]/40"
            style={{ background: 'linear-gradient(135deg, #FFB951 0%, #FF9800 100%)' }}
          >
            <Plus className="size-4" /> Thêm khách hàng
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Users} label="Tổng khách hàng" value={customerStats.total.toLocaleString('vi-VN')} tint="#2563EB" />
        <StatCard icon={UserPlus} label="Khách mới tháng này" value={customerStats.newThisMonth.toLocaleString('vi-VN')} delta={`${customerStats.newDeltaPct}%`} tint="#FF9800" />
        <StatCard icon={UserCheck} label="Đang hoạt động" value={customerStats.active.toLocaleString('vi-VN')} tint="#0E9F6E" />
        <StatCard icon={Gem} label="Khách VIP" value={customerStats.vip.toLocaleString('vi-VN')} tint="#7C3AED" />
      </div>

      {/* Table card */}
      <div className={cn(card, 'overflow-hidden')}>
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-[var(--c-line)] p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--c-muted)]" />
            <input
              value={query}
              onChange={(e) => resetTo(() => setQuery(e.target.value))}
              placeholder="Tìm theo tên, email hoặc SĐT…"
              className="h-10 w-full rounded-xl border bg-[var(--c-card-2)] pl-9 pr-3 text-[13.5px] text-[var(--c-ink)] outline-none transition-colors placeholder:text-[var(--c-muted)] focus:border-[var(--c-primary)]/50 focus-visible:ring-2 focus-visible:ring-[var(--c-primary)]/30"
              style={{ borderColor: 'var(--c-line-strong)' }}
            />
          </div>

          <div className="flex items-center gap-1 rounded-xl border p-1" style={{ borderColor: 'var(--c-line-strong)', background: 'var(--c-card-2)' }}>
            {STATUS_TABS.map((t) => {
              const activeTab = status === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => resetTo(() => setStatus(t.key))}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-primary)]/40',
                    activeTab ? 'bg-[var(--c-card)] text-[var(--c-ink)] shadow-sm' : 'text-[var(--c-muted)] hover:text-[var(--c-ink)]'
                  )}
                >
                  {t.label}
                  <span className="text-[11px] tabular-nums text-[var(--c-muted)]">{counts[t.key]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Table */}
        <div className="cz-scroll overflow-x-auto">
          <table className="w-full min-w-[1000px] border-collapse">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--c-muted)]">
                <th className="w-10 px-4 py-2.5">
                  <input type="checkbox" checked={allOnPageSelected} onChange={toggleAll} className="size-4 accent-[var(--c-primary)] align-middle" aria-label="Chọn tất cả" />
                </th>
                <th className="px-3 py-2.5 font-semibold">Khách hàng</th>
                <th className="hidden px-3 py-2.5 font-semibold md:table-cell">Liên hệ</th>
                <th className="hidden px-3 py-2.5 font-semibold xl:table-cell">Khu vực</th>
                <th className="hidden px-3 py-2.5 font-semibold lg:table-cell">Hạng</th>
                <th className="hidden px-3 py-2.5 text-right font-semibold sm:table-cell">Số đơn</th>
                <th className="px-3 py-2.5 text-right font-semibold">Tổng chi tiêu</th>
                <th className="px-3 py-2.5 font-semibold">Trạng thái</th>
                <th className="hidden px-3 py-2.5 font-semibold xl:table-cell">Cập nhật bởi</th>
                <th className="hidden px-3 py-2.5 font-semibold 2xl:table-cell">Tham gia</th>
                <th className="w-12 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {pageItems.map((c) => (
                <CustomerRow key={c.id} c={c} checked={selected.has(c.id)} onToggle={() => toggleOne(c.id)} />
              ))}
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-16 text-center">
                    <div className="text-[14px] font-semibold text-[var(--c-ink)]">Không tìm thấy khách hàng</div>
                    <div className="mt-1 text-[12.5px] text-[var(--c-muted)]">Thử đổi từ khoá tìm kiếm hoặc bộ lọc trạng thái.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-3 border-t border-[var(--c-line)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[12.5px] text-[var(--c-muted)]">
            Hiển thị <span className="font-semibold text-[var(--c-ink)] tabular-nums">{startIdx}–{endIdx}</span> trong{' '}
            <span className="font-semibold text-[var(--c-ink)] tabular-nums">{filtered.length}</span> khách hàng
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="grid size-9 place-items-center rounded-lg border border-[var(--c-line-strong)] bg-[var(--c-card)] text-[var(--c-ink-soft)] transition-colors hover:text-[var(--c-ink)] disabled:opacity-40 disabled:hover:text-[var(--c-ink-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-primary)]/40"
              aria-label="Trang trước"
            >
              <ChevronLeft className="size-4" />
            </button>
            {Array.from({ length: pageCount }).map((_, i) => {
              const p = i + 1;
              const activePage = p === safePage;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn(
                    'grid size-9 place-items-center rounded-lg text-[13px] font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-primary)]/40',
                    activePage ? 'text-white' : 'border border-[var(--c-line-strong)] bg-[var(--c-card)] text-[var(--c-ink-soft)] hover:text-[var(--c-ink)]'
                  )}
                  style={activePage ? { background: 'linear-gradient(135deg, #FFB951 0%, #FF9800 100%)' } : undefined}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={safePage >= pageCount}
              className="grid size-9 place-items-center rounded-lg border border-[var(--c-line-strong)] bg-[var(--c-card)] text-[var(--c-ink-soft)] transition-colors hover:text-[var(--c-ink)] disabled:opacity-40 disabled:hover:text-[var(--c-ink-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-primary)]/40"
              aria-label="Trang sau"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomerRow({ c, checked, onToggle }: { c: Customer; checked: boolean; onToggle: () => void }) {
  const st = STATUS_META[c.status];
  const tier = TIER_META[c.tier];
  const locked = c.status === 'locked';

  return (
    <tr className={cn('border-t border-[var(--c-line)] text-[13px] transition-colors hover:bg-[var(--c-card-2)]', checked && 'bg-[var(--c-primary-soft)]/40')}>
      <td className="px-4 py-2.5">
        <input type="checkbox" checked={checked} onChange={onToggle} className="size-4 accent-[var(--c-primary)] align-middle" aria-label={`Chọn ${c.name}`} />
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-3">
          <Avatar initials={c.initials} />
          <div className="min-w-0">
            <div className="truncate font-semibold text-[var(--c-ink)]">{c.name}</div>
            <div className="truncate text-[11.5px] text-[var(--c-muted)]">{c.id} · {c.email}</div>
          </div>
        </div>
      </td>
      <td className="hidden px-3 py-2.5 text-[var(--c-ink-soft)] tabular-nums md:table-cell">{c.phone}</td>
      <td className="hidden px-3 py-2.5 text-[var(--c-ink-soft)] xl:table-cell">{c.area}</td>
      <td className="hidden px-3 py-2.5 lg:table-cell">
        <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-semibold" style={{ color: tier.color, background: tier.soft }}>
          {c.tier}
        </span>
      </td>
      <td className="hidden px-3 py-2.5 text-right font-semibold text-[var(--c-ink)] tabular-nums sm:table-cell">{c.bookings}</td>
      <td className="px-3 py-2.5 text-right font-semibold text-[var(--c-ink)] tabular-nums">{formatVnd(c.spent)}</td>
      <td className="px-3 py-2.5">
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold" style={{ color: st.color, background: st.soft }}>
          <span className="size-1.5 rounded-full" style={{ background: st.color }} />
          {st.label}
        </span>
      </td>
      <td className="hidden px-3 py-2.5 xl:table-cell">
        <div className="flex items-center gap-2">
            <div className="truncate text-md font-medium text-[var(--c-ink)]">{c.updatedBy}</div>
        </div>
      </td>
      <td className="hidden px-3 py-2.5 text-[var(--c-muted)] tabular-nums 2xl:table-cell">{c.joined}</td>
      <td className="px-3 py-2.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Hành động"
              className="grid size-8 place-items-center rounded-lg text-[var(--c-muted)] transition-colors hover:bg-[var(--c-card-2)] hover:text-[var(--c-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-primary)]/40"
            >
              <MoreHorizontal className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuItem onSelect={() => toast.info(`Xem chi tiết: ${c.name}`)}>
              <Eye className="mr-2 size-4" /> Xem chi tiết
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => toast.success(`Chỉnh sửa: ${c.name}`)}>
              <Pencil className="mr-2 size-4" /> Chỉnh sửa
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => toast.success(`Đã gửi thông báo tới ${c.name}`)}>
              <Bell className="mr-2 size-4" /> Gửi thông báo
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {locked ? (
              <DropdownMenuItem onSelect={() => toast.success(`Đã mở khoá: ${c.name}`)}>
                <Unlock className="mr-2 size-4" /> Mở khoá tài khoản
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={() => toast.warning(`Đã khoá: ${c.name}`)}>
                <Lock className="mr-2 size-4" /> Khoá tài khoản
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={() => toast.error(`Đã xoá: ${c.name}`)} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 size-4" /> Xoá tài khoản
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}
