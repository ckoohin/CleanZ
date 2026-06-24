import http from '@/lib/api/http';
import { API_ENDPOINTS } from '@/constants/api-endpoints';
import {
  CreateAdminBookingDto,
  AvailableTaskersQueryDto,
  AssignTaskerDto,
  ChangeBookingStatusDto
} from '../types/booking.types';

export const adminBookingService = {
  getAdminBookings: async (params: { page?: number; limit?: number; keyword?: string; status?: string }) => {
    const { data } = await http.get(API_ENDPOINTS.ADMIN_BOOKINGS.BASE, { params });
    return data;
  },

  getAdminBookingDetail: async (id: string) => {
    const { data } = await http.get(API_ENDPOINTS.ADMIN_BOOKINGS.DETAIL(id));
    return data;
  },

  createAdminBooking: async (payload: CreateAdminBookingDto) => {
    const { data } = await http.post(API_ENDPOINTS.ADMIN_BOOKINGS.BASE, payload);
    return data;
  },

  getAvailableTaskers: async (id: string, params?: AvailableTaskersQueryDto) => {
    const { data } = await http.get(API_ENDPOINTS.ADMIN_BOOKINGS.AVAILABLE_TASKERS(id), { params });
    return data.data || data;
  },

  assignTaskerToBooking: async (id: string, payload: AssignTaskerDto) => {
    const { data } = await http.patch(API_ENDPOINTS.ADMIN_BOOKINGS.ASSIGN_TASKER(id), payload);
    return data;
  },

  changeBookingStatus: async (id: string, payload: ChangeBookingStatusDto) => {
    const { data } = await http.patch(API_ENDPOINTS.ADMIN_BOOKINGS.STATUS(id), payload);
    return data;
  },

  cancelBooking: async (id: string, reason: string = 'Hủy bởi Admin') => {
    const { data } = await http.patch(API_ENDPOINTS.ADMIN_BOOKINGS.STATUS(id), { status: 'CANCELLED', reason });
    return data;
  },

  triggerExpireOverdue: async () => {
    const { data } = await http.post(API_ENDPOINTS.ADMIN_BOOKINGS.EXPIRE_OVERDUE);
    return data;
  },

  getActiveTaskers: async () => {
    const { data } = await http.get(API_ENDPOINTS.ADMIN_BOOKINGS.ACTIVE_TASKERS);
    return data.data || data;
  },
};
