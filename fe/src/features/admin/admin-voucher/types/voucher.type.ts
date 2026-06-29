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
  perCustomerLimit?: number | null;
  usedCount?: number | null;
  reservedCount?: number | null;
  packageIds?: string[] | null;
  customerIds?: string[] | null;
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
  isActive?: "" | "true" | "false";
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

export interface CreateVoucherPayload {
  code: string;
  name: string;
  description?: string;
  type: VoucherType;
  value: number;
  maxDiscount?: number;
  minOrderAmount?: number;
  usageLimit?: number;
  perCustomerLimit?: number;
  packageIds?: string[];
  customerIds?: string[];
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export type UpdateVoucherPayload = Partial<CreateVoucherPayload>;

export interface VoucherStats {
  voucher: Voucher;
  issuedCount: number;
  reservedCount: number;
  usedCount: number;
}
