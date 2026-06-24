"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminPolicyService } from "../services/admin-policy.service";

export const useCreatePolicy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminPolicyService.createPolicy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-policies"] });
    },
  });
};