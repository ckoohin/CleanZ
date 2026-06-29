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
  });
}
