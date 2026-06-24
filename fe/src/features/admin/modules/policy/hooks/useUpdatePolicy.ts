"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminPolicyService } from "../services/admin-policy.service";
import { UpdatePolicyPayload } from "../types/policy.type";

type UpdateArgs = {
  id: string;
  payload: UpdatePolicyPayload;
};

export const useUpdatePolicy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: UpdateArgs) =>
      adminPolicyService.updatePolicy(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-policies"] });
      queryClient.invalidateQueries({
        queryKey: ["admin-policy-detail", variables.id],
      });
    },
  });
};