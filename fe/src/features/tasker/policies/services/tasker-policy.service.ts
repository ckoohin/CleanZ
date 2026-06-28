import http from '@/lib/api/http';
import { API_ENDPOINTS } from '@/constants/api-endpoints';
import type { Policy } from '@/features/admin/modules/policy/types/policy.type';

export const taskerPolicyApi = {
  getAll: async (): Promise<Policy[]> => {
    const res = await http.get(API_ENDPOINTS.TASKER_POLICIES.PUBLIC_ALL, {
      params: { role: 'TASKER' },
    });
    return res.data?.data ?? res.data;
  },

  getBySlug: async (slug: string): Promise<Policy> => {
    const res = await http.get(API_ENDPOINTS.TASKER_POLICIES.PUBLIC_BY_SLUG(slug));
    return res.data?.data ?? res.data;
  },
};
