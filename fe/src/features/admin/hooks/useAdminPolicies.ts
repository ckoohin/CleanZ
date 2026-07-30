import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import {
  adminPolicyService,
  CreatePolicyDto,
  UpdatePolicyDto,
  PolicyCategory,
} from '../services/admin-policy.service';

// ─── Query Keys ────────────────────────────────────────────────────────────────

export const POLICY_KEYS = {
  all:            ['admin-policies'] as const,
  list:           (cat?: PolicyCategory) => ['admin-policies', { cat }] as const,
  detail:         (id: string) => ['admin-policy', id] as const,
  defaults:       ['admin-policies-defaults'] as const,
  byPackage:      (pkgId: string) => ['admin-policies-package', pkgId] as const,
};

// ─── Query Hooks ───────────────────────────────────────────────────────────────

export function useAdminPolicies(category?: PolicyCategory) {
  return useQuery({
    queryKey: POLICY_KEYS.list(category),
    queryFn: () => adminPolicyService.getAll(category),
  });
}

export function useAdminPolicyDetail(id: string) {
  return useQuery({
    queryKey: POLICY_KEYS.detail(id),
    queryFn: () => adminPolicyService.getOne(id),
    enabled: !!id,
  });
}

export function useAdminPolicyDefaults() {
  return useQuery({
    queryKey: POLICY_KEYS.defaults,
    queryFn: () => adminPolicyService.getDefaults(),
  });
}

export function usePackagePolicies(packageId: string) {
  return useQuery({
    queryKey: POLICY_KEYS.byPackage(packageId),
    queryFn: () => adminPolicyService.getByPackage(packageId),
    enabled: !!packageId,
  });
}

// ─── Mutation Hooks ────────────────────────────────────────────────────────────

export function useCreatePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreatePolicyDto) => adminPolicyService.create(dto),
    onSuccess: () => {
      toast.success('Đã tạo chính sách!');
      qc.invalidateQueries({ queryKey: POLICY_KEYS.all });
    },
  });
}

export function useUpdatePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdatePolicyDto }) =>
      adminPolicyService.update(id, dto),
    onSuccess: (_, { id }) => {
      toast.success('Đã cập nhật chính sách!');
      qc.invalidateQueries({ queryKey: POLICY_KEYS.all });
      qc.invalidateQueries({ queryKey: POLICY_KEYS.detail(id) });
    },
  });
}

export function useDeletePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminPolicyService.remove(id),
    onSuccess: () => {
      toast.success('Đã xóa chính sách!');
      qc.invalidateQueries({ queryKey: POLICY_KEYS.all });
    },
  });
}

export function useSeedPolicies() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => adminPolicyService.seed(),
    onSuccess: (data) => {
      toast.success(`Seed thành công: +${data.created} mới, ${data.skipped} đã có`);
      qc.invalidateQueries({ queryKey: POLICY_KEYS.all });
    },
  });
}

export function useAssignPoliciesToPackage(packageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (policyIds: string[]) =>
      adminPolicyService.assignToPackage(packageId, policyIds),
    onSuccess: () => {
      toast.success('Đã gán chính sách!');
      qc.invalidateQueries({ queryKey: POLICY_KEYS.byPackage(packageId) });
    },
  });
}

export function useRemovePolicyFromPackage(packageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (policyId: string) =>
      adminPolicyService.removeFromPackage(packageId, policyId),
    onSuccess: () => {
      toast.success('Đã gỡ chính sách!');
      qc.invalidateQueries({ queryKey: POLICY_KEYS.byPackage(packageId) });
    },
  });
}

export function useApplyDefaultPolicies(packageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => adminPolicyService.applyDefaults(packageId),
    onSuccess: () => {
      toast.success('Đã áp dụng chính sách mặc định!');
      qc.invalidateQueries({ queryKey: POLICY_KEYS.byPackage(packageId) });
    },
  });
}
