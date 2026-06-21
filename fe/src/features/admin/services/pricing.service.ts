import http from '@/lib/api/http';
import type {
  PricingConfig,
  PricingListQuery,
  PricingListResponse,
  CreatePricingConfigPayload,
  UpdatePricingConfigPayload,
  PeakDayConfig,
  CreatePeakDayPayload,
  UpdatePeakDayPayload,
} from '../types/pricing.types';

const BASE = '/admin/pricing';

export const pricingApi = {
  listConfigs: (query?: PricingListQuery): Promise<PricingListResponse> =>
    http
      .get(`${BASE}/configs`, { params: query })
      .then((r) => {
        const resData = r.data?.data || {};
        const items = Array.isArray(resData) ? resData : (resData.items ?? []);
        
        return {
          data: items,
          meta: {
            total: resData.total ?? r.data?.meta?.total ?? 0,
            page: resData.page ?? r.data?.meta?.page ?? 1,
            limit: resData.limit ?? r.data?.meta?.limit ?? 10,
          },
        };
      }),

  getConfig: (id: string): Promise<PricingConfig> =>
    http.get(`${BASE}/configs/${id}`).then((r) => r.data?.data ?? r.data),

  createConfig: (payload: CreatePricingConfigPayload): Promise<PricingConfig> =>
    http.post(`${BASE}/configs`, payload).then((r) => r.data?.data ?? r.data),

  updateConfig: (
    id: string,
    payload: UpdatePricingConfigPayload,
  ): Promise<PricingConfig> =>
    http
      .patch(`${BASE}/configs/${id}`, payload)
      .then((r) => r.data?.data ?? r.data),

  deleteConfig: (id: string): Promise<void> =>
    http.delete(`${BASE}/configs/${id}`).then(() => undefined),

  listPeakDays: (onlyActive?: boolean): Promise<PeakDayConfig[]> =>
    http
      .get(`${BASE}/peak-days`, {
        params: onlyActive !== undefined ? { onlyActive } : undefined,
      })
      .then((r) => r.data?.data ?? r.data ?? []),

  getPeakDay: (id: string): Promise<PeakDayConfig> =>
    http.get(`${BASE}/peak-days/${id}`).then((r) => r.data?.data ?? r.data),

  createPeakDay: (payload: CreatePeakDayPayload): Promise<PeakDayConfig> =>
    http
      .post(`${BASE}/peak-days`, payload)
      .then((r) => r.data?.data ?? r.data),

  updatePeakDay: (
    id: string,
    payload: UpdatePeakDayPayload,
  ): Promise<PeakDayConfig> =>
    http
      .patch(`${BASE}/peak-days/${id}`, payload)
      .then((r) => r.data?.data ?? r.data),

  deletePeakDay: (id: string): Promise<void> =>
    http.delete(`${BASE}/peak-days/${id}`).then(() => undefined),
};
