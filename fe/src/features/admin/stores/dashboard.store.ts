import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DateRange, GridLayoutItem, GroupBy, PresetKey, WidgetId } from '../types/dashboard.types';

function getThisMonth(): DateRange {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    fromDate: from.toISOString().split('T')[0],
    toDate: to.toISOString().split('T')[0],
  };
}

export function calcGroupBy(fromDate: string, toDate: string): GroupBy {
  const diff = (new Date(toDate).getTime() - new Date(fromDate).getTime()) / (1000 * 60 * 60 * 24);
  if (diff <= 14) return 'day';
  if (diff <= 90) return 'week';
  return 'month';
}

/** Grid is 12 columns wide. rowHeight/margin are mirrored in DashboardClient. */
export const GRID_COLS = 12;

/** Default footprint (in grid units) used when a widget is added or a preset is built. */
export const DEFAULT_SIZE: Record<WidgetId, { w: number; h: number }> = {
  alerts: { w: 12, h: 3 },
  kpiRevenue: { w: 3, h: 2 },
  kpiGMV: { w: 3, h: 2 },
  kpiAOV: { w: 3, h: 2 },
  kpiRefund: { w: 3, h: 2 },
  kpiOrders: { w: 3, h: 2 },
  kpiCancel: { w: 3, h: 2 },
  kpiTaskers: { w: 3, h: 2 },
  kpiNewCust: { w: 3, h: 2 },
  kpiRetention: { w: 3, h: 2 },
  kpiNPS: { w: 3, h: 2 },
  chart: { w: 8, h: 5 },
  statuses: { w: 12, h: 3 },
  recent: { w: 6, h: 5 },
  recurring: { w: 6, h: 4 },
  cancelReasons: { w: 6, h: 4 },
  paymentMix: { w: 6, h: 4 },
  feeBreakdown: { w: 6, h: 4 },
  taskerLevels: { w: 6, h: 4 },
  topTaskers: { w: 6, h: 5 },
  docExpiry: { w: 6, h: 4 },
  reviews: { w: 6, h: 5 },
  feedback: { w: 6, h: 5 },
  voucherPerf: { w: 6, h: 4 },
  areaPerf: { w: 6, h: 4 },
  peakHours: { w: 6, h: 4 },
  extras: { w: 12, h: 2 },
};

/** Minimum footprint a widget may be resized to. */
export const MIN_SIZE = { w: 3, h: 2 };

// Legacy colSpan → grid width, used to keep visual parity with the old presets.
const SPAN_TO_W: Record<number, number> = { 2: 3, 3: 6, 4: 9, 6: 12 };

// Pack a list of widgets left-to-right into rows of GRID_COLS, wrapping as needed.
function pack(specs: { id: WidgetId; colSpan: number }[]): GridLayoutItem[] {
  let x = 0;
  let y = 0;
  let rowH = 0;
  return specs.map(({ id, colSpan }) => {
    const w = SPAN_TO_W[colSpan] ?? DEFAULT_SIZE[id].w;
    const h = DEFAULT_SIZE[id].h;
    if (x + w > GRID_COLS) {
      x = 0;
      y += rowH;
      rowH = 0;
    }
    const item: GridLayoutItem = { id, x, y, w, h };
    x += w;
    rowH = Math.max(rowH, h);
    return item;
  });
}

