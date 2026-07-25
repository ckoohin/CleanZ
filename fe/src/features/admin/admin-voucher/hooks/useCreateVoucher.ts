"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { adminVoucherService } from "../services/admin-voucher.service";
import { CreateVoucherPayload } from "../types/voucher.type";
import { getApiErrorMessage } from "@/lib/api/error-message";

function getErrorMessage(error: unknown, fallback: string) {
  return getApiErrorMessage(error, fallback);
}

export const useCreateVoucher = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateVoucherPayload) =>
      adminVoucherService.createVoucher(payload),
    onSuccess: () => {
      toast.success("Tạo voucher thành công");
      queryClient.invalidateQueries({ queryKey: ["admin-vouchers"] });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Không thể tạo voucher"));
    },
  });
};
