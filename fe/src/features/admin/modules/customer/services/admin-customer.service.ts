import http from '@/lib/api/http';
import { API_ENDPOINTS } from '@/constants/api-endpoints';
import type {
  CustomerQueryFilter,
  PaginatedCustomersResponse,
  CustomerDetailResponse,
  PaginatedCustomerBookingsResponse,
  ToggleCustomerStatusResponse,
  CreateCustomerPayload,
  UpdateCustomerPayload,
  DeleteCustomerResponse,
  RestoreCustomerResponse,
} from '../types/customer.types';

export const adminCustomerApi = {
  getCustomers: (params: CustomerQueryFilter): Promise<PaginatedCustomersResponse> => {
    // If params.isActive is undefined, don't pass it or pass it. The Backend handles isActive optionally.
    return http.get<PaginatedCustomersResponse>(API_ENDPOINTS.ADMIN_CUSTOMERS.BASE, { params }).then((res) => res.data);
  },

  getCustomerDetail: (id: string): Promise<CustomerDetailResponse> => {
    return http.get<CustomerDetailResponse>(API_ENDPOINTS.ADMIN_CUSTOMERS.DETAIL(id)).then((res) => res.data);
  },

  getCustomerBookings: (
    id: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedCustomerBookingsResponse> => {
    return http
      .get<PaginatedCustomerBookingsResponse>(API_ENDPOINTS.ADMIN_CUSTOMERS.BOOKINGS(id), {
        params: { page, limit },
      })
      .then((res) => res.data);
  },

  toggleCustomerStatus: (id: string, isActive: boolean): Promise<ToggleCustomerStatusResponse> => {
    return http
      .patch<ToggleCustomerStatusResponse>(API_ENDPOINTS.ADMIN_CUSTOMERS.STATUS(id), { isActive })
      .then((res) => res.data);
  },

  createCustomer: (payload: CreateCustomerPayload): Promise<CustomerDetailResponse> => {
    return http
      .post<CustomerDetailResponse>(API_ENDPOINTS.ADMIN_CUSTOMERS.BASE, payload)
      .then((res) => res.data);
  },

  updateCustomer: (
    id: string,
    payload: UpdateCustomerPayload,
  ): Promise<CustomerDetailResponse> => {
    return http
      .patch<CustomerDetailResponse>(API_ENDPOINTS.ADMIN_CUSTOMERS.DETAIL(id), payload)
      .then((res) => res.data);
  },

  deleteCustomer: (id: string): Promise<DeleteCustomerResponse> => {
    return http
      .delete<DeleteCustomerResponse>(API_ENDPOINTS.ADMIN_CUSTOMERS.DETAIL(id))
      .then((res) => res.data);
  },

  restoreCustomer: (id: string): Promise<RestoreCustomerResponse> => {
    return http
      .patch<RestoreCustomerResponse>(API_ENDPOINTS.ADMIN_CUSTOMERS.RESTORE(id))
      .then((res) => res.data);
  },

  resendTempPassword: (id: string): Promise<{ message: string }> => {
    return http
      .post<{ message: string }>(API_ENDPOINTS.ADMIN_CUSTOMERS.RESEND_TEMP_PASSWORD(id))
      .then((res) => res.data);
  },
};