export const DEFAULT_PRESETS: Record<PresetKey, { label: string; layout: GridLayoutItem[] }> = {
  overview: {
    label: 'Tổng quan',
    layout: pack([
      { id: 'alerts', colSpan: 6 },
      { id: 'kpiRevenue', colSpan: 2 },
      { id: 'kpiOrders', colSpan: 2 },
      { id: 'kpiTaskers', colSpan: 2 },
      { id: 'chart', colSpan: 4 },
      { id: 'reviews', colSpan: 2 },
      { id: 'statuses', colSpan: 6 },
      { id: 'recent', colSpan: 3 },
      { id: 'kpiCancel', colSpan: 3 },
    ]),
  },
  cs: {
    label: 'CS / Chăm sóc KH',
    layout: pack([
      { id: 'alerts', colSpan: 6 },
      { id: 'recent', colSpan: 3 },
      { id: 'feedback', colSpan: 3 },
      { id: 'reviews', colSpan: 3 },
      { id: 'kpiNPS', colSpan: 3 },
    ]),
  },
  finance: {
    label: 'Tài chính',
    layout: pack([
      { id: 'kpiRevenue', colSpan: 3 },
      { id: 'kpiGMV', colSpan: 3 },
      { id: 'chart', colSpan: 6 },
      { id: 'paymentMix', colSpan: 3 },
      { id: 'feeBreakdown', colSpan: 3 },
      { id: 'kpiRefund', colSpan: 3 },
      { id: 'kpiAOV', colSpan: 3 },
    ]),
  },
  operations: {
    label: 'Vận hành',
    layout: pack([
      { id: 'alerts', colSpan: 6 },
      { id: 'statuses', colSpan: 6 },
      { id: 'areaPerf', colSpan: 3 },
      { id: 'peakHours', colSpan: 3 },
      { id: 'kpiTaskers', colSpan: 3 },
      { id: 'topTaskers', colSpan: 3 },
      { id: 'recent', colSpan: 6 },
    ]),
  },
  tasker: {
    label: 'Tasker',
    layout: pack([
      { id: 'kpiTaskers', colSpan: 3 },
      { id: 'taskerLevels', colSpan: 3 },
      { id: 'topTaskers', colSpan: 3 },
      { id: 'docExpiry', colSpan: 3 },
    ]),
  },
  marketing: {
    label: 'Marketing',
    layout: pack([
      { id: 'kpiNewCust', colSpan: 3 },
      { id: 'kpiRetention', colSpan: 3 },
      { id: 'voucherPerf', colSpan: 3 },
      { id: 'areaPerf', colSpan: 3 },
      { id: 'chart', colSpan: 6 },
    ]),
  },
  // Preset đặc biệt: không dùng widget grid — DashboardClient sẽ render ServicePackageReportsPage
  services: {
    label: 'Báo cáo Dịch vụ',
    layout: [],
  },
};

// Aliased as PRESETS for backwards compatibility
export const PRESETS = DEFAULT_PRESETS;

function clonePresets() {
  return JSON.parse(JSON.stringify(DEFAULT_PRESETS)) as typeof DEFAULT_PRESETS;
}

// Find the next free row so a freshly added widget lands below everything else.
function nextRowY(layout: GridLayoutItem[]): number {
  return layout.reduce((max, it) => Math.max(max, it.y + it.h), 0);
}

interface DashboardStore {
  dateRange: DateRange;
  currentPreset: PresetKey;
  isEditMode: boolean;
  presets: Record<PresetKey, { label: string; layout: GridLayoutItem[] }>;
  setDateRange: (r: DateRange) => void;
  setPreset: (p: PresetKey) => void;
  setEditMode: (val: boolean) => void;
  /** Persist new x/y/w/h coming from react-grid-layout drag/resize. */
  saveLayout: (layout: GridLayoutItem[]) => void;
  hideWidget: (id: WidgetId) => void;
  /** Reconcile the current preset against a chosen set of visible widget ids. */
  setWidgetSelection: (ids: WidgetId[]) => void;
  resetPreset: () => void;
}

function updateCurrent(
  state: DashboardStore,
  layout: GridLayoutItem[]
): Pick<DashboardStore, 'presets'> {
  return {
    presets: {
      ...state.presets,
      [state.currentPreset]: {
        ...state.presets[state.currentPreset],
        layout,
      },
    },
  };
}

export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set) => ({
      dateRange: getThisMonth(),
      currentPreset: 'overview',
      isEditMode: false,
      presets: clonePresets(),
      setDateRange: (r) => set({ dateRange: r }),
      setPreset: (p) => set({ currentPreset: p }),
      setEditMode: (val) => set({ isEditMode: val }),
      saveLayout: (layout) => set((state) => updateCurrent(state, layout)),
      hideWidget: (id) =>
        set((state) =>
          updateCurrent(
            state,
            state.presets[state.currentPreset].layout.filter((w) => w.id !== id)
          )
        ),
      setWidgetSelection: (ids) =>
        set((state) => {
          const current = state.presets[state.currentPreset].layout;
          const kept = current.filter((w) => ids.includes(w.id));
          const existing = new Set(kept.map((w) => w.id));
          let y = nextRowY(kept);
          const added: GridLayoutItem[] = ids
            .filter((id) => !existing.has(id))
            .map((id) => {
              const size = DEFAULT_SIZE[id];
              const item: GridLayoutItem = { id, x: 0, y, w: size.w, h: size.h };
              y += size.h;
              return item;
            });
          return updateCurrent(state, [...kept, ...added]);
        }),
      resetPreset: () =>
        set((state) =>
          updateCurrent(
            state,
            JSON.parse(JSON.stringify(DEFAULT_PRESETS[state.currentPreset].layout))
          )
        ),
    }),
    {
      // v2: schema changed from { colSpan } to grid { x, y, w, h }.
      name: 'cleanz-admin-dashboard-layout-v2',
      partialize: (state) => ({
        presets: state.presets,
        currentPreset: state.currentPreset,
      }),
    }
  )
);
