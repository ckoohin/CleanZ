'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { adminPolicyService } from '../services/admin-policy.service';
import { CreatePolicyPayload } from '../types/policy.type';

export const useCreatePolicy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePolicyPayload) =>
      adminPolicyService.createPolicy(payload),
    onSuccess: () => {
      toast.success('Tạo chính sách thành công');
      queryClient.invalidateQueries({ queryKey: ['admin-policies'] });
    },
  });
};