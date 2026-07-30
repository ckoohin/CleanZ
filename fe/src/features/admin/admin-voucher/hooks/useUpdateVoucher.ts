"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { adminVoucherService } from "../services/admin-voucher.service";
import { UpdateVoucherPayload } from "../types/voucher.type";
import { getApiErrorMessage } from "@/lib/api/error-message";

function getErrorMessage(error: unknown, fallback: string) {
  return getApiErrorMessage(error, fallback);
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
