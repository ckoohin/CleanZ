import { useQuery } from "@tanstack/react-query";
import http from "@/lib/api/http";

export interface CategoryEntity {
  id: string;
  name: string;
  slug: string;
  iconUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryDto {
  name: string;
  slug?: string;
  iconUrl?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export type UpdateCategoryDto = Partial<CreateCategoryDto>;

export const adminCategoriesKeys = {
  all: ["adminCategories"] as const,
};

const getAdminCategories = async (): Promise<CategoryEntity[]> => {
  const { data } = await http.get("/admin/categories");
  return data.data; // Assuming successResponse returns { data: [...] }
};

export function useAdminCategories() {
  return useQuery({
    queryKey: adminCategoriesKeys.all,
    queryFn: getAdminCategories,
  });
}

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AxiosError } from "axios";

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateCategoryDto) => {
      const { data } = await http.post("/admin/categories", payload);
      return data.data;
    },
    onSuccess: () => {
      toast.success("Tạo danh mục thành công!");
      queryClient.invalidateQueries({ queryKey: adminCategoriesKeys.all });
    },
    onError: (error: unknown) => {
      const err = error as AxiosError<{ message: string }>;
      toast.error(err.response?.data?.message || "Có lỗi xảy ra khi tạo danh mục");
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateCategoryDto }) => {
      const { data } = await http.patch(`/admin/categories/${id}`, payload);
      return data.data;
    },
    onSuccess: () => {
      toast.success("Cập nhật danh mục thành công!");
      queryClient.invalidateQueries({ queryKey: adminCategoriesKeys.all });
    },
    onError: (error: unknown) => {
      const err = error as AxiosError<{ message: string }>;
      toast.error(err.response?.data?.message || "Có lỗi xảy ra khi cập nhật");
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await http.delete(`/admin/categories/${id}`);
    },
    onSuccess: () => {
      toast.success("Xóa danh mục thành công!");
      queryClient.invalidateQueries({ queryKey: adminCategoriesKeys.all });
    },
    onError: (error: unknown) => {
      const err = error as AxiosError<{ message: string }>;
      toast.error(err.response?.data?.message || "Có lỗi xảy ra khi xóa");
    },
  });
}
