"use client";

import { useQuery } from "@tanstack/react-query";
import { getAdminVouchers } from "../apis/voucher.api";
import { VoucherListQuery } from "../types/voucher.type";

export function useAdminVouchers(query: VoucherListQuery) {
  return useQuery({
    queryKey: ["admin-vouchers", query],
    queryFn: () => getAdminVouchers(query),
  });
}