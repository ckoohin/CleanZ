import { useQuery } from '@tanstack/react-query';
import { getAdminBookings, getAdminBookingDetail } from '../api/booking.api';

export const useAdminBookings = (params: { page?: number; limit?: number; keyword?: string; status?: string }) => {
  const queryInfo = useQuery({
    queryKey: ['/admin/bookings', params],
    queryFn: () => getAdminBookings(params),
  });

  return {
    data: queryInfo.data?.items || [],
    total: queryInfo.data?.total || 0,
    totalPages: queryInfo.data?.totalPages || 0,
    isLoading: queryInfo.isLoading,
    error: queryInfo.error,
    mutate: queryInfo.refetch,
  };
};

export const useAdminBookingDetail = (id: string | null) => {
  const queryInfo = useQuery({
    queryKey: ['/admin/bookings', id],
    queryFn: () => getAdminBookingDetail(id as string),
    enabled: !!id,
  });

  return {
    booking: queryInfo.data,
    isLoading: queryInfo.isLoading,
    error: queryInfo.error,
    mutate: queryInfo.refetch,
  };
};

export const useActiveTaskers = () => {
  return useQuery({
    queryKey: ['/admin/bookings/taskers/active'],
    queryFn: () => import('../api/booking.api').then(m => m.getActiveTaskers()),
  });
};

import { useMutation, useQueryClient } from '@tanstack/react-query';

export const useCancelAdminBooking = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => import('../api/booking.api').then(api => api.cancelBooking(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/admin/bookings'] });
    }
  });
};

export const useAssignTaskerToBooking = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, taskerId }: { id: string; taskerId: string }) => 
      import('../api/booking.api').then(api => api.assignTaskerToBooking(id, taskerId)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/admin/bookings'] });
    }
  });
};
