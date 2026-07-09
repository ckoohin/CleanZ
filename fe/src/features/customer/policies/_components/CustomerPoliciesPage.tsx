'use client';

import { PoliciesView } from '@/components/common/PoliciesView';
import { useCustomerPolicies } from '../hooks/useCustomerPolicies';

export function CustomerPoliciesPage() {
  const { data: policies = [], isLoading, isError } = useCustomerPolicies();

  return (
    <PoliciesView
      policies={policies}
      isLoading={isLoading}
      isError={isError}
      backHref="/customer"
      backLabel="Quay lại Trang chủ"
      title="Chính sách khách hàng"
      description="Các quy định và điều khoản áp dụng khi sử dụng dịch vụ CleanZ."
    />
  );
}
