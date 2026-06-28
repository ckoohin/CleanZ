import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminBookingService } from '../services/admin-booking.service';
import { AssignTaskerDto, ChangeBookingStatusDto, CreateAdminBookingDto } from '../types/booking.types';

export const useAdminBookings = (params: {
  page?: number;
  limit?: number;
  keyword?: string;
  status?: string;
  paymentStatus?: string;
  customerId?: string;
  taskerId?: string;
  fromDate?: string;
  toDate?: string;
}) => {
  const queryInfo = useQuery({
    queryKey: ['/admin/bookings', params],
    queryFn: () => adminBookingService.getAdminBookings(params),
  });

  return {
    data: queryInfo.data?.data || [], // Sửa từ items sang data cho khớp BE
    total: queryInfo.data?.meta?.total || 0, // Sửa thành meta.total cho khớp BE
    totalPages: queryInfo.data?.meta?.totalPages || 0, // Sửa thành meta.totalPages cho khớp BE
    isLoading: queryInfo.isLoading,
    error: queryInfo.error,
    mutate: queryInfo.refetch,
  };
};

export const useAdminBookingDetail = (id: string | null) => {
  const queryInfo = useQuery({
    queryKey: ['/admin/bookings', id],
    queryFn: () => adminBookingService.getAdminBookingDetail(id as string),
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
    queryFn: () => adminBookingService.getActiveTaskers(),
  });
};

export const useCreateAdminBooking = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAdminBookingDto) => adminBookingService.createAdminBooking(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/admin/bookings'] });
    }
  });
};

export const useCancelAdminBooking = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string, reason?: string }) => adminBookingService.cancelBooking(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/admin/bookings'] });
    }
  });
};

export const useAssignTaskerToBooking = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AssignTaskerDto }) => 
      adminBookingService.assignTaskerToBooking(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/admin/bookings'] });
    }
  });
};

export const useChangeBookingStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ChangeBookingStatusDto }) => 
      adminBookingService.changeBookingStatus(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/admin/bookings'] });
    }
  });
};

export const useAvailableTaskers = (bookingId: string | null, params?: { keyword?: string; page?: number; limit?: number }) => {
  return useQuery({
    queryKey: ['/admin/bookings', bookingId, 'available-taskers', params],
    queryFn: () => adminBookingService.getAvailableTaskers(bookingId!, params),
    enabled: !!bookingId,
  });
};
