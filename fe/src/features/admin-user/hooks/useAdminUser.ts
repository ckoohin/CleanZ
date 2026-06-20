import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminUserApi } from "../services/admin-user.service";
import type {
  CreateUserPayload,
  UpdateUserPayload,
  UserQueryFilter,
} from "../types/user.types";

export const adminUserKeys = {
  all: ["admin-user"] as const,
  lists: () => [...adminUserKeys.all, "list"] as const,
  list: (filter: UserQueryFilter) => [...adminUserKeys.lists(), filter] as const,
  details: () => [...adminUserKeys.all, "detail"] as const,
  detail: (id: string) => [...adminUserKeys.details(), id] as const,
};

const errorMessage = (error: unknown, fallback: string): string => {
  const e = error as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message || fallback;
};

export function useAdminUsers(filter: UserQueryFilter) {
  return useQuery({
    queryKey: adminUserKeys.list(filter),
    queryFn: () => adminUserApi.getUsers(filter),
  });
}

export function useAdminUserDetail(id: string) {
  return useQuery({
    queryKey: adminUserKeys.detail(id),
    queryFn: () => adminUserApi.getUser(id),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateUserPayload) => adminUserApi.createUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminUserKeys.all });
      toast.success("Tạo người dùng thành công!");
    },
    onError: (error) => {
      toast.error(errorMessage(error, "Có lỗi xảy ra khi tạo người dùng!"));
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserPayload }) =>
      adminUserApi.updateUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminUserKeys.all });
      toast.success("Cập nhật người dùng thành công!");
    },
    onError: (error) => {
      toast.error(errorMessage(error, "Có lỗi xảy ra khi cập nhật người dùng!"));
    },
  });
}

export function useToggleUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminUserApi.toggleStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminUserKeys.all });
      toast.success("Cập nhật trạng thái người dùng thành công!");
    },
    onError: (error) => {
      toast.error(errorMessage(error, "Có lỗi xảy ra khi cập nhật trạng thái!"));
    },
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: (id: string) => adminUserApi.resetPassword(id),
    onSuccess: () => {
      toast.success("Đã gửi email đặt lại mật khẩu cho người dùng!");
    },
    onError: (error) => {
      toast.error(errorMessage(error, "Có lỗi xảy ra khi gửi email đặt lại mật khẩu!"));
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminUserApi.softDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminUserKeys.all });
      toast.success("Đã xóa người dùng!");
    },
    onError: (error) => {
      toast.error(errorMessage(error, "Có lỗi xảy ra khi xóa người dùng!"));
    },
  });
}
