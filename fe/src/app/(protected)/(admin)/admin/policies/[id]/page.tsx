'use client';

import React, { use } from 'react';
import { PolicyDetailView } from '@/features/admin/modules/policy/_components/PolicyDetailView';

export default function AdminPolicyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <PolicyDetailView id={id} />;
}