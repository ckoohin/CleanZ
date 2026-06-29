"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminPolicyService } from "../services/admin-policy.service";

export const useDeletePolicy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => adminPolicyService.deletePolicy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-policies"] });
    },
  });
};