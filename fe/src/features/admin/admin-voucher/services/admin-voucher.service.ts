import http from "@/lib/api/http";
import {
  CreateVoucherPayload,
  UpdateVoucherPayload,
  Voucher,
  VoucherListQuery,
  VoucherListResponse,
  VoucherStats,
} from "../types/voucher.type";

type RawPaginatedVoucherResponse =
  | Voucher[]
  | {
      success?: boolean;
      message?: string;
      data?:
        | Voucher[]
        | {
            items?: Voucher[];
            data?: Voucher[];
            total?: number;
            page?: number;
            limit?: number;
            totalPages?: number;
          };
      items?: Voucher[];
      total?: number;
      page?: number;
      limit?: number;
      totalPages?: number;
    }
  | null
  | undefined;

function normalizePaginatedResponse(
  raw: RawPaginatedVoucherResponse,
): VoucherListResponse {
  const success = !raw || Array.isArray(raw) ? true : raw.success ?? true;
  const message = !raw || Array.isArray(raw) ? undefined : raw.message;

  if (Array.isArray(raw)) {
    return {
      success,
      message,
      data: raw,
      total: raw.length,
      page: 1,
      limit: raw.length || 20,
      totalPages: 1,
    };
  }

  const nested = raw?.data;

  if (nested && !Array.isArray(nested) && Array.isArray(nested.items)) {
    const total = Number(nested.total ?? nested.items.length);
    const page = Number(nested.page ?? 1);
    const limit = Number(nested.limit ?? 20);
    return {
      success,
      message,
      data: nested.items,
      total,
      page,
      limit,
      totalPages: Number(nested.totalPages ?? Math.ceil(total / limit)) || 1,
    };
  }

  if (nested && Array.isArray(nested)) {
    const total = Number(raw.total ?? nested.length);
    const page = Number(raw.page ?? 1);
    const limit = Number(raw.limit ?? 20);
    return {
      success,
      message,
      data: nested,
      total,
      page,
      limit,
      totalPages: Number(raw.totalPages ?? Math.ceil(total / limit)) || 1,
    };
  }

  if (raw?.items && Array.isArray(raw.items)) {
    const total = Number(raw.total ?? raw.items.length);
    const page = Number(raw.page ?? 1);
    const limit = Number(raw.limit ?? 20);
    return {
      success,
      message,
      data: raw.items,
      total,
      page,
      limit,
      totalPages: Number(raw.totalPages ?? Math.ceil(total / limit)) || 1,
    };
  }

  return {
    success,
    message,
    data: [],
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  };
}

export const adminVoucherService = {
  async getVouchers(query?: VoucherListQuery): Promise<VoucherListResponse> {
    const response = await http.get("/admin/vouchers", {
      params: query,
    });

    return normalizePaginatedResponse(response.data);
  },

  async getVoucherById(id: string): Promise<Voucher> {
    const response = await http.get(`/admin/vouchers/${id}`);
    return response.data?.data ?? response.data;
  },

  async createVoucher(payload: CreateVoucherPayload): Promise<Voucher> {
    const response = await http.post("/admin/vouchers", payload);
    return response.data?.data ?? response.data;
  },

  async updateVoucher(
    id: string,
    payload: UpdateVoucherPayload,
  ): Promise<Voucher> {
    const response = await http.patch(`/admin/vouchers/${id}`, payload);
    return response.data?.data ?? response.data;
  },

  async deleteVoucher(id: string): Promise<void> {
    await http.delete(`/admin/vouchers/${id}`);
  },

  async getVoucherStats(id: string): Promise<VoucherStats> {
    const response = await http.get(`/admin/vouchers/${id}/stats`);
    return response.data?.data ?? response.data;
  },
};
