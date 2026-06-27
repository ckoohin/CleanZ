'use client';

import { useEffect, useState } from 'react';
import { Responsive, WidthProvider, type Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { LayoutGrid, Check, RotateCcw, Plus, X, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  TodayWidget,
  AlertsWidget,
  KpiWidget,
  GmvChartWidget,
  StatusWidget,
  RecentBookingsWidget,
  TopTaskersWidget,
  AreaPerfWidget,
} from './widgets';

const RGL = WidthProvider(Responsive);
const STORE_KEY = 'cz-test-dashboard-v1';

type Layouts = { [bp: string]: Layout[] };

const WIDGETS: Record<string, { title: string; node: React.ReactNode }> = {
  today: { title: 'Doanh thu hôm nay', node: <TodayWidget /> },
  alerts: { title: 'Cần xử lý ngay', node: <AlertsWidget /> },
  kpiCommission: { title: 'Hoa hồng nền tảng', node: <KpiWidget kpiKey="commission" /> },
  kpiOrders: { title: 'Đơn hoàn tất', node: <KpiWidget kpiKey="orders" /> },
  kpiTaskers: { title: 'Tasker hoạt động', node: <KpiWidget kpiKey="taskers" /> },
  kpiCancel: { title: 'Tỷ lệ huỷ đơn', node: <KpiWidget kpiKey="cancel" /> },
  gmvChart: { title: 'Doanh thu 14 ngày', node: <GmvChartWidget /> },
  statusDonut: { title: 'Trạng thái đơn hàng', node: <StatusWidget /> },
  recentBookings: { title: 'Đơn hàng gần đây', node: <RecentBookingsWidget /> },
  topTaskers: { title: 'Top Tasker', node: <TopTaskersWidget /> },
  areaPerf: { title: 'Đơn theo khu vực', node: <AreaPerfWidget /> },
};

const ALL_IDS = Object.keys(WIDGETS);

const DEFAULT_LAYOUT: Layout[] = [
  { i: 'today', x: 0, y: 0, w: 4, h: 3, minW: 3, minH: 3 },
  { i: 'alerts', x: 4, y: 0, w: 8, h: 3, minW: 6, minH: 3 },
  { i: 'kpiCommission', x: 0, y: 3, w: 3, h: 2, minW: 3, minH: 2 },
  { i: 'kpiOrders', x: 3, y: 3, w: 3, h: 2, minW: 3, minH: 2 },
  { i: 'kpiTaskers', x: 6, y: 3, w: 3, h: 2, minW: 3, minH: 2 },
  { i: 'kpiCancel', x: 9, y: 3, w: 3, h: 2, minW: 3, minH: 2 },
  { i: 'gmvChart', x: 0, y: 5, w: 8, h: 5, minW: 4, minH: 4 },
  { i: 'statusDonut', x: 8, y: 5, w: 4, h: 5, minW: 3, minH: 4 },
  { i: 'recentBookings', x: 0, y: 10, w: 8, h: 6, minW: 5, minH: 4 },
  { i: 'topTaskers', x: 8, y: 10, w: 4, h: 3, minW: 3, minH: 3 },
  { i: 'areaPerf', x: 8, y: 13, w: 4, h: 3, minW: 3, minH: 3 },
];

function ToolbarButton({
  onClick,
  active,
  children,
}: {
  onClick?: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[12.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-primary)]/40',
        active
          ? 'border-transparent text-white'
          : 'border-[var(--c-line-strong)] bg-[var(--c-card)] text-[var(--c-ink-soft)] hover:text-[var(--c-ink)]'
      )}
      style={active ? { background: 'linear-gradient(135deg, #FFB951 0%, #FF9800 100%)' } : undefined}
    >
      {children}
    </button>
  );
}

