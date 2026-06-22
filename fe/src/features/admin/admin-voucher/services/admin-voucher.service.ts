import http from "@/lib/api/http";
import {
  CreateVoucherPayload,
  UpdateVoucherPayload,
  Voucher,
  VoucherListQuery,
  VoucherListResponse,
  VoucherStats,
} from "../types/voucher.type";

function normalizePaginatedResponse(raw: any): VoucherListResponse {
  // Hỗ trợ nhiều format BE khác nhau
  // dạng 1: { data, total, page, limit, totalPages }
  if (raw?.data && Array.isArray(raw.data)) {
    return {
      data: raw.data,
      total: Number(raw.total ?? 0),
      page: Number(raw.page ?? 1),
      limit: Number(raw.limit ?? 20),
      totalPages:
        Number(raw.totalPages ?? Math.ceil((raw.total ?? 0) / (raw.limit ?? 20))) || 1,
    };
  }

  // dạng 2: { items, total, page, limit }
  if (raw?.items && Array.isArray(raw.items)) {
    return {
      data: raw.items,
      total: Number(raw.total ?? 0),
      page: Number(raw.page ?? 1),
      limit: Number(raw.limit ?? 20),
      totalPages:
        Number(raw.totalPages ?? Math.ceil((raw.total ?? 0) / (raw.limit ?? 20))) || 1,
    };
  }

  // fallback
  return {
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

    const raw = response.data?.data ?? response.data;
    return normalizePaginatedResponse(raw);
  },

  async getVoucherById(id: string): Promise<Voucher> {
    const response = await http.get(`/admin/vouchers/${id}`);
    return response.data?.data ?? response.data;
  },

  async createVoucher(payload: CreateVoucherPayload): Promise<Voucher> {
    const response = await http.post("/admin/vouchers", payload);
    return response.data?.data ?? response.data;
  },

  async updateVoucher(id: string, payload: UpdateVoucherPayload): Promise<Voucher> {
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