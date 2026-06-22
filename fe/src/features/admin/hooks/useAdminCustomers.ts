import { useQuery } from '@tanstack/react-query';
import { getAdminCustomers, getAdminCustomerDetail } from '../api/customer.api';

export const useAdminCustomers = (params: { page?: number; limit?: number; keyword?: string; isActive?: boolean }) => {
  return useQuery({
    queryKey: ['/admin/customers', params],
    queryFn: () => getAdminCustomers(params),
  });
};

export const useAdminCustomerDetail = (id: string | null) => {
  return useQuery({
    queryKey: ['/admin/customers', id],
    queryFn: () => getAdminCustomerDetail(id!),
    enabled: !!id,
  });
};
