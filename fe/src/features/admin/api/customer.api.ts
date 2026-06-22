import http from '@/lib/api/http';

export const getAdminCustomers = async (params: { page?: number; limit?: number; keyword?: string; isActive?: boolean }) => {
  const { data } = await http.get('/admin/customers', { params });
  return data;
};

export const getAdminCustomerDetail = async (id: string) => {
  const { data } = await http.get(`/admin/customers/${id}`);
  return data;
};
