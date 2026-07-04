import http from "@/lib/api/http";
import { API_ENDPOINTS } from "@/constants/api-endpoints";
import type {
  BlogCategory,
  BlogCategoryFormInput,
  BlogFormInput,
  BlogListParams,
  BlogListResponse,
  BlogPost,
  BlogStatus,
  BlogTag,
} from "../types/blog.types";

const ADMIN_BLOG_CATEGORIES_ENDPOINT = "/blog/admin/categories";
const PUBLIC_BLOG_CATEGORIES_ENDPOINT = "/blog/categories";
const PUBLIC_BLOG_TAGS_ENDPOINT = "/blog/tags";

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  message?: string;
};

type ApiPaginated<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

function unwrap<T>(payload: T | ApiEnvelope<T>): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as ApiEnvelope<T>).data as T;
  }
  return payload as T;
}

function normalizeList(payload: ApiEnvelope<ApiPaginated<BlogPost>> | ApiPaginated<BlogPost>): BlogListResponse {
  const data = unwrap<ApiPaginated<BlogPost>>(payload);
  return {
    data: data.items ?? [],
    meta: {
      total: data.total ?? 0,
      page: data.page ?? 1,
      limit: data.limit ?? 10,
      totalPages: data.totalPages ?? 1,
    },
  };
}

function cleanListParams(params?: BlogListParams): BlogListParams | undefined {
  if (!params) return undefined;

  const cleaned: BlogListParams = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value === "" || value === null || value === undefined) return;
    cleaned[key as keyof BlogListParams] = value as never;
  });

  return cleaned;
}

export const blogApi = {
  listPublished: (params?: BlogListParams): Promise<BlogListResponse> =>
    http
      .get(API_ENDPOINTS.BLOG.BASE, {
        params: cleanListParams({ ...params, status: undefined }),
      })
      .then((r) => normalizeList(r.data)),

  findPublished: (id: string): Promise<BlogPost> =>
    http.get(API_ENDPOINTS.BLOG.DETAIL(id)).then((r) => unwrap<BlogPost>(r.data)),

  findPublishedBySlug: (slug: string): Promise<BlogPost> =>
    http.get(`${API_ENDPOINTS.BLOG.BASE}/slug/${encodeURIComponent(slug)}`).then((r) => unwrap<BlogPost>(r.data)),

  listCategories: (): Promise<BlogCategory[]> =>
    http.get(PUBLIC_BLOG_CATEGORIES_ENDPOINT).then((r) => unwrap<BlogCategory[]>(r.data)),

  listTags: (): Promise<BlogTag[]> =>
    http.get(PUBLIC_BLOG_TAGS_ENDPOINT).then((r) => unwrap<BlogTag[]>(r.data)),
};

export const adminBlogApi = {
  list: (params?: BlogListParams): Promise<BlogListResponse> =>
    http.get(API_ENDPOINTS.BLOG.ADMIN_ALL, { params }).then((r) => normalizeList(r.data)),

  create: (dto: BlogFormInput): Promise<BlogPost> =>
    http.post(API_ENDPOINTS.BLOG.ADMIN_BASE, dto).then((r) => unwrap<BlogPost>(r.data)),

  update: (id: string, dto: BlogFormInput): Promise<BlogPost> =>
    http.patch(API_ENDPOINTS.BLOG.ADMIN_DETAIL(id), dto).then((r) => unwrap<BlogPost>(r.data)),

  remove: (id: string): Promise<void> =>
    http.delete(API_ENDPOINTS.BLOG.ADMIN_DETAIL(id)).then(() => undefined),

  changeStatus: (id: string, status: BlogStatus): Promise<BlogPost> =>
    http
      .patch(API_ENDPOINTS.BLOG.ADMIN_STATUS(id), { status })
      .then((r) => unwrap<BlogPost>(r.data)),

  preview: (id: string): Promise<BlogPost> =>
    http.get(`${API_ENDPOINTS.BLOG.ADMIN_BASE}/${id}/preview`).then((r) => unwrap<BlogPost>(r.data)),
};

export const adminBlogCategoryApi = {
  list: (q?: string): Promise<BlogCategory[]> =>
    http
      .get(ADMIN_BLOG_CATEGORIES_ENDPOINT, { params: { q: q || undefined } })
      .then((r) => unwrap<BlogCategory[]>(r.data)),

  create: (dto: BlogCategoryFormInput): Promise<BlogCategory> =>
    http
      .post(ADMIN_BLOG_CATEGORIES_ENDPOINT, dto)
      .then((r) => unwrap<BlogCategory>(r.data)),

  update: (id: string, dto: BlogCategoryFormInput): Promise<BlogCategory> =>
    http
      .patch(`${ADMIN_BLOG_CATEGORIES_ENDPOINT}/${id}`, dto)
      .then((r) => unwrap<BlogCategory>(r.data)),

  remove: (id: string): Promise<void> =>
    http.delete(`${ADMIN_BLOG_CATEGORIES_ENDPOINT}/${id}`).then(() => undefined),
};
