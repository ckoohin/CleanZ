"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminVoucherService } from "../services/admin-voucher.service";
import { UpdateVoucherPayload } from "../types/voucher.type";

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

export const useUpdateVoucher = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateVoucherPayload }) =>
      adminVoucherService.updateVoucher(id, payload),
    onSuccess: (_, variables) => {
      toast.success("Cập nhật voucher thành công");
      queryClient.invalidateQueries({ queryKey: ["admin-vouchers"] });
      queryClient.invalidateQueries({
        queryKey: ["admin-voucher-detail", variables.id],
      });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Không thể cập nhật voucher"));
    },
  });
};
