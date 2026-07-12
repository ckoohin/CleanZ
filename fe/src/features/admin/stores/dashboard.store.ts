import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CategoryKey, DateRange } from '../types/dashboard.types';
import { rangeOf } from '../lib/date-ranges';

interface DashboardStore {
  /** Kỳ thống kê dùng chung cho TOÀN BỘ danh mục đang xem. */
  dateRange: DateRange;
  currentCategory: CategoryKey;
  setDateRange: (r: DateRange) => void;
  setCategory: (c: CategoryKey) => void;
}

export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set) => ({
      dateRange: rangeOf('thisMonth'),
      currentCategory: 'overview',
      setDateRange: (r) => set({ dateRange: r }),
      setCategory: (c) => set({ currentCategory: c }),
    }),
    {
      /**
       * v4: bỏ hẳn bố cục kéo-thả. Key CŨ ('…-layout-v3') còn giữ `presets` với
       * toạ độ x/y/w/h; nếu tái dùng key đó thì layout cũ sẽ được merge sống lại.
       */
      name: 'cleanz-admin-dashboard-v4',
      /**
       * KHÔNG persist `dateRange`: nó là một khoảng ngày tuyệt đối, lưu lại thì
       * người dùng mở lại sau một tháng vẫn thấy số của tháng cũ. Persist nó cũng
       * gây lệch hydration SSR/CSR.
       */
      partialize: (s) => ({ currentCategory: s.currentCategory }),
    },
  ),
);
