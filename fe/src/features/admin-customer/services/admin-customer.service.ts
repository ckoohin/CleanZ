import http from '@/lib/api/http';
import type {
  CustomerQueryFilter,
  PaginatedCustomersResponse,
  CustomerDetailResponse,
  PaginatedCustomerBookingsResponse,
  ToggleCustomerStatusResponse,
  CreateCustomerPayload,
  UpdateCustomerPayload,
  DeleteCustomerResponse,
} from '../types/customer.types';

const BASE = '/admin/customers';

export const adminCustomerApi = {
  getCustomers: (params: CustomerQueryFilter): Promise<PaginatedCustomersResponse> => {
    // If params.isActive is undefined, don't pass it or pass it. The Backend handles isActive optionally.
    return http.get<PaginatedCustomersResponse>(BASE, { params }).then((res) => res.data);
  },

  getCustomerDetail: (id: string): Promise<CustomerDetailResponse> => {
    return http.get<CustomerDetailResponse>(`${BASE}/${id}`).then((res) => res.data);
  },

  getCustomerBookings: (
    id: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedCustomerBookingsResponse> => {
    return http
      .get<PaginatedCustomerBookingsResponse>(`${BASE}/${id}/bookings`, {
        params: { page, limit },
      })
      .then((res) => res.data);
  },

  toggleCustomerStatus: (id: string, isActive: boolean): Promise<ToggleCustomerStatusResponse> => {
    return http
      .patch<ToggleCustomerStatusResponse>(`${BASE}/${id}/status`, { isActive })
      .then((res) => res.data);
  },

  createCustomer: (payload: CreateCustomerPayload): Promise<CustomerDetailResponse> => {
    return http.post<CustomerDetailResponse>(BASE, payload).then((res) => res.data);
  },

  updateCustomer: (id: string, payload: UpdateCustomerPayload): Promise<CustomerDetailResponse> => {
    return http.patch<CustomerDetailResponse>(`${BASE}/${id}`, payload).then((res) => res.data);
  },

  deleteCustomer: (id: string): Promise<DeleteCustomerResponse> => {
    return http.delete<DeleteCustomerResponse>(`${BASE}/${id}`).then((res) => res.data);
  },
};
