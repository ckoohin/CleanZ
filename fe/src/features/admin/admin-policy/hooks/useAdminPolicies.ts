'use client';

import { useQuery } from '@tanstack/react-query';
import { adminPolicyService } from '../services/admin-policy.service';

export const useAdminPolicies = () => {
  return useQuery({
    queryKey: ['admin-policies'],
    queryFn: adminPolicyService.getPolicies,
  });
};