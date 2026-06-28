import { useQuery } from '@tanstack/react-query';
import { taskerPolicyApi } from '../services/tasker-policy.service';

export function useTaskerPolicies() {
  return useQuery({
    queryKey: ['tasker-policies'],
    queryFn: taskerPolicyApi.getAll,
    staleTime: 5 * 60 * 1000,
  });
}
