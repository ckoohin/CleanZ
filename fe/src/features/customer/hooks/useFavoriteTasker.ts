import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { favoriteTaskerApi } from "../services/favorite-tasker.service";
import { getApiErrorMessage } from "@/lib/api/error-message";
import type { FavoriteTaskerAvailabilityParams } from "@/features/booking/types/booking.types";

export const favoriteTaskerKeys = {
  all: ["favorite-taskers"] as const,
};

export function useFavoriteTaskers(enabled = true) {
  return useQuery({
    queryKey: favoriteTaskerKeys.all,
    queryFn: favoriteTaskerApi.list,
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useFavoriteTaskerAvailability(
  params: FavoriteTaskerAvailabilityParams,
  enabled = true,
) {
  return useQuery({
    queryKey: [...favoriteTaskerKeys.all, "availability", params],
    queryFn: () => favoriteTaskerApi.listAvailability(params),
    enabled:
      enabled &&
      !!params.scheduledDate &&
      !!params.scheduledTime &&
      params.durationHours > 0,
    staleTime: 30 * 1000,
  });
}

export function useFavoriteTaskerContact(
  taskerId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: [...favoriteTaskerKeys.all, "contact", taskerId],
    queryFn: () => favoriteTaskerApi.getContact(taskerId!),
    enabled: enabled && !!taskerId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAddFavoriteTasker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskerId, note }: { taskerId: string; note?: string }) =>
      favoriteTaskerApi.add(taskerId, note),
    onSuccess: () => {
      toast.success("Đã thêm vào danh sách thợ yêu thích ❤️");
      void qc.invalidateQueries({ queryKey: favoriteTaskerKeys.all });
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, "Không thể thêm thợ yêu thích"));
    },
  });
}

export function useRemoveFavoriteTasker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskerId: string) => favoriteTaskerApi.remove(taskerId),
    onSuccess: () => {
      toast.success("Đã bỏ khỏi danh sách yêu thích");
      void qc.invalidateQueries({ queryKey: favoriteTaskerKeys.all });
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, "Không thể xóa thợ yêu thích"));
    },
  });
}
