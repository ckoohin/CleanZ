"use client";

import React, { useState } from "react";
import {
  GitBranch,
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  CheckSquare,
  Clock,
  AlertCircle,
  Loader2,
  X,
  Save,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { BaseButton } from "@/components/ui/base/base_button";
import { Badge } from "@/components/ui/badge";
import {
  useWorkflowsByPackage,
  useCreateWorkflow,
  useUpdateWorkflow,
  useDeleteWorkflow,
  useWorkflowDetail,
  useAddWorkflowStep,
  useUpdateWorkflowStep,
  useDeleteWorkflowStep,
  useReorderWorkflowSteps,
} from "../../hooks/useAdminWorkflow";
import { adminWorkflowService } from "../../services/admin-workflow.service";
import { toast } from "@/lib/toast";
import type {
  ServiceWorkflow,
  WorkflowStep,
  CreateWorkflowStepDto,
} from "../../types/workflow.type";

// ─── Props ────────────────────────────────────────────────────────────────────

interface PackageWorkflowTabProps {
  packageId: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Form tạo/sửa bước */
function StepForm({
  initial,
  onSave,
  onCancel,
  isSaving,
}: {
  initial?: Partial<WorkflowStep>;
  onSave: (dto: CreateWorkflowStepDto) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [duration, setDuration] = useState<string>(
    initial?.durationMinutes != null
      ? String(initial.durationMinutes)
      : "",
  );
  const [checklistRaw, setChecklistRaw] = useState(
    (initial?.checklistItems ?? []).join("\n"),
  );
  const [isRequired, setIsRequired] = useState(initial?.isRequired ?? true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const checklistItems = checklistRaw
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    onSave({
      title,
      description: description || undefined,
      durationMinutes: duration ? Number(duration) : undefined,
      checklistItems,
      isRequired,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-muted/30 border border-border/60 rounded-2xl p-5 space-y-4"
    >
      {/* Title */}
      <div>
        <label
          className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block"
          htmlFor="step-title"
        >
          Tên bước <span className="text-destructive">*</span>
        </label>
        <input
          id="step-title"
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ví dụ: Chuẩn bị dụng cụ"
          className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
        />
      </div>

      {/* Description */}
      <div>
        <label
          className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block"
          htmlFor="step-desc"
        >
          Mô tả hướng dẫn
        </label>
        <textarea
          id="step-desc"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Hướng dẫn chi tiết cho Tasker thực hiện bước này..."
          className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
        />
      </div>

      {/* Duration + Required */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block"
            htmlFor="step-duration"
          >
            Thời gian ước tính (phút)
          </label>
          <input
            id="step-duration"
            type="number"
            min="1"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="Ví dụ: 15"
            className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
            Bắt buộc?
          </label>
          <button
            type="button"
            onClick={() => setIsRequired((v) => !v)}
            className="flex items-center gap-2 mt-auto"
            aria-pressed={isRequired}
          >
            {isRequired ? (
              <ToggleRight className="w-8 h-8 text-primary" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-muted-foreground" />
            )}
            <span className="text-sm font-medium text-foreground">
              {isRequired ? "Có" : "Không"}
            </span>
          </button>
        </div>
      </div>

      {/* Checklist items */}
      <div>
        <label
          className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block"
          htmlFor="step-checklist"
        >
          Checklist (mỗi dòng 1 mục)
        </label>
        <textarea
          id="step-checklist"
          rows={4}
          value={checklistRaw}
          onChange={(e) => setChecklistRaw(e.target.value)}
          placeholder={"Ví dụ:\nKiểm tra dụng cụ\nMặc đồng phục\nXác nhận địa chỉ với khách"}
          className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none font-mono"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        <BaseButton type="submit" size="sm" disabled={isSaving || !title.trim()}>
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Lưu bước
        </BaseButton>
        <BaseButton type="button" variant="ghost" size="sm" onClick={onCancel}>
          <X className="w-4 h-4" />
          Hủy
        </BaseButton>
      </div>
    </form>
  );
}

/** Card hiển thị một bước trong Timeline */
function StepCard({
  step,
  index,
  total,
  workflowId,
  onMoveUp,
  onMoveDown,
}: {
  step: WorkflowStep;
  index: number;
  total: number;
  workflowId: string;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const updateMutation = useUpdateWorkflowStep(workflowId);
  const deleteMutation = useDeleteWorkflowStep(workflowId);

  const handleDelete = () => {
    if (confirm(`Xóa bước "${step.title}"?`)) {
      deleteMutation.mutate(step.id);
    }
  };

  return (
    <div className="relative flex gap-4">
      {/* Timeline line */}
      <div className="flex flex-col items-center shrink-0">
        <div className="w-9 h-9 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center text-primary font-bold text-sm shrink-0 z-10">
          {index + 1}
        </div>
        {index < total - 1 && (
          <div className="w-0.5 flex-1 bg-border/60 mt-1 mb-0 min-h-[20px]" />
        )}
      </div>

      {/* Card */}
      <div className="flex-1 pb-6">
        {editing ? (
          <StepForm
            initial={step}
            onSave={(dto) => {
              updateMutation.mutate(
                { stepId: step.id, dto },
                { onSuccess: () => setEditing(false) },
              );
            }}
            onCancel={() => setEditing(false)}
            isSaving={updateMutation.isPending}
          />
        ) : (
          <div className="bg-card border border-border/50 rounded-2xl p-5 hover:border-primary/25 transition-colors group">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                {/* Title row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-foreground text-base">{step.title}</h4>
                  {step.isRequired ? (
                    <Badge variant="secondary" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20">
                      Bắt buộc
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">
                      Tùy chọn
                    </Badge>
                  )}
                </div>

                {/* Duration */}
                {step.durationMinutes != null && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    <span>~{step.durationMinutes} phút</span>
                  </div>
                )}

                {/* Description */}
                {step.description && (
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    {step.description}
                  </p>
                )}

                {/* Checklist */}
                {step.checklistItems && step.checklistItems.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                      <CheckSquare className="w-3.5 h-3.5" />
                      Checklist ({step.checklistItems.length} mục)
                    </p>
                    <ul className="space-y-1 pl-1">
                      {step.checklistItems.map((item, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-2 text-sm text-foreground/80"
                        >
                          <div className="w-4 h-4 rounded border border-border bg-muted/30 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={onMoveUp}
                  disabled={index === 0}
                  title="Lên"
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={onMoveDown}
                  disabled={index === total - 1}
                  title="Xuống"
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setEditing(true)}
                  title="Sửa"
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  title="Xóa"
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Panel chi tiết khi đã có workflow */
function WorkflowPanel({ workflow }: { workflow: ServiceWorkflow }) {
  const [editingInfo, setEditingInfo] = useState(false);
  const [name, setName] = useState(workflow.name);
  const [description, setDescription] = useState(workflow.description ?? "");
  const [showAddStep, setShowAddStep] = useState(false);

  const updateWorkflow = useUpdateWorkflow(workflow.id);
  const deleteWorkflow = useDeleteWorkflow(workflow.packageId ?? undefined);
  const addStep = useAddWorkflowStep(workflow.id);
  const reorder = useReorderWorkflowSteps(workflow.id);

  const steps = [...(workflow.steps ?? [])].sort((a, b) => a.stepOrder - b.stepOrder);

  const totalMinutes = steps.reduce((acc, s) => acc + (s.durationMinutes ?? 0), 0);

  const handleMoveStep = (index: number, direction: "up" | "down") => {
    const newSteps = [...steps];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
    reorder.mutate(newSteps.map((s) => s.id));
  };

  const handleDelete = () => {
    if (confirm(`Xóa toàn bộ quy trình "${workflow.name}"? Hành động này không thể hoàn tác.`)) {
      deleteWorkflow.mutate(workflow.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Workflow info card */}
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-5">
        {editingInfo ? (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block" htmlFor="wf-name">
                Tên quy trình <span className="text-destructive">*</span>
              </label>
              <input
                id="wf-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block" htmlFor="wf-desc">
                Mô tả
              </label>
              <textarea
                id="wf-desc"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
            <div className="flex gap-3">
              <BaseButton
                size="sm"
                disabled={updateWorkflow.isPending}
                onClick={() =>
                  updateWorkflow.mutate(
                    { name, description: description || undefined },
                    { onSuccess: () => setEditingInfo(false) },
                  )
                }
              >
                {updateWorkflow.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Lưu
              </BaseButton>
              <BaseButton variant="ghost" size="sm" onClick={() => setEditingInfo(false)}>
                <X className="w-4 h-4" /> Hủy
              </BaseButton>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-foreground">{workflow.name}</h3>
                <Badge
                  variant="secondary"
                  className={`text-[11px] ${workflow.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}
                >
                  {workflow.isActive ? "Đang hoạt động" : "Tắt"}
                </Badge>
              </div>
              {workflow.description && (
                <p className="text-sm text-muted-foreground mt-1.5">{workflow.description}</p>
              )}
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-primary" />
                  <strong className="text-foreground">{steps.length}</strong> bước
                </span>
                {totalMinutes > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    ~<strong className="text-foreground">{totalMinutes}</strong> phút tổng
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <BaseButton
                variant="outline"
                size="sm"
                onClick={() =>
                  updateWorkflow.mutate({ isActive: !workflow.isActive })
                }
                disabled={updateWorkflow.isPending}
                title={workflow.isActive ? "Tắt quy trình" : "Bật quy trình"}
              >
                {workflow.isActive ? (
                  <ToggleRight className="w-4 h-4 text-primary" />
                ) : (
                  <ToggleLeft className="w-4 h-4" />
                )}
              </BaseButton>
              <BaseButton variant="outline" size="sm" onClick={() => setEditingInfo(true)}>
                <Pencil className="w-4 h-4" />
              </BaseButton>
              <BaseButton
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={deleteWorkflow.isPending}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                {deleteWorkflow.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </BaseButton>
            </div>
          </div>
        )}
      </div>

      {/* Steps Section */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h4 className="text-base font-bold text-foreground flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-primary" />
            Các bước thực hiện
          </h4>
          {!showAddStep && (
            <BaseButton size="sm" onClick={() => setShowAddStep(true)}>
              <Plus className="w-4 h-4" />
              Thêm bước
            </BaseButton>
          )}
        </div>

        {/* Add Step Form */}
        {showAddStep && (
          <div className="mb-4">
            <StepForm
              onSave={(dto) => {
                addStep.mutate(
                  { ...dto, stepOrder: steps.length + 1 },
                  { onSuccess: () => setShowAddStep(false) },
                );
              }}
              onCancel={() => setShowAddStep(false)}
              isSaving={addStep.isPending}
            />
          </div>
        )}

        {/* Steps Timeline */}
        {steps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              <GitBranch className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground">Chưa có bước nào</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Nhấn Thêm bước để bắt đầu xây dựng quy trình thực hiện dịch vụ.
            </p>
          </div>
        ) : (
          <div>
            {steps.map((step, index) => (
              <StepCard
                key={step.id}
                step={step}
                index={index}
                total={steps.length}
                workflowId={workflow.id}
                onMoveUp={() => handleMoveStep(index, "up")}
                onMoveDown={() => handleMoveStep(index, "down")}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Default cleaning workflow template ───────────────────────────────────────
const DEFAULT_CLEANING_TEMPLATE = {
  name: "Quy trình dọn vệ sinh chuẩn",
  description: "Quy trình chuẩn hóa 7 bước đảm bảo chất lượng đồng nhất cho mọi đơn dọn dẹp.",
  steps: [
    {
      title: "Tiếp nhận & Chuẩn bị",
      description: "Tasker gặp khách, xác nhận địa chỉ và phạm vi công việc. Kiểm tra toàn bộ dụng cụ mang theo.",
      durationMinutes: 10,
      isRequired: true,
      checklistItems: [
        "Gọi/nhắn tin cho khách trước 15 phút",
        "Mặc đồng phục và đeo biển nhân viên",
        "Kiểm tra máy hút bụi, mop, hoá chất",
        "Chụp ảnh hiện trạng phòng trước khi làm",
      ],
    },
    {
      title: "Bảo vệ đồ đạc & Sắp xếp",
      description: "Dọn gọn và che phủ các vật dụng quan trọng trước khi bắt đầu vệ sinh.",
      durationMinutes: 10,
      isRequired: true,
      checklistItems: [
        "Hỏi khách về đồ vật cần cẩn thận",
        "Che phủ thiết bị điện tử nếu cần",
        "Dọn vật dụng cá nhân ra khỏi khu vực làm việc",
        "Đặt biển 'Đang vệ sinh' nếu có",
      ],
    },
    {
      title: "Vệ sinh phòng tắm / nhà vệ sinh",
      description: "Làm sạch toàn bộ khu vực vệ sinh theo thứ tự từ trên xuống dưới.",
      durationMinutes: 25,
      isRequired: true,
      checklistItems: [
        "Xịt hoá chất khử khuẩn bồn cầu, bồn rửa tay",
        "Lau gương, kệ, và vòi sen",
        "Cọ sạch bồn tắm / khu vực tắm đứng",
        "Lau sàn và góc khuất bằng cây lau chuyên dụng",
        "Thay túi rác, bổ sung giấy vệ sinh (nếu có)",
      ],
    },
    {
      title: "Vệ sinh bếp",
      description: "Lau dọn khu vực bếp, bao gồm bề mặt, bếp nấu và khu vực lân cận.",
      durationMinutes: 25,
      isRequired: true,
      checklistItems: [
        "Lau mặt bếp, hút mùi và tường bếp",
        "Vệ sinh bề mặt countertop và bồn rửa chén",
        "Lau ngoài tủ lạnh, lò vi sóng",
        "Đổ rác nhà bếp",
        "Lau sàn bếp kỹ các góc",
      ],
    },
    {
      title: "Dọn dẹp phòng khách / phòng ngủ",
      description: "Hút bụi, lau bụi và sắp xếp gọn gàng các phòng chức năng.",
      durationMinutes: 30,
      isRequired: true,
      checklistItems: [
        "Hút bụi thảm, sofa, nệm",
        "Lau bụi bề mặt bàn, kệ, tủ",
        "Lau cửa kính, tay nắm cửa",
        "Sắp xếp gối, chăn ngăn nắp",
        "Quét mạng nhện góc tường và trần",
      ],
    },
    {
      title: "Lau sàn toàn bộ",
      description: "Hút bụi và lau ướt toàn bộ sàn nhà theo thứ tự từ trong ra ngoài.",
      durationMinutes: 20,
      isRequired: true,
      checklistItems: [
        "Hút bụi khô toàn bộ sàn trước",
        "Lau ướt từ phòng trong ra ngoài",
        "Chú ý các góc khuất và gầm đồ vật",
        "Dọn sạch bàn chân cầu thang (nếu có)",
      ],
    },
    {
      title: "Kiểm tra & Nghiệm thu",
      description: "Kiểm tra lại toàn bộ các khu vực, chụp ảnh sau khi hoàn thành và xác nhận với khách hàng.",
      durationMinutes: 10,
      isRequired: true,
      checklistItems: [
        "Đi vòng kiểm tra lại tất cả các phòng",
        "Chụp ảnh sau khi hoàn thành",
        "Thu dọn dụng cụ của Tasker",
        "Mời khách kiểm tra và xác nhận",
        "Đánh dấu hoàn thành trên app",
      ],
    },
  ],
} as const;

/** Form tạo mới Workflow */
function CreateWorkflowForm({
  packageId,
  onCancel,
}: {
  packageId: string;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [useTemplate, setUseTemplate] = useState(false);
  const createMutation = useCreateWorkflow();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createMutation.mutate(
      { name, description: description || undefined, packageId },
      {
        onSuccess: async (newWorkflow) => {
          if (useTemplate) {
            // Tạo tuần tự từng step — gọi API trực tiếp để đúng stepOrder
            for (let i = 0; i < DEFAULT_CLEANING_TEMPLATE.steps.length; i++) {
              const s = DEFAULT_CLEANING_TEMPLATE.steps[i];
              try {
                await adminWorkflowService.addStep(newWorkflow.id, {
                  title: s.title,
                  description: s.description,
                  durationMinutes: s.durationMinutes,
                  checklistItems: [...s.checklistItems],
                  isRequired: s.isRequired,
                  stepOrder: i + 1,
                });
              } catch { /* bỏ qua nếu 1 step lỗi */ }
            }
            toast.success("Đã tạo quy trình mẫu với 7 bước dọn dẹp!");
          }
        },
      }
    );
  };


  const handleUseDefault = () => {
    setName(DEFAULT_CLEANING_TEMPLATE.name);
    setDescription(DEFAULT_CLEANING_TEMPLATE.description);
    setUseTemplate(true);
  };

  const isCreating = createMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Template Banner */}
      <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
            <span className="text-2xl">🧹</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground text-base">Quy trình mẫu — Dọn vệ sinh chuẩn</p>
            <p className="text-xs text-muted-foreground mt-1">
              7 bước chuẩn hóa: Tiếp nhận → Bếp → Phòng tắm → Phòng → Lau sàn → Nghiệm thu.
              Tổng ~<strong>130 phút</strong>, đầy đủ checklist cho từng bước.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {DEFAULT_CLEANING_TEMPLATE.steps.map((s, i) => (
                <span key={i} className="text-[11px] px-2 py-1 rounded-lg bg-primary/10 text-primary font-semibold border border-primary/20">
                  {i + 1}. {s.title}
                </span>
              ))}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleUseDefault}
          className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all shadow-sm shadow-primary/30"
        >
          <GitBranch className="w-4 h-4" />
          Dùng quy trình mẫu này
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground font-semibold">HOẶC TẠO TÙY CHỈNH</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Custom form */}
      <div className="bg-card border border-border/50 rounded-2xl p-6 space-y-5">
        <div>
          <h4 className="text-base font-bold text-foreground">Tạo quy trình mới</h4>
          <p className="text-xs text-muted-foreground mt-1">
            Thiết lập các bước thực hiện chuẩn hóa cho dịch vụ này.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block"
              htmlFor="new-wf-name"
            >
              Tên quy trình <span className="text-destructive">*</span>
            </label>
            <input
              id="new-wf-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Quy trình dọn vệ sinh chuẩn"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>
          <div>
            <label
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block"
              htmlFor="new-wf-desc"
            >
              Mô tả tổng quát
            </label>
            <textarea
              id="new-wf-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả tổng quát về quy trình và mục tiêu chất lượng..."
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>

          {useTemplate && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/60">
              <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
              <p className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
                Sẽ tạo kèm 7 bước mẫu dọn dẹp sau khi tạo quy trình
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <BaseButton type="submit" disabled={isCreating || !name.trim()} className="gap-2">
              {isCreating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <GitBranch className="w-4 h-4" />
              )}
              {isCreating ? "Đang tạo..." : "Tạo quy trình"}
            </BaseButton>
            <BaseButton type="button" variant="ghost" onClick={onCancel}>
              Hủy
            </BaseButton>
          </div>
        </form>
      </div>
    </div>
  );
}


// ─── Main Component ───────────────────────────────────────────────────────────

export function PackageWorkflowTab({ packageId }: PackageWorkflowTabProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { data: workflows, isLoading, isError } = useWorkflowsByPackage(packageId);

  // Lấy chi tiết workflow đầu tiên (bao gồm steps)
  const firstWorkflow = workflows?.[0];
  const { data: workflowDetail, isLoading: isDetailLoading } = useWorkflowDetail(
    firstWorkflow?.id ?? "",
  );

  // ── Loading ──
  if (isLoading || isDetailLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-7 h-7 text-primary animate-spin" />
      </div>
    );
  }

  // ── Error ──
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex items-center gap-2 text-destructive mb-2">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm font-semibold">Không thể tải dữ liệu quy trình</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Vui lòng kiểm tra kết nối hoặc thử lại sau.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-primary" aria-hidden="true" />
            Quy trình thực hiện
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Thiết lập các bước chuẩn hóa để Tasker thực hiện dịch vụ đúng quy trình.
          </p>
        </div>
        {/* Chỉ hiển thị nút tạo mới khi chưa có workflow */}
        {!workflowDetail && !showCreateForm && (
          <BaseButton onClick={() => setShowCreateForm(true)}>
            <Plus className="w-4 h-4" />
            Tạo quy trình
          </BaseButton>
        )}
      </div>

      {/* Thông báo hướng dẫn */}
      {!workflowDetail && !showCreateForm && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100 dark:bg-blue-900/20 dark:border-blue-900/40">
          <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">
              Gói dịch vụ này chưa có quy trình thực hiện
            </p>
            <p className="text-xs text-blue-600/80 dark:text-blue-400/70 mt-0.5">
              Tạo quy trình giúp chuẩn hóa cách Tasker thực hiện công việc, đảm bảo chất lượng dịch vụ nhất quán cho mọi đơn hàng.
            </p>
          </div>
        </div>
      )}

      {/* Form tạo mới */}
      {showCreateForm && (
        <CreateWorkflowForm
          packageId={packageId}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Workflow Panel khi đã có dữ liệu */}
      {workflowDetail && <WorkflowPanel workflow={workflowDetail} />}
    </div>
  );
}
