export type VoucherType = "PERCENT" | "FIXED";

export interface Voucher {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  type: VoucherType;
  value: number;
  maxDiscount?: number | null;
  minOrderAmount?: number | null;
  usageLimit?: number | null;
  usedCount?: number | null;
  serviceId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface VoucherListQuery {
  page?: number;
  limit?: number;
  search?: string;
  type?: "" | VoucherType;
  isActive?: "" | boolean | string;
}

export interface VoucherListResponse {
  success: boolean;
  message?: string;
  data: Voucher[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}