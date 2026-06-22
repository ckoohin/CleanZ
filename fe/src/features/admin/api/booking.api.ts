import http from '@/lib/api/http';

export const getAdminBookings = async (params: { page?: number; limit?: number; keyword?: string; status?: string }) => {
  const { data } = await http.get('/admin/bookings', { params });
  return data;
};

export const getAdminBookingDetail = async (id: string) => {
  const { data } = await http.get(`/admin/bookings/${id}`);
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


export const cancelBooking = async (id: string) => {
  const { data } = await http.patch(`/admin/bookings/${id}/cancel`);
  return data;
};

export const assignTaskerToBooking = async (id: string, taskerId: string) => {
  const { data } = await http.patch(`/admin/bookings/${id}/assign`, { taskerId });
  return data;
};
