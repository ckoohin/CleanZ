'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { adminPolicyService } from '../services/admin-policy.service';

export const useDeletePolicy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => adminPolicyService.deletePolicy(id),
    onSuccess: () => {
      toast.success('Xóa chính sách thành công');
      queryClient.invalidateQueries({ queryKey: ['admin-policies'] });
    },
  });
};