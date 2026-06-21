"use client";

import { useQuery } from "@tanstack/react-query";
import { adminPolicyService } from "../services/admin-policy.service";

export const useAdminPolicyDetail = (id: string) => {
  return useQuery({
    queryKey: ["admin-policy-detail", id],
    queryFn: () => adminPolicyService.getPolicyById(id),
    enabled: !!id,
  });
};