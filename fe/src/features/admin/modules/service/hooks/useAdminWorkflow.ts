import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { getApiErrorMessage } from "@/lib/api/error-message";
import { adminWorkflowService } from "../services/admin-workflow.service";
import type {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  CreateWorkflowStepDto,
  UpdateWorkflowStepDto,
} from "../types/workflow.type";

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const ADMIN_WORKFLOW_KEYS = {
  all: ["admin-workflows"] as const,
  lists: () => [...ADMIN_WORKFLOW_KEYS.all, "list"] as const,
  listByPackage: (packageId: string) =>
    [...ADMIN_WORKFLOW_KEYS.lists(), { packageId }] as const,
  listBySubService: (subServiceId: string) =>
    [...ADMIN_WORKFLOW_KEYS.lists(), { subServiceId }] as const,
  details: () => [...ADMIN_WORKFLOW_KEYS.all, "detail"] as const,
  detail: (id: string) => [...ADMIN_WORKFLOW_KEYS.details(), id] as const,
};

// ─── Error Helper ─────────────────────────────────────────────────────────────

function getErrorMsg(error: unknown): string {
  return getApiErrorMessage(error);
}

// ─── Workflow Queries ─────────────────────────────────────────────────────────

/** Lấy danh sách workflows theo packageId */
export function useWorkflowsByPackage(packageId: string) {
  return useQuery({
    queryKey: ADMIN_WORKFLOW_KEYS.listByPackage(packageId),
    queryFn: () => adminWorkflowService.getAll({ packageId }),
    enabled: !!packageId,
  });
}

/** Lấy danh sách workflows theo subServiceId */
export function useWorkflowsBySubService(subServiceId: string) {
  return useQuery({
    queryKey: ADMIN_WORKFLOW_KEYS.listBySubService(subServiceId),
    queryFn: () => adminWorkflowService.getAll({ subServiceId }),
    enabled: !!subServiceId,
  });
}

/** Lấy chi tiết workflow kèm steps */
export function useWorkflowDetail(id: string) {
  return useQuery({
    queryKey: ADMIN_WORKFLOW_KEYS.detail(id),
    queryFn: () => adminWorkflowService.getById(id),
    enabled: !!id,
  });
}

// ─── Workflow Mutations ───────────────────────────────────────────────────────

/** Tạo workflow mới */
export function useCreateWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateWorkflowDto) => adminWorkflowService.create(dto),
    onSuccess: (_, variables) => {
      toast.success("Tạo quy trình thành công!");
      queryClient.invalidateQueries({ queryKey: ADMIN_WORKFLOW_KEYS.lists() });
      if (variables.packageId) {
        queryClient.invalidateQueries({
          queryKey: ADMIN_WORKFLOW_KEYS.listByPackage(variables.packageId),
        });
      }
    },
    onError: (error: unknown) => toast.error(getErrorMsg(error)),
  });
}

/** Cập nhật thông tin workflow */
export function useUpdateWorkflow(workflowId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateWorkflowDto) => adminWorkflowService.update(workflowId, dto),
    onSuccess: () => {
      toast.success("Cập nhật quy trình thành công!");
      queryClient.invalidateQueries({ queryKey: ADMIN_WORKFLOW_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: ADMIN_WORKFLOW_KEYS.detail(workflowId) });
    },
    onError: (error: unknown) => toast.error(getErrorMsg(error)),
  });
}

/** Xóa workflow */
export function useDeleteWorkflow(packageId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminWorkflowService.remove(id),
    onSuccess: () => {
      toast.success("Đã xóa quy trình!");
      queryClient.invalidateQueries({ queryKey: ADMIN_WORKFLOW_KEYS.lists() });
      if (packageId) {
        queryClient.invalidateQueries({
          queryKey: ADMIN_WORKFLOW_KEYS.listByPackage(packageId),
        });
      }
    },
    onError: (error: unknown) => toast.error(getErrorMsg(error)),
  });
}

// ─── Step Mutations ───────────────────────────────────────────────────────────

/** Thêm bước mới vào workflow */
export function useAddWorkflowStep(workflowId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateWorkflowStepDto) => adminWorkflowService.addStep(workflowId, dto),
    onSuccess: () => {
      toast.success("Đã thêm bước mới!");
      queryClient.invalidateQueries({ queryKey: ADMIN_WORKFLOW_KEYS.detail(workflowId) });
    },
    onError: (error: unknown) => toast.error(getErrorMsg(error)),
  });
}

/** Cập nhật bước trong workflow */
export function useUpdateWorkflowStep(workflowId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ stepId, dto }: { stepId: string; dto: UpdateWorkflowStepDto }) =>
      adminWorkflowService.updateStep(workflowId, stepId, dto),
    onSuccess: () => {
      toast.success("Đã cập nhật bước!");
      queryClient.invalidateQueries({ queryKey: ADMIN_WORKFLOW_KEYS.detail(workflowId) });
    },
    onError: (error: unknown) => toast.error(getErrorMsg(error)),
  });
}

/** Xóa bước khỏi workflow */
export function useDeleteWorkflowStep(workflowId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (stepId: string) => adminWorkflowService.removeStep(workflowId, stepId),
    onSuccess: () => {
      toast.success("Đã xóa bước!");
      queryClient.invalidateQueries({ queryKey: ADMIN_WORKFLOW_KEYS.detail(workflowId) });
    },
    onError: (error: unknown) => toast.error(getErrorMsg(error)),
  });
}

/** Sắp xếp lại thứ tự các bước */
export function useReorderWorkflowSteps(workflowId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: string[]) =>
      adminWorkflowService.reorderSteps(workflowId, orderedIds),
    onSuccess: () => {
      toast.success("Đã cập nhật thứ tự!");
      queryClient.invalidateQueries({ queryKey: ADMIN_WORKFLOW_KEYS.detail(workflowId) });
    },
    onError: (error: unknown) => toast.error(getErrorMsg(error)),
  });
}
