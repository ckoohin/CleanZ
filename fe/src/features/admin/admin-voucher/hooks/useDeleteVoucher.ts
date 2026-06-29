"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminVoucherService } from "../services/admin-voucher.service";

type ApiError = {
  response?: {
    data?: {
      message?: string;
    };
  };
};

function getErrorMessage(error: unknown, fallback: string) {
  return (error as ApiError)?.response?.data?.message || fallback;
}

export const useDeleteVoucher = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => adminVoucherService.deleteVoucher(id),
    onSuccess: () => {
      toast.success("Xóa voucher thành công");
      queryClient.invalidateQueries({ queryKey: ["admin-vouchers"] });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Không thể xóa voucher"));
    },
  });
};
