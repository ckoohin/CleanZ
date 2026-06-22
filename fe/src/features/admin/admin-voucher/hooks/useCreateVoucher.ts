"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminVoucherService } from "../services/admin-voucher.service";
import { CreateVoucherPayload } from "../types/voucher.type";

export const useCreateVoucher = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateVoucherPayload) =>
      adminVoucherService.createVoucher(payload),
    onSuccess: () => {
      toast.success("Tạo voucher thành công");
      queryClient.invalidateQueries({ queryKey: ["admin-vouchers"] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Không thể tạo voucher");
    },
  });
};