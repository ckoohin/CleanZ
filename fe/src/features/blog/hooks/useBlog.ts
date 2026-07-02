"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminBlogApi, blogApi } from "../services/blog.service";
import type { BlogFormInput, BlogListParams, BlogStatus } from "../types/blog.types";

export const blogKeys = {
  all: ["blogs"] as const,
  published: (params?: BlogListParams) => [...blogKeys.all, "published", params] as const,
  detail: (id: string) => [...blogKeys.all, "detail", id] as const,
  adminList: (params?: BlogListParams) => [...blogKeys.all, "admin", params] as const,
};

function getBlogErrorMessage(error: unknown, fallback: string): string {
  const response = (error as { response?: { data?: { message?: string; errorCode?: string } } })?.response?.data;
  const message = response?.message || response?.errorCode;

  if (message === "BLOG_SLUG_EXISTS") return "Đường dẫn bài viết đã tồn tại.";
  if (message === "BLOG_CATEGORY_NOT_FOUND") return "Danh mục không tồn tại.";
  if (message === "BLOG_SLUG_REQUIRED") return "Vui lòng nhập đường dẫn bài viết.";
  if (typeof message === "string" && message.trim()) return message;

  return fallback;
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

export function useAdminBlogs(params?: BlogListParams) {
  return useQuery({
    queryKey: blogKeys.adminList(params),
    queryFn: () => adminBlogApi.list(params),
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
