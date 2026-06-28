// ─── Workflow Step ──────────────────────────────────────────────────────────

export interface WorkflowStep {
  id: string;
  workflowId: string;
  stepOrder: number;
  title: string;
  description: string | null;
  /** Thời gian ước tính thực hiện bước (phút) — tên field khớp BE entity */
  durationMinutes: number | null;
  isRequired: boolean;
  icon: string | null;
  checklistItems: string[];
  createdAt: string;
  updatedAt: string;
}

// ─── Service Workflow ────────────────────────────────────────────────────────

export interface ServiceWorkflow {
  id: string;
  name: string;
  description: string | null;
  subServiceId: string | null;
  packageId: string | null;
  isActive: boolean;
  sortOrder: number;
  steps: WorkflowStep[];
  createdAt: string;
  updatedAt: string;
}

// ─── DTOs (Request Payloads) ─────────────────────────────────────────────────

export interface CreateWorkflowStepDto {
  title: string;
  description?: string;
  stepOrder?: number;
  /** Thời gian ước tính (phút) — phải khớp tên field BE DTO: durationMinutes */
  durationMinutes?: number;
  checklistItems?: string[];
  icon?: string;
  isRequired?: boolean;
}

export interface UpdateWorkflowStepDto {
  title?: string;
  description?: string;
  stepOrder?: number;
  durationMinutes?: number;
  checklistItems?: string[];
  icon?: string;
  isRequired?: boolean;
}

export interface CreateWorkflowDto {
  name: string;
  description?: string;
  subServiceId?: string;
  packageId?: string;
  isActive?: boolean;
  sortOrder?: number;
  steps?: CreateWorkflowStepDto[];
}

export interface UpdateWorkflowDto {
  name?: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
  subServiceId?: string;
  packageId?: string;
}