export function DashboardGrid() {
  const [mounted, setMounted] = useState(false);
  const [editing, setEditing] = useState(false);
  const [layouts, setLayouts] = useState<Layouts>({ lg: DEFAULT_LAYOUT });
  const [hidden, setHidden] = useState<string[]>([]);

  // load saved layout (client only)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { layouts?: Layouts; hidden?: string[] };
        if (parsed.layouts) setLayouts(parsed.layouts);
        if (parsed.hidden) setHidden(parsed.hidden);
      }
    } catch {
      /* ignore */
    }
    setMounted(true);
  }, []);

  // persist
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ layouts, hidden }));
    } catch {
      /* ignore */
    }
  }, [layouts, hidden, mounted]);

  const reset = () => {
    setLayouts({ lg: DEFAULT_LAYOUT.map((l) => ({ ...l })) });
    setHidden([]);
  };

  const visible = ALL_IDS.filter((id) => !hidden.includes(id));
  const hiddenList = ALL_IDS.filter((id) => hidden.includes(id));

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-sans text-[24px] font-bold leading-tight tracking-tight text-[var(--c-ink)]">Bảng điều khiển</h1>
          <p className="mt-0.5 text-[13px] text-[var(--c-muted)]">
            {editing ? 'Kéo để sắp xếp · kéo góc dưới-phải để đổi kích thước' : 'Tổng quan vận hành nền tảng CleanZ'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {editing && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <ToolbarButton>
                    <Plus className="size-4" /> Thêm widget
                  </ToolbarButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-52">
                  <DropdownMenuLabel>Widget đang ẩn</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {hiddenList.length === 0 ? (
                    <DropdownMenuItem disabled>Tất cả đang hiển thị</DropdownMenuItem>
                  ) : (
                    hiddenList.map((id) => (
                      <DropdownMenuItem key={id} onSelect={() => setHidden((h) => h.filter((x) => x !== id))}>
                        <Plus className="mr-2 size-4" /> {WIDGETS[id].title}
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <ToolbarButton onClick={reset}>
                <RotateCcw className="size-4" /> Đặt lại
              </ToolbarButton>
            </>
          )}
          <ToolbarButton onClick={() => setEditing((e) => !e)} active={editing}>
            {editing ? (
              <>
                <Check className="size-4" /> Xong
              </>
            ) : (
              <>
                <LayoutGrid className="size-4" /> Chỉnh sửa bố cục
              </>
            )}
          </ToolbarButton>
        </div>
      </div>

      {/* Grid */}
      {!mounted ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl border border-[var(--c-line)] bg-[var(--c-card-2)]" />
          ))}
        </div>
      ) : (
        <RGL
          className={cn('dashboard-grid', editing && 'is-editing')}
          layouts={layouts}
          breakpoints={{ lg: 1100, md: 900, sm: 680, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 12, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={64}
          margin={[16, 16]}
          containerPadding={[0, 0]}
          isDraggable={editing}
          isResizable={editing}
          draggableCancel=".no-drag"
          resizeHandles={['se']}
          compactType="vertical"
          onLayoutChange={(_current: Layout[], all: Layouts) => setLayouts(all)}
        >
          {visible.map((id) => (
            <div
              key={id}
              className={cn('relative h-full', editing && 'cursor-move rounded-2xl ring-2 ring-[var(--c-primary)]/35 ring-offset-2 ring-offset-[var(--c-canvas)]')}
            >
              {editing && (
                <>
                  <div className="no-drag pointer-events-none absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-md bg-[var(--c-ink)]/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    <GripVertical className="size-3" /> Kéo
                  </div>
                  <button
                    onClick={() => setHidden((h) => [...h, id])}
                    aria-label={`Ẩn ${WIDGETS[id].title}`}
                    className="no-drag absolute right-2 top-2 z-10 grid size-7 place-items-center rounded-md bg-[var(--c-ink)]/70 text-white transition-colors hover:bg-[#E11D48] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <X className="size-4" />
                  </button>
                </>
              )}
              {WIDGETS[id].node}
            </div>
          ))}
        </RGL>
      )}
    </div>
  );
}
