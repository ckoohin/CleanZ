"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminVoucherService } from "../services/admin-voucher.service";
import { getApiErrorMessage } from "@/lib/api/error-message";

function getErrorMessage(error: unknown, fallback: string) {
  return getApiErrorMessage(error, fallback);
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
