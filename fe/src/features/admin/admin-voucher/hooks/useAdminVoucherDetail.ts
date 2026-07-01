"use client";

import { useQuery } from "@tanstack/react-query";
import { adminVoucherService } from "../services/admin-voucher.service";

export const useAdminVoucherDetail = (id: string) => {
  return useQuery({
    queryKey: ["admin-voucher-detail", id],
    queryFn: () => adminVoucherService.getVoucherById(id),
    enabled: !!id,
  });
};

export const useAdminVoucherStats = (id: string) => {
  return useQuery({
    queryKey: ["admin-voucher-stats", id],
    queryFn: () => adminVoucherService.getVoucherStats(id),
    enabled: !!id,
  });
};
