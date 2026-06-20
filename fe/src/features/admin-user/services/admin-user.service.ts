import http from "@/lib/api/http";
import type {
  AdminUser,
  CreateUserPayload,
  PaginatedUsers,
  UpdateUserPayload,
  UserDetail,
  UserQueryFilter,
} from "../types/user.types";

const BASE = "/users";

/**
 * The backend wraps responses as `{ success, message, data }` (ResponseHelper).
 * `GET /users` nests the page one level deeper: `data.data = { data, total, page, limit }`.
 * Every method here returns the already-unwrapped `res.data.data`.
 */
export const adminUserApi = {
  getUsers: (params: UserQueryFilter): Promise<PaginatedUsers> =>
    http.get(BASE, { params }).then((res) => res.data.data),

  getUser: (id: string): Promise<UserDetail> =>
    http.get(`${BASE}/${id}`).then((res) => res.data.data),

  createUser: (payload: CreateUserPayload): Promise<AdminUser> =>
    http.post(BASE, payload).then((res) => res.data.data),

  updateUser: (id: string, payload: UpdateUserPayload): Promise<AdminUser> =>
    http.patch(`${BASE}/${id}`, payload).then((res) => res.data.data),

  toggleStatus: (id: string, isActive: boolean): Promise<AdminUser> =>
    http.patch(`${BASE}/${id}/status`, { isActive }).then((res) => res.data.data),

  resetPassword: (id: string): Promise<void> =>
    http.post(`${BASE}/${id}/reset-password`).then(() => undefined),

  softDelete: (id: string): Promise<void> =>
    http.delete(`${BASE}/${id}`).then(() => undefined),
};
