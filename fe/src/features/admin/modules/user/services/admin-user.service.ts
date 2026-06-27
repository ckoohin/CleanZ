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
 * Backend response shapes are NOT uniform here:
 *  - `GET /users` & `GET /users/:id` are ResponseHelper-wrapped → unwrap `res.data.data`.
 *  - `POST /users`, `PATCH /users/:id`, `PATCH /users/:id/status` return the RAW entity → `res.data`.
 */
export const adminUserApi = {
  getUsers: (params: UserQueryFilter): Promise<PaginatedUsers> =>
    http.get(BASE, { params }).then((res) => res.data.data),

  getUser: (id: string): Promise<UserDetail> =>
    http.get(`${BASE}/${id}`).then((res) => res.data.data),

  createUser: (payload: CreateUserPayload): Promise<AdminUser> =>
    http.post(BASE, payload).then((res) => res.data),

  updateUser: (id: string, payload: UpdateUserPayload): Promise<AdminUser> =>
    http.patch(`${BASE}/${id}`, payload).then((res) => res.data),

  toggleStatus: (id: string, isActive: boolean): Promise<AdminUser> =>
    http.patch(`${BASE}/${id}/status`, { isActive }).then((res) => res.data),

  resetPassword: (id: string): Promise<void> =>
    http.post(`${BASE}/${id}/reset-password`).then(() => undefined),

  softDelete: (id: string): Promise<void> =>
    http.delete(`${BASE}/${id}`).then(() => undefined),

  restoreUser: (id: string): Promise<void> =>
    http.patch(`${BASE}/${id}/restore`).then(() => undefined),
};
