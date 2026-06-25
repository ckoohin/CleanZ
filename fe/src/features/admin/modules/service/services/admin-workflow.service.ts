import http from "@/lib/api/http";
import { API_ENDPOINTS } from "@/constants/api-endpoints";
import type {
  ServiceWorkflow,
  WorkflowStep,
  CreateWorkflowDto,
  UpdateWorkflowDto,
  CreateWorkflowStepDto,
  UpdateWorkflowStepDto,
} from "../types/workflow.type";

interface WorkflowFilters {
  subServiceId?: string;
  packageId?: string;
  isActive?: boolean;
}

export const adminWorkflowService = {
  // ─── Workflow CRUD ───────────────────────────────────────────────────────

  getAll: async (filters?: WorkflowFilters): Promise<ServiceWorkflow[]> => {
    const params = new URLSearchParams();
    if (filters?.subServiceId) params.append("subServiceId", filters.subServiceId);
    if (filters?.packageId) params.append("packageId", filters.packageId);
    if (filters?.isActive !== undefined) params.append("isActive", String(filters.isActive));

    const query = params.toString() ? `?${params.toString()}` : "";
    const res = await http.get<{ data: ServiceWorkflow[] }>(
      `${API_ENDPOINTS.ADMIN_WORKFLOWS.BASE}${query}`,
    );
    return res.data.data;
  },

  getById: async (id: string): Promise<ServiceWorkflow> => {
    const res = await http.get<{ data: ServiceWorkflow }>(
      API_ENDPOINTS.ADMIN_WORKFLOWS.DETAIL(id),
    );
    return res.data.data;
  },

  create: async (dto: CreateWorkflowDto): Promise<ServiceWorkflow> => {
    const res = await http.post<{ data: ServiceWorkflow }>(
      API_ENDPOINTS.ADMIN_WORKFLOWS.BASE,
      dto,
    );
    return res.data.data;
  },

  update: async (id: string, dto: UpdateWorkflowDto): Promise<ServiceWorkflow> => {
    const res = await http.patch<{ data: ServiceWorkflow }>(
      API_ENDPOINTS.ADMIN_WORKFLOWS.DETAIL(id),
      dto,
    );
    return res.data.data;
  },

  remove: async (id: string): Promise<void> => {
    await http.delete(API_ENDPOINTS.ADMIN_WORKFLOWS.DETAIL(id));
  },

  // ─── Workflow Steps ──────────────────────────────────────────────────────

  addStep: async (workflowId: string, dto: CreateWorkflowStepDto): Promise<WorkflowStep> => {
    const res = await http.post<{ data: WorkflowStep }>(
      API_ENDPOINTS.ADMIN_WORKFLOWS.STEPS(workflowId),
      dto,
    );
    return res.data.data;
  },

  updateStep: async (
    workflowId: string,
    stepId: string,
    dto: UpdateWorkflowStepDto,
  ): Promise<WorkflowStep> => {
    const res = await http.patch<{ data: WorkflowStep }>(
      API_ENDPOINTS.ADMIN_WORKFLOWS.STEP_DETAIL(workflowId, stepId),
      dto,
    );
    return res.data.data;
  },

  removeStep: async (workflowId: string, stepId: string): Promise<void> => {
    await http.delete(
      API_ENDPOINTS.ADMIN_WORKFLOWS.STEP_DETAIL(workflowId, stepId),
    );
  },

  reorderSteps: async (workflowId: string, orderedIds: string[]): Promise<void> => {
    await http.patch(API_ENDPOINTS.ADMIN_WORKFLOWS.REORDER(workflowId), { orderedIds });
  },
};

