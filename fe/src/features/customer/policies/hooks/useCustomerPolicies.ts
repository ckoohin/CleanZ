import { useQuery } from '@tanstack/react-query';
import { customerPolicyApi } from '../services/customer-policy.service';

export function useCustomerPolicies() {
  return useQuery({
    queryKey: ['customer-policies'],
    queryFn: customerPolicyApi.getAll,
    staleTime: 5 * 60 * 1000,
  });
}
