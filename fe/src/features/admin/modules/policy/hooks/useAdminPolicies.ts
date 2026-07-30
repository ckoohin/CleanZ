'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { adminPolicyService } from '../services/admin-policy.service';
import { PolicyCategory } from '../types/policy.type';

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const POLICY_KEYS = {
  all:       ['admin-policies'] as const,
  list:      (cat?: PolicyCategory) => ['admin-policies', { cat }] as const,
  defaults:  ['admin-policies-defaults'] as const,
  byPackage: (pkgId: string) => ['admin-policies-package', pkgId] as const,
};

// ─── Queries ─────────────────────────────────────────────────────────────────

export const useAdminPolicies = (category?: PolicyCategory) =>
  useQuery({
    queryKey: POLICY_KEYS.list(category),
    queryFn: () => adminPolicyService.getPolicies(category),
  });

export const useAdminPolicyDefaults = () =>
  useQuery({
    queryKey: POLICY_KEYS.defaults,
    queryFn: () => adminPolicyService.getDefaults(),
  });

export const usePackagePolicies = (packageId: string) =>
  useQuery({
    queryKey: POLICY_KEYS.byPackage(packageId),
    queryFn: () => adminPolicyService.getPoliciesByPackage(packageId),
    enabled: !!packageId,
  });

// ─── Mutations ────────────────────────────────────────────────────────────────

export const useSeedPolicies = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => adminPolicyService.seedDefaults(),
    onSuccess: (data) => {
      toast.success(`Seed xong: +${data.created} mới, ${data.skipped} đã có`);
      qc.invalidateQueries({ queryKey: POLICY_KEYS.all });
    },
  });
};

export const useAssignPoliciesToPackage = (packageId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (policyIds: string[]) =>
      adminPolicyService.assignToPackage(packageId, policyIds),
    onSuccess: () => {
      toast.success('Đã gán chính sách!');
      qc.invalidateQueries({ queryKey: POLICY_KEYS.byPackage(packageId) });
    },
  });
};

export const useRemovePolicyFromPackage = (packageId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (policyId: string) =>
      adminPolicyService.removeFromPackage(packageId, policyId),
    onSuccess: () => {
      toast.success('Đã gỡ chính sách!');
      qc.invalidateQueries({ queryKey: POLICY_KEYS.byPackage(packageId) });
    },
  });
};

export const useApplyDefaultPolicies = (packageId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => adminPolicyService.applyDefaults(packageId),
    onSuccess: () => {
      toast.success('Đã áp dụng chính sách mặc định!');
      qc.invalidateQueries({ queryKey: POLICY_KEYS.byPackage(packageId) });
    },
  });
};

export const usePackagesByPolicy = (policyId: string) =>
  useQuery({
    queryKey: ['policy-packages', policyId],
    queryFn: () => adminPolicyService.getPackagesByPolicy(policyId),
    enabled: !!policyId,
  });
