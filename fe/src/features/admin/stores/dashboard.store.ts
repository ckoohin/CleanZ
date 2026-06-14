import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DateRange, GroupBy, PresetKey, WidgetId } from '../types/dashboard.types';

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

export type WidgetConfig = { id: WidgetId; colSpan: 2 | 3 | 4 | 6 };

export const DEFAULT_PRESETS: Record<PresetKey, { label: string; widgets: WidgetConfig[] }> = {
  overview: {
    label: 'Tổng quan',
    widgets: [
      { id: 'alerts', colSpan: 6 },
      { id: 'kpiRevenue', colSpan: 2 },
      { id: 'kpiOrders', colSpan: 2 },
      { id: 'kpiTaskers', colSpan: 2 },
      { id: 'chart', colSpan: 4 },
      { id: 'reviews', colSpan: 2 },
      { id: 'statuses', colSpan: 6 },
      { id: 'recent', colSpan: 3 },
      { id: 'kpiCancel', colSpan: 3 },
    ],
  },
  cs: {
    label: 'CS / Chăm sóc KH',
    widgets: [
      { id: 'alerts', colSpan: 6 },
      { id: 'recent', colSpan: 3 },
      { id: 'feedback', colSpan: 3 },
      { id: 'reviews', colSpan: 3 },
      { id: 'kpiNPS', colSpan: 3 },
    ],
  },
  finance: {
    label: 'Tài chính',
    widgets: [
      { id: 'kpiRevenue', colSpan: 3 },
      { id: 'kpiGMV', colSpan: 3 },
      { id: 'chart', colSpan: 6 },
      { id: 'paymentMix', colSpan: 3 },
      { id: 'feeBreakdown', colSpan: 3 },
      { id: 'kpiRefund', colSpan: 3 },
      { id: 'kpiAOV', colSpan: 3 },
    ],
  },
  operations: {
    label: 'Vận hành',
    widgets: [
      { id: 'alerts', colSpan: 6 },
      { id: 'statuses', colSpan: 6 },
      { id: 'areaPerf', colSpan: 3 },
      { id: 'peakHours', colSpan: 3 },
      { id: 'kpiTaskers', colSpan: 3 },
      { id: 'topTaskers', colSpan: 3 },
      { id: 'recent', colSpan: 6 },
    ],
  },
  tasker: {
    label: 'Tasker',
    widgets: [
      { id: 'kpiTaskers', colSpan: 3 },
      { id: 'taskerLevels', colSpan: 3 },
      { id: 'topTaskers', colSpan: 3 },
      { id: 'docExpiry', colSpan: 3 },
    ],
  },
  marketing: {
    label: 'Marketing',
    widgets: [
      { id: 'kpiNewCust', colSpan: 3 },
      { id: 'kpiRetention', colSpan: 3 },
      { id: 'voucherPerf', colSpan: 3 },
      { id: 'areaPerf', colSpan: 3 },
      { id: 'chart', colSpan: 6 },
    ],
  },
};

// Aliased as PRESETS for backwards compatibility
export const PRESETS = DEFAULT_PRESETS;

interface DashboardStore {
  dateRange: DateRange;
  currentPreset: PresetKey;
  isEditMode: boolean;
  presets: Record<PresetKey, { label: string; widgets: WidgetConfig[] }>;
  setDateRange: (r: DateRange) => void;
  setPreset: (p: PresetKey) => void;
  setEditMode: (val: boolean) => void;
  reorderWidgets: (fromIndex: number, toIndex: number) => void;
  resizeWidget: (id: WidgetId, direction: 1 | -1) => void;
  hideWidget: (id: WidgetId) => void;
  applyCustomLayout: (layout: WidgetConfig[]) => void;
  resetPreset: () => void;
}

export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set) => ({
      dateRange: getThisMonth(),
      currentPreset: 'overview',
      isEditMode: false,
      presets: JSON.parse(JSON.stringify(DEFAULT_PRESETS)),
      setDateRange: (r) => set({ dateRange: r }),
      setPreset: (p) => set({ currentPreset: p }),
      setEditMode: (val) => set({ isEditMode: val }),
      reorderWidgets: (fromIndex, toIndex) =>
        set((state) => {
          const currentWidgets = [...state.presets[state.currentPreset].widgets];
          const [removed] = currentWidgets.splice(fromIndex, 1);
          currentWidgets.splice(toIndex, 0, removed);
          return {
            presets: {
              ...state.presets,
              [state.currentPreset]: {
                ...state.presets[state.currentPreset],
                widgets: currentWidgets,
              },
            },
          };
        }),
      resizeWidget: (id, direction) =>
        set((state) => {
          const sizes: (2 | 3 | 4 | 6)[] = [2, 3, 4, 6];
          const currentWidgets = state.presets[state.currentPreset].widgets.map((w) => {
            if (w.id !== id) return w;
            const idx = sizes.indexOf(w.colSpan);
            const nextIdx = Math.max(0, Math.min(sizes.length - 1, idx + direction));
            return { ...w, colSpan: sizes[nextIdx] };
          });
          return {
            presets: {
              ...state.presets,
              [state.currentPreset]: {
                ...state.presets[state.currentPreset],
                widgets: currentWidgets,
              },
            },
          };
        }),
      hideWidget: (id) =>
        set((state) => {
          const currentWidgets = state.presets[state.currentPreset].widgets.filter(
            (w) => w.id !== id
          );
          return {
            presets: {
              ...state.presets,
              [state.currentPreset]: {
                ...state.presets[state.currentPreset],
                widgets: currentWidgets,
              },
            },
          };
        }),
      applyCustomLayout: (layout) =>
        set((state) => ({
          presets: {
            ...state.presets,
            [state.currentPreset]: {
              ...state.presets[state.currentPreset],
              widgets: layout,
            },
          },
        })),
      resetPreset: () =>
        set((state) => ({
          presets: {
            ...state.presets,
            [state.currentPreset]: {
              ...state.presets[state.currentPreset],
              widgets: JSON.parse(JSON.stringify(DEFAULT_PRESETS[state.currentPreset].widgets)),
            },
          },
        })),
    }),
    {
      name: 'cleanz-admin-dashboard-layout',
      partialize: (state) => ({
        presets: state.presets,
        currentPreset: state.currentPreset,
      }),
    }
  )
);
