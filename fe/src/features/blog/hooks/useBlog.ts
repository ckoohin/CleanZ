"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { getApiErrorMessage } from "@/lib/api/error-message";
import { adminBlogApi, adminBlogCategoryApi, blogApi } from "../services/blog.service";
import type { BlogCategoryFormInput, BlogFormInput, BlogListParams, BlogStatus } from "../types/blog.types";

export const blogKeys = {
  all: ["blogs"] as const,
  published: (params?: BlogListParams) => [...blogKeys.all, "published", params] as const,
  detail: (id: string) => [...blogKeys.all, "detail", id] as const,
  detailBySlug: (slug: string) => [...blogKeys.all, "detail-slug", slug] as const,
  adminList: (params?: BlogListParams) => [...blogKeys.all, "admin", params] as const,
  adminPreview: (id: string) => [...blogKeys.all, "admin-preview", id] as const,
  categories: (q?: string) => [...blogKeys.all, "categories", q || ""] as const,
  publicCategories: () => [...blogKeys.all, "public-categories"] as const,
  publicTags: () => [...blogKeys.all, "public-tags"] as const,
};

// Backend đã trả message tiếng Việt trực tiếp (không còn mã BLOG_* nữa), nên
// không cần bảng dịch ở client — getApiErrorMessage đọc thẳng message của server.
function getBlogErrorMessage(error: unknown, fallback: string): string {
  return getApiErrorMessage(error, fallback);
}

export function usePublishedBlogs(params?: BlogListParams) {
  return useQuery({
    queryKey: blogKeys.published(params),
    queryFn: () => blogApi.listPublished(params),
  });
}

export function usePublishedBlog(id: string) {
  return useQuery({
    queryKey: blogKeys.detail(id),
    queryFn: () => blogApi.findPublished(id),
    enabled: Boolean(id),
  });
}

export function usePublishedBlogBySlug(slug: string) {
  return useQuery({
    queryKey: blogKeys.detailBySlug(slug),
    queryFn: () => blogApi.findPublishedBySlug(slug),
    enabled: Boolean(slug),
  });
}

export function useAdminBlogs(params?: BlogListParams) {
  return useQuery({
    queryKey: blogKeys.adminList(params),
    queryFn: () => adminBlogApi.list(params),
  });
}

export function useAdminBlogPreview(id?: string) {
  return useQuery({
    queryKey: blogKeys.adminPreview(id || ""),
    queryFn: () => adminBlogApi.preview(id || ""),
    enabled: Boolean(id),
  });
}

export function useAdminBlogCategories(q?: string) {
  return useQuery({
    queryKey: blogKeys.categories(q),
    queryFn: () => adminBlogCategoryApi.list(q),
  });
}

export function usePublicBlogCategories() {
  return useQuery({
    queryKey: blogKeys.publicCategories(),
    queryFn: () => blogApi.listCategories(),
  });
}

export function usePublicBlogTags() {
  return useQuery({
    queryKey: blogKeys.publicTags(),
    queryFn: () => blogApi.listTags(),
  });
}

export function useSaveBlog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: BlogFormInput }) =>
      id ? adminBlogApi.update(id, data) : adminBlogApi.create(data),
    onSuccess: () => {
      toast.success("Đã lưu bài viết");
      void queryClient.invalidateQueries({ queryKey: blogKeys.all });
    },
    onError: (error) => {
      toast.error(getBlogErrorMessage(error, "Không thể lưu bài viết. Vui lòng kiểm tra lại thông tin."));
    },
  });
}

export function useDeleteBlog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminBlogApi.remove,
    onSuccess: () => {
      toast.success("Đã xóa bài viết");
      void queryClient.invalidateQueries({ queryKey: blogKeys.all });
    },
    onError: (error) => {
      toast.error(getBlogErrorMessage(error, "Không thể xóa bài viết. Vui lòng thử lại."));
    },
  });
}

export function useChangeBlogStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: BlogStatus }) =>
      adminBlogApi.changeStatus(id, status),
    onSuccess: () => {
      toast.success("Đã cập nhật trạng thái");
      void queryClient.invalidateQueries({ queryKey: blogKeys.all });
    },
    onError: (error) => {
      toast.error(getBlogErrorMessage(error, "Không thể cập nhật trạng thái. Vui lòng thử lại."));
    },
  });
}

export function useCreateBlogCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BlogCategoryFormInput) => adminBlogCategoryApi.create(data),
    onSuccess: () => {
      toast.success("Đã tạo danh mục");
      void queryClient.invalidateQueries({ queryKey: blogKeys.all });
    },
    onError: (error) => {
      toast.error(getBlogErrorMessage(error, "Không thể tạo danh mục. Vui lòng kiểm tra lại thông tin."));
    },
  });
}

export function useUpdateBlogCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: BlogCategoryFormInput }) => adminBlogCategoryApi.update(id, data),
    onSuccess: () => {
      toast.success("Đã cập nhật danh mục");
      void queryClient.invalidateQueries({ queryKey: blogKeys.all });
    },
    onError: (error) => {
      toast.error(getBlogErrorMessage(error, "Không thể cập nhật danh mục. Vui lòng kiểm tra lại thông tin."));
    },
  });
}

export function useDeleteBlogCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminBlogCategoryApi.remove,
    onSuccess: () => {
      toast.success("Đã xóa danh mục");
      void queryClient.invalidateQueries({ queryKey: blogKeys.all });
    },
    onError: (error) => {
      toast.error(getBlogErrorMessage(error, "Không thể xóa danh mục. Vui lòng thử lại."));
    },
  });
}
