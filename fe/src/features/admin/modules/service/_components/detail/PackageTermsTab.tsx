"use client";

import React, { useState, useMemo } from "react";
import {
  Shield, ShieldCheck, AlertTriangle, Info,
  Plus, Trash2, Save, Edit3, Star, RefreshCw,
  Search, CheckSquare, Square, ScrollText, FileText,
  Users, User, Check,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BaseButton } from "@/components/ui/base/base_button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AdminServicePackageEntity } from "@/features/admin/modules/service/services/admin-services.service";
import { useUpdateAdminPackage } from "@/features/admin/modules/service/hooks/useAdminServices";
import {
  usePackagePolicies,
  useAdminPolicies,
  useAssignPoliciesToPackage,
  useRemovePolicyFromPackage,
  useApplyDefaultPolicies,
} from "@/features/admin/modules/policy/hooks/useAdminPolicies";
import { Policy, PolicyCategory, POLICY_CATEGORY_META } from "@/features/admin/modules/policy/types/policy.type";

// ─── Role helpers ─────────────────────────────────────────────────────────────

const roleLabel = (role: string) =>
  role === 'CUSTOMER' ? 'Customer' : role === 'TASKER' ? 'Tasker' : 'Tất cả';

const RoleIcon = ({ role }: { role: string }) => {
  if (role === 'CUSTOMER') return <User className="w-3 h-3" />;
  if (role === 'TASKER')   return <Shield className="w-3 h-3" />;
  return <Users className="w-3 h-3" />;
};

// ─── Policy Picker Dialog ─────────────────────────────────────────────────────

