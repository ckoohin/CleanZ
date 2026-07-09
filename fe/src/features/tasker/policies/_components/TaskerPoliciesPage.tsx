'use client';

import { PoliciesView } from '@/components/common/PoliciesView';
import { useTaskerPolicies } from '../hooks/useTaskerPolicies';

export function TaskerPoliciesPage() {
  const { data: policies = [], isLoading, isError } = useTaskerPolicies();

  return (
    <PoliciesView
      policies={policies}
      isLoading={isLoading}
      isError={isError}
      backHref="/tasker"
      backLabel="Quay lại Dashboard"
      title="Chính sách đối tác"
      description="Các quy định và tiêu chuẩn áp dụng cho Tasker trên nền tảng CleanZ."
    />
  );
}
