'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { adminPolicyService } from '../services/admin-policy.service';
import { UpdatePolicyPayload } from '../types/policy.type';

type UpdatePolicyInput = {
  id: string;
  payload: UpdatePolicyPayload;
};

export const useUpdatePolicy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: UpdatePolicyInput) =>
      adminPolicyService.updatePolicy(id, payload),
    onSuccess: () => {
      toast.success('Cập nhật chính sách thành công');
      queryClient.invalidateQueries({ queryKey: ['admin-policies'] });
    },
  });
};