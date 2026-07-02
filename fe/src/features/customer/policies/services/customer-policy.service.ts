import http from '@/lib/api/http';
import { API_ENDPOINTS } from '@/constants/api-endpoints';
import type { Policy } from '@/features/admin/modules/policy/types/policy.type';

export const customerPolicyApi = {
  getAll: async (): Promise<Policy[]> => {
    const res = await http.get(API_ENDPOINTS.CUSTOMER_POLICIES.PUBLIC_ALL, {
      params: { role: 'CUSTOMER' },
    });
    return res.data?.data ?? res.data;
  },

  getBySlug: async (slug: string): Promise<Policy> => {
    const res = await http.get(API_ENDPOINTS.CUSTOMER_POLICIES.PUBLIC_BY_SLUG(slug));
    return res.data?.data ?? res.data;
  },
};