function PolicyPickerDialog({
  packageId,
  assignedIds,
  open,
  onClose,
}: {
  packageId: string;
  assignedIds: Set<string>;
  open: boolean;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<PolicyCategory | undefined>();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: allPolicies = [], isLoading } = useAdminPolicies(activeCategory);
  const assignMutation = useAssignPoliciesToPackage(packageId);

  // Reset selection when dialog opens
  React.useEffect(() => {
    if (open) setSelected(new Set());
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allPolicies.filter(
      (p) =>
        p.isActive &&
        !assignedIds.has(p.id) &&
        (p.title.toLowerCase().includes(q) ||
          (POLICY_CATEGORY_META[p.category]?.label ?? "").toLowerCase().includes(q))
    );
  }, [allPolicies, search, assignedIds]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleAssign = () => {
    if (selected.size === 0) { toast.error("Chưa chọn chính sách nào"); return; }
    assignMutation.mutate([...selected], {
      onSuccess: () => { setSelected(new Set()); onClose(); },
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="cz-admin max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--c-primary-soft)] flex items-center justify-center">
              <Shield className="w-4 h-4 text-[var(--c-primary-strong)]" />
            </div>
            <div>
              <DialogTitle>Thêm chính sách</DialogTitle>
              <DialogDescription className="mt-0.5">
                {selected.size > 0
                  ? `Đã chọn ${selected.size} chính sách`
                  : "Chọn từ thư viện chính sách có sẵn"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Filters */}
        <div className="px-5 py-3 border-b space-y-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--c-muted)]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên hoặc loại chính sách..."
              className="pl-9"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveCategory(undefined)}
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors",
                !activeCategory
                  ? "bg-[var(--c-primary)] text-white border-[var(--c-primary)]"
                  : "border-[var(--c-line)] text-[var(--c-muted)] hover:border-[var(--c-line)]"
              )}
            >
              Tất cả
            </button>
            {(Object.keys(POLICY_CATEGORY_META) as PolicyCategory[]).map((key) => {
              const meta = POLICY_CATEGORY_META[key];
              const Icon = meta.icon;
              return (
                <button
                  key={key}
                  onClick={() => setActiveCategory(activeCategory === key ? undefined : key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors",
                    activeCategory === key
                      ? "bg-[var(--c-primary)] text-white border-[var(--c-primary)]"
                      : "border-[var(--c-line)] text-[var(--c-muted)] hover:border-[var(--c-line)]"
                  )}
                >
                  <Icon className="w-3 h-3" />
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* List */}
        <ScrollArea className="flex-1 px-4 py-3">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <RefreshCw className="w-5 h-5 animate-spin text-[var(--c-primary-strong)]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-[var(--c-muted)]">
              {allPolicies.filter((p) => !assignedIds.has(p.id)).length === 0
                ? "Tất cả chính sách đã được gán."
                : "Không tìm thấy chính sách phù hợp."}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((p) => {
                const meta = POLICY_CATEGORY_META[p.category] ?? POLICY_CATEGORY_META.GENERAL;
                const Icon = meta.icon;
                const isSelected = selected.has(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => toggle(p.id)}
                    className={cn(
                      "w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all",
                      isSelected
                        ? "border-[var(--c-primary)]/50 bg-[var(--c-primary-soft)] ring-1 ring-[var(--c-primary)]/20"
                        : "border-[var(--c-line)]/50 hover:border-[var(--c-line)] hover:bg-[var(--c-card-2)]"
                    )}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isSelected
                        ? <CheckSquare className="w-4 h-4 text-[var(--c-primary-strong)]" />
                        : <Square className="w-4 h-4 text-[var(--c-muted)]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-[var(--c-ink)] truncate">{p.title}</p>
                        {p.isDefault && (
                          <Star className="w-3.5 h-3.5 text-[#D97706] fill-[#D97706] shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <Badge variant="secondary" className={cn("text-[10px] font-semibold gap-1", meta.color)}>
                          <Icon className="w-2.5 h-2.5" />
                          {meta.label}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] gap-1 text-[var(--c-muted)]">
                          <RoleIcon role={p.role} />
                          {roleLabel(p.role)}
                        </Badge>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <DialogFooter className="px-5 py-4 border-t shrink-0">
          <BaseButton variant="outline" onClick={onClose}>Hủy</BaseButton>
          <BaseButton
            variant="primary"
            onClick={handleAssign}
            disabled={selected.size === 0 || assignMutation.isPending}
            isLoading={assignMutation.isPending}
            className="gap-2"
          >
            {!assignMutation.isPending && <Check className="w-4 h-4" />}
            Gán {selected.size > 0 ? `(${selected.size})` : ""} chính sách
          </BaseButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Assigned Policy Row ──────────────────────────────────────────────────────

function AssignedPolicyRow({ policy, packageId }: { policy: Policy; packageId: string }) {
  const removeMutation = useRemovePolicyFromPackage(packageId);
  const meta = POLICY_CATEGORY_META[policy.category] ?? POLICY_CATEGORY_META.GENERAL;
  const Icon = meta.icon;

  return (
    <TableRow className="group">
      <TableCell className="py-3">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${meta.bgColor}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--c-ink)] flex items-center gap-1.5">
              {policy.title}
              {policy.isDefault && <Star className="w-3 h-3 text-[#D97706] fill-[#D97706]" />}
            </p>
            <p className="text-xs font-mono text-[var(--c-muted)]">{policy.slug}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="py-3">
        <Badge variant="secondary" className={cn("text-[10px] font-semibold gap-1", meta.color)}>
          <Icon className="w-2.5 h-2.5" />
          {meta.label}
        </Badge>
      </TableCell>
      <TableCell className="py-3">
        <Badge variant="outline" className="text-[10px] gap-1 text-[var(--c-muted)]">
          <RoleIcon role={policy.role} />
          {roleLabel(policy.role)}
        </Badge>
      </TableCell>
      <TableCell className="py-3 text-right">
        <BaseButton
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-[var(--c-muted)] hover:text-[#E11D48] hover:bg-[rgba(225,29,72,0.12)] opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => removeMutation.mutate(policy.id)}
          isLoading={removeMutation.isPending}
        >
          {!removeMutation.isPending && <Trash2 className="w-3.5 h-3.5" />}
        </BaseButton>
      </TableCell>
    </TableRow>
  );
}

// ─── Term item helpers ────────────────────────────────────────────────────────

interface TermItem { id: string; text: string; }

function parseterms(raw: string | null | undefined): TermItem[] {
  if (!raw?.trim()) return [];
  return raw
    .split("\n")
    .map((l) => l.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean)
    .map((text, i) => ({ id: `t-${i}`, text }));
}

function serializeTerms(items: TermItem[]) {
  return items.map((t, i) => `${i + 1}. ${t.text}`).join("\n");
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface PackageTermsTabProps { pkg: AdminServicePackageEntity; }

export function PackageTermsTab({ pkg }: PackageTermsTabProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [isEditingTerms, setIsEditingTerms] = useState(false);
  const [newTerm, setNewTerm] = useState("");

  const { data: assignedPolicies = [], isLoading: policiesLoading } = usePackagePolicies(pkg.id);
  const applyDefaultsMutation = useApplyDefaultPolicies(pkg.id);
  const assignedIds = useMemo(() => new Set(assignedPolicies.map((p) => p.id)), [assignedPolicies]);

  const grouped = useMemo(() => {
    const map = new Map<PolicyCategory, Policy[]>();
    for (const p of assignedPolicies) {
      if (!map.has(p.category)) map.set(p.category, []);
      map.get(p.category)!.push(p);
    }
    return map;
  }, [assignedPolicies]);

  const [terms, setTerms]       = useState<TermItem[]>(() => parseterms(pkg.termsAndConditions));
  const [policyDesc, setPolicyDesc] = useState(pkg.policyDescription ?? "");
  const updateMutation = useUpdateAdminPackage();

  const handleSaveTerms = () => {
    updateMutation.mutate(
      { id: pkg.id, payload: { termsAndConditions: serializeTerms(terms), policyDescription: policyDesc } },
      { onSuccess: () => { toast.success("Đã lưu điều khoản!"); setIsEditingTerms(false); } }
    );
  };

  const addTerm = () => {
    if (!newTerm.trim()) return;
    setTerms((prev) => [...prev, { id: `t-${Date.now()}`, text: newTerm.trim() }]);
    setNewTerm("");
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      <Tabs defaultValue="policies" className="w-full">
        <TabsList className="h-auto p-1 bg-[var(--c-card-2)] rounded-xl gap-0.5">
          <TabsTrigger value="policies" className="rounded-lg gap-2 text-sm font-medium data-[state=active]:bg-[var(--c-card)] data-[state=active]:shadow-sm data-[state=active]:text-[var(--c-primary-strong)]">
            <Shield className="w-4 h-4" />
            Chính sách
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{assignedPolicies.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="terms" className="rounded-lg gap-2 text-sm font-medium data-[state=active]:bg-[var(--c-card)] data-[state=active]:shadow-sm data-[state=active]:text-[var(--c-primary-strong)]">
            <ScrollText className="w-4 h-4" />
            Điều khoản
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{terms.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="guarantees" className="rounded-lg gap-2 text-sm font-medium data-[state=active]:bg-[var(--c-card)] data-[state=active]:shadow-sm data-[state=active]:text-[var(--c-primary-strong)]">
            <ShieldCheck className="w-4 h-4" />
            Cam kết
          </TabsTrigger>
        </TabsList>

        {/* ── Policies Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="policies" className="mt-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <Shield className="w-4 h-4 text-[var(--c-primary-strong)]" />
                Chính sách áp dụng
                <Badge variant="secondary">{assignedPolicies.length}</Badge>
              </h3>
              <p className="text-xs text-[var(--c-muted)] mt-0.5">
                Các chính sách hiển thị cho khách hàng khi đặt gói này
              </p>
            </div>
            <div className="flex gap-2">
              <BaseButton
                variant="outline"
                size="sm"
                onClick={() => applyDefaultsMutation.mutate()}
                isLoading={applyDefaultsMutation.isPending}
                className="gap-2"
              >
                {!applyDefaultsMutation.isPending && <Star className="w-3.5 h-3.5" />}
                Áp dụng mặc định
              </BaseButton>
              <BaseButton
                variant="primary"
                size="sm"
                onClick={() => setShowPicker(true)}
                className="gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm chính sách
              </BaseButton>
            </div>
          </div>

          {policiesLoading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="w-5 h-5 animate-spin text-[var(--c-primary-strong)]" />
            </div>
          ) : assignedPolicies.length === 0 ? (
            <div className="py-14 text-center rounded-2xl border-2 border-dashed border-[var(--c-line)]/50 bg-[var(--c-card-2)]">
              <Shield className="w-10 h-10 mx-auto mb-3 text-[var(--c-muted)]" />
              <p className="font-semibold text-sm text-[var(--c-muted)]">Chưa có chính sách nào</p>
              <p className="text-xs text-[var(--c-muted)] mt-1 mb-4 max-w-xs mx-auto">
                Gán chính sách để khách hàng biết quyền lợi và nghĩa vụ khi đặt dịch vụ
              </p>
              <div className="flex gap-2 justify-center">
                <BaseButton
                  variant="outline"
                  size="sm"
                  onClick={() => applyDefaultsMutation.mutate()}
                  isLoading={applyDefaultsMutation.isPending}
                  className="gap-2"
                >
                  {!applyDefaultsMutation.isPending && <Star className="w-3.5 h-3.5" />}
                  Áp dụng mặc định
                </BaseButton>
                <BaseButton variant="primary" size="sm" onClick={() => setShowPicker(true)} className="gap-2">
                  <Plus className="w-3.5 h-3.5" />
                  Chọn chính sách
                </BaseButton>
              </div>
            </div>
          ) : (
            <div className="space-y-4 rounded-xl border border-[var(--c-line)]/50 overflow-hidden">
              {Array.from(grouped.entries()).map(([cat, items], idx) => {
                const meta = POLICY_CATEGORY_META[cat];
                const CatIcon = meta.icon;
                return (
                  <div key={cat}>
                    {idx > 0 && <Separator />}
                    <div className="px-4 py-2.5 bg-[var(--c-card-2)] flex items-center gap-2">
                      <CatIcon className={`w-4 h-4 ${meta.color.split(' ')[0]}`} />
                      <span className="text-xs font-bold uppercase tracking-wide text-[var(--c-muted)]">
                        {meta.label}
                      </span>
                      <Badge variant="secondary" className="text-[10px] ml-auto">{items.length}</Badge>
                    </div>
                    <Table>
                      <TableBody>
                        {items.map((p) => (
                          <AssignedPolicyRow key={p.id} policy={p} packageId={pkg.id} />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Terms Tab ────────────────────────────────────────────────────── */}
        <TabsContent value="terms" className="mt-5 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#D97706]" />
              Điều khoản tùy chỉnh
              <Badge variant="secondary">{terms.length}</Badge>
            </h3>
            {!isEditingTerms ? (
              <BaseButton variant="outline" size="sm" onClick={() => setIsEditingTerms(true)} className="gap-2">
                <Edit3 className="w-4 h-4" />
                Chỉnh sửa
              </BaseButton>
            ) : (
              <div className="flex gap-2">
                <BaseButton
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTerms(parseterms(pkg.termsAndConditions));
                    setPolicyDesc(pkg.policyDescription ?? "");
                    setIsEditingTerms(false);
                  }}
                >
                  Hủy
                </BaseButton>
                <BaseButton
                  variant="primary"
                  size="sm"
                  onClick={handleSaveTerms}
                  isLoading={updateMutation.isPending}
                  className="gap-2"
                >
                  {!updateMutation.isPending && <Save className="w-4 h-4" />}
                  Lưu
                </BaseButton>
              </div>
            )}
          </div>

          {isEditingTerms && (
            <div className="flex gap-2">
              <Input
                value={newTerm}
                onChange={(e) => setNewTerm(e.target.value)}
                placeholder="Nhập điều khoản mới..."
                onKeyDown={(e) => e.key === "Enter" && addTerm()}
                className="flex-1"
              />
              <BaseButton variant="outline" size="sm" onClick={addTerm} className="gap-1 shrink-0">
                <Plus className="w-4 h-4" />
                Thêm
              </BaseButton>
            </div>
          )}

          {terms.length === 0 ? (
            <div className="py-10 text-center rounded-xl border border-dashed border-[var(--c-line)] bg-[var(--c-card-2)]">
              <ScrollText className="w-8 h-8 text-[var(--c-muted)] mx-auto mb-2" />
              <p className="text-sm text-[var(--c-muted)]">
                Chưa có điều khoản. Nhấn <strong>Chỉnh sửa</strong> để thêm.
              </p>
            </div>
          ) : (
            <ol className="space-y-2.5">
              {terms.map((term, idx) => (
                <li key={term.id} className="flex items-start gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)] text-xs font-bold flex items-center justify-center mt-0.5">
                    {idx + 1}
                  </span>
                  {isEditingTerms ? (
                    <div className="flex-1 flex gap-2">
                      <Input
                        value={term.text}
                        onChange={(e) =>
                          setTerms((prev) =>
                            prev.map((t) => t.id === term.id ? { ...t, text: e.target.value } : t)
                          )
                        }
                        className="flex-1"
                      />
                      <BaseButton
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0 text-[var(--c-muted)] hover:text-[#E11D48] hover:bg-[rgba(225,29,72,0.12)]"
                        onClick={() => setTerms((prev) => prev.filter((t) => t.id !== term.id))}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </BaseButton>
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--c-ink)] leading-relaxed flex-1 pt-0.5">{term.text}</p>
                  )}
                </li>
              ))}
            </ol>
          )}

          <Separator />

          <div>
            <Label className="font-semibold flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-[#2563EB]" />
              Ghi chú nội bộ
            </Label>
            {isEditingTerms ? (
              <Textarea
                value={policyDesc}
                onChange={(e) => setPolicyDesc(e.target.value)}
                rows={5}
                className="resize-none"
                placeholder="Ghi chú nội bộ cho gói dịch vụ này..."
              />
            ) : (
              <div className="rounded-xl border bg-[var(--c-card-2)] px-4 py-3 min-h-[80px]">
                {policyDesc ? (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{policyDesc}</p>
                ) : (
                  <p className="text-sm text-[var(--c-muted)] italic">Chưa có ghi chú.</p>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Guarantees Tab ───────────────────────────────────────────────── */}
        <TabsContent value="guarantees" className="mt-5 space-y-4">
          <h3 className="font-bold text-base flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#0E9F6E]" />
            Cam kết chất lượng CleanZ
          </h3>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { icon: ShieldCheck, label: "Bảo hành 48h",          desc: "Làm lại miễn phí nếu chưa đạt",        cls: "bg-[rgba(14,159,110,0.12)] text-[#0E9F6E] dark:bg-[rgba(14,159,110,0.12)]" },
              { icon: Star,        label: "Nhân viên chuyên nghiệp", desc: "Đào tạo bài bản, kiểm tra lý lịch",   cls: "bg-[rgba(217,119,6,0.14)] text-[#D97706] dark:bg-[rgba(217,119,6,0.14)]" },
              { icon: FileText,   label: "Hóa chất an toàn",       desc: "An toàn cho gia đình và thú cưng",    cls: "bg-[rgba(37,99,235,0.12)] text-[#2563EB] dark:bg-[rgba(37,99,235,0.12)]" },
            ].map(({ icon: Icon, label, desc, cls }) => (
              <div key={label} className={`rounded-xl p-4 border border-[var(--c-line)]/40 ${cls}`}>
                <Icon className="w-6 h-6 mb-2" />
                <p className="font-bold text-sm">{label}</p>
                <p className="text-xs mt-1 opacity-80 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl bg-[var(--c-card-2)] border border-[var(--c-line)]/30 px-4 py-3">
            <p className="text-xs text-[var(--c-muted)] leading-relaxed">
              <strong>Lưu ý:</strong> Các cam kết trên áp dụng chung cho tất cả gói dịch vụ.
              Tùy chỉnh điều khoản riêng ở tab <strong>Điều khoản</strong> hoặc gán thêm chính sách ở tab <strong>Chính sách</strong>.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Policy Picker Dialog */}
      <PolicyPickerDialog
        packageId={pkg.id}
        assignedIds={assignedIds}
        open={showPicker}
        onClose={() => setShowPicker(false)}
      />
    </div>
  );
}
