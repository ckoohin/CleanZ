"use client";

import { useQuery } from "@tanstack/react-query";
import http from "@/lib/api/http";
import { API_ENDPOINTS } from "@/constants/api-endpoints";

export type VoucherDisabledReason =
  | "NOT_STARTED"
  | "EXHAUSTED"
  | "PER_LIMIT_REACHED"
  | null;

export interface AvailableVoucher {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  type: "PERCENT" | "FIXED";
  value: number;
  maxDiscount?: number | null;
  minOrderAmount: number;
  endDate?: string | null;
  remainingUses?: number | null;
  canUse: boolean;
  disabledReason: VoucherDisabledReason;
  source: "ISSUED" | "PUBLIC";
}

async function fetchAvailableVouchers(
  packageId?: string,
): Promise<AvailableVoucher[]> {
  const res = await http.get(API_ENDPOINTS.CUSTOMER.VOUCHERS_AVAILABLE, {
    params: packageId ? { packageId } : undefined,
  });
  return res.data?.data ?? [];
}

export function useCustomerVouchers(packageId?: string) {
  return useQuery({
    queryKey: ["customer-vouchers-available", packageId],
    queryFn: () => fetchAvailableVouchers(packageId),
    staleTime: 30_000,
  });
}
