"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminVoucherService } from "../services/admin-voucher.service";

export const useDeleteVoucher = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => adminVoucherService.deleteVoucher(id),
    onSuccess: () => {
      toast.success("Xóa voucher thành công");
      queryClient.invalidateQueries({ queryKey: ["admin-vouchers"] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Không thể xóa voucher");
    },
  });
};