"use client";

import { useQuery } from "@tanstack/react-query";
import { adminVoucherService } from "../services/admin-voucher.service";
import { VoucherListQuery } from "../types/voucher.type";

export function useAdminVouchers(query: VoucherListQuery) {
  return useQuery({
    queryKey: ["admin-vouchers", query],
    queryFn: () => adminVoucherService.getVouchers(query),
  });
}
