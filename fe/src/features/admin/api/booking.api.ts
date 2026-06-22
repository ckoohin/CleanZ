import http from '@/lib/api/http';
import {
  CreateAdminBookingDto,
  AvailableTaskersQueryDto,
  AssignTaskerDto,
  ChangeBookingStatusDto
} from '../types/booking.types';

export const getAdminBookings = async (params: { page?: number; limit?: number; keyword?: string; status?: string }) => {
  const { data } = await http.get('/admin/bookings', { params });
  return data;
};

export const getAdminBookingDetail = async (id: string) => {
  const { data } = await http.get(`/admin/bookings/${id}`);
  return data;
};

export const createAdminBooking = async (payload: CreateAdminBookingDto) => {
  const { data } = await http.post('/admin/bookings', payload);
  return data;
};

export const getAvailableTaskers = async (id: string, params?: AvailableTaskersQueryDto) => {
  const { data } = await http.get(`/admin/bookings/${id}/available-taskers`, { params });
  return data.data || data; // handle pagination if returned in data wrapper
};

export const assignTaskerToBooking = async (id: string, payload: AssignTaskerDto) => {
  const { data } = await http.patch(`/admin/bookings/${id}/tasker`, payload);
  return data;
};

export const changeBookingStatus = async (id: string, payload: ChangeBookingStatusDto) => {
  const { data } = await http.patch(`/admin/bookings/${id}/status`, payload);
  return data;
};

export const cancelBooking = async (id: string, reason: string = 'Hủy bởi Admin') => {
  const { data } = await http.patch(`/admin/bookings/${id}/status`, { status: 'CANCELLED', reason });
  return data;
};

export const triggerExpireOverdue = async () => {
  const { data } = await http.post('/admin/bookings/expire-overdue');
  return data;
};

export const getActiveTaskers = async () => {
  const { data } = await http.get('/admin/bookings/taskers/active');
  return data.data || data;
};
