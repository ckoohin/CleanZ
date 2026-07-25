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
import { toast } from "@/lib/toast";
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
            <div className="w-9 h-9 rounded-xl bg-(--c-primary-soft) flex items-center justify-center">
              <Shield className="w-4 h-4 text-(--c-primary-strong)" />
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--c-muted)" />
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
                  ? "bg-(--c-primary) text-white border-(--c-primary)"
                  : "border-(--c-line) text-(--c-muted) hover:border-(--c-line)"
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
                      ? "bg-(--c-primary) text-white border-(--c-primary)"
                      : "border-(--c-line) text-(--c-muted) hover:border-(--c-line)"
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
        <ScrollArea className="flex-1 min-h-0 px-4 py-3">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <RefreshCw className="w-5 h-5 animate-spin text-(--c-primary-strong)" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-(--c-muted)">
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
                        ? "border-(--c-primary)/50 bg-(--c-primary-soft) ring-1 ring-(--c-primary)/20"
                        : "border-(--c-line)/50 hover:border-(--c-line) hover:bg-(--c-card-2)"
                    )}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isSelected
                        ? <CheckSquare className="w-4 h-4 text-(--c-primary-strong)" />
                        : <Square className="w-4 h-4 text-(--c-muted)" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-(--c-ink) truncate">{p.title}</p>
                        {p.isDefault && (
                          <Star className="w-3.5 h-3.5 text-[#D97706] fill-[#D97706] shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <Badge variant="secondary" className={cn("text-[10px] font-semibold gap-1", meta.color)}>
                          <Icon className="w-2.5 h-2.5" />
                          {meta.label}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] gap-1 text-(--c-muted)">
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
            <p className="text-sm font-semibold text-(--c-ink) flex items-center gap-1.5">
              {policy.title}
              {policy.isDefault && <Star className="w-3 h-3 text-[#D97706] fill-[#D97706]" />}
            </p>
            <p className="text-xs font-mono text-(--c-muted)">{policy.slug}</p>
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
        <Badge variant="outline" className="text-[10px] gap-1 text-(--c-muted)">
          <RoleIcon role={policy.role} />
          {roleLabel(policy.role)}
        </Badge>
      </TableCell>
      <TableCell className="py-3 text-right">
        <BaseButton
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-(--c-muted) hover:text-[#E11D48] hover:bg-[rgba(225,29,72,0.12)] opacity-0 group-hover:opacity-100 transition-opacity"
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

function parseTermsAndPremium(raw: string | null | undefined): { standard: TermItem[], premium: TermItem[] } {
  if (!raw?.trim()) return { standard: [], premium: [] };
  const parts = raw.split(/---\s*PREMIUM\s*---/i);
  const standardRaw = parts[0] || "";
  const premiumRaw = parts[1] || "";
  
  const parseLines = (text: string, prefix: string): TermItem[] => {
    return text
      .split("\n")
      .map((l) => l.replace(/^\d+\.\s*/, "").trim())
      .filter(Boolean)
      .map((text, i) => ({ id: `t-${prefix}-${i}-${Math.random()}`, text }));
  };
  
  return {
    standard: parseLines(standardRaw, "std"),
    premium: parseLines(premiumRaw, "prem"),
  };
}

function serializeTermsAndPremium(standard: TermItem[], premium: TermItem[]) {
  const stdText = standard.map((t, i) => `${i + 1}. ${t.text}`).join("\n");
  const premText = premium.map((t, i) => `${i + 1}. ${t.text}`).join("\n");
  if (premium.length === 0) return stdText;
  return `${stdText}\n--- PREMIUM ---\n${premText}`;
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

  const parsed = useMemo(() => parseTermsAndPremium(pkg.termsAndConditions), [pkg.termsAndConditions]);
  const [terms, setTerms] = useState<TermItem[]>(parsed.standard);
  const [premiumTerms, setPremiumTerms] = useState<TermItem[]>(parsed.premium);
  const [newPremiumTerm, setNewPremiumTerm] = useState("");
  const [policyDesc, setPolicyDesc] = useState(pkg.policyDescription ?? "");
  const updateMutation = useUpdateAdminPackage();

  React.useEffect(() => {
    const res = parseTermsAndPremium(pkg.termsAndConditions);
    setTerms(res.standard);
    setPremiumTerms(res.premium);
  }, [pkg.termsAndConditions]);

  const handleSaveTerms = () => {
    updateMutation.mutate(
      { id: pkg.id, payload: { termsAndConditions: serializeTermsAndPremium(terms, premiumTerms), policyDescription: policyDesc } },
      { onSuccess: () => { toast.success("Đã lưu điều khoản & cam kết Premium!"); setIsEditingTerms(false); } }
    );
  };

  const addTerm = () => {
    if (!newTerm.trim()) return;
    setTerms((prev) => [...prev, { id: `t-std-${Date.now()}`, text: newTerm.trim() }]);
    setNewTerm("");
  };

  const addPremiumTerm = () => {
    if (!newPremiumTerm.trim()) return;
    setPremiumTerms((prev) => [...prev, { id: `t-prem-${Date.now()}`, text: newPremiumTerm.trim() }]);
    setNewPremiumTerm("");
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      <Tabs defaultValue="policies" className="w-full">
        <TabsList className="h-auto p-1 bg-(--c-card-2) rounded-xl gap-0.5">
          <TabsTrigger value="policies" className="rounded-lg gap-2 text-sm font-medium data-[state=active]:bg-(--c-card) data-[state=active]:shadow-sm data-[state=active]:text-(--c-primary-strong)">
            <Shield className="w-4 h-4" />
            Chính sách
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{assignedPolicies.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="terms" className="rounded-lg gap-2 text-sm font-medium data-[state=active]:bg-(--c-card) data-[state=active]:shadow-sm data-[state=active]:text-(--c-primary-strong)">
            <ScrollText className="w-4 h-4" />
            Điều khoản & Quy chuẩn Premium
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{terms.length + premiumTerms.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="guarantees" className="rounded-lg gap-2 text-sm font-medium data-[state=active]:bg-(--c-card) data-[state=active]:shadow-sm data-[state=active]:text-(--c-primary-strong)">
            <ShieldCheck className="w-4 h-4" />
            Cam kết
          </TabsTrigger>
        </TabsList>

        {/* ── Policies Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="policies" className="mt-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <Shield className="w-4 h-4 text-(--c-primary-strong)" />
                Chính sách áp dụng
                <Badge variant="secondary">{assignedPolicies.length}</Badge>
              </h3>
              <p className="text-xs text-(--c-muted) mt-0.5">
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
              <RefreshCw className="w-5 h-5 animate-spin text-(--c-primary-strong)" />
            </div>
          ) : assignedPolicies.length === 0 ? (
            <div className="py-14 text-center rounded-2xl border-2 border-dashed border-(--c-line)/50 bg-(--c-card-2)">
              <Shield className="w-10 h-10 mx-auto mb-3 text-(--c-muted)" />
              <p className="font-semibold text-sm text-(--c-muted)">Chưa có chính sách nào</p>
              <p className="text-xs text-(--c-muted) mt-1 mb-4 max-w-xs mx-auto">
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
            <div className="space-y-4 rounded-xl border border-(--c-line)/50 overflow-hidden">
              {Array.from(grouped.entries()).map(([cat, items], idx) => {
                const meta = POLICY_CATEGORY_META[cat];
                const CatIcon = meta.icon;
                return (
                  <div key={cat}>
                    {idx > 0 && <Separator />}
                    <div className="px-4 py-2.5 bg-(--c-card-2) flex items-center gap-2">
                      <CatIcon className={`w-4 h-4 ${meta.color.split(' ')[0]}`} />
                      <span className="text-xs font-bold uppercase tracking-wide text-(--c-muted)">
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
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Điều khoản & Quy chuẩn chi tiết
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
                    const res = parseTermsAndPremium(pkg.termsAndConditions);
                    setTerms(res.standard);
                    setPremiumTerms(res.premium);
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Standard Terms Section */}
            <div className="space-y-4">
              <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5 pb-2 border-b border-border/40">
                <ScrollText className="w-4 h-4 text-slate-500" />
                Điều khoản áp dụng chung (Gói Chuẩn)
                <Badge variant="secondary" className="ml-auto">{terms.length}</Badge>
              </h4>
              
              {isEditingTerms && (
                <div className="flex gap-2">
                  <Input
                    value={newTerm}
                    onChange={(e) => setNewTerm(e.target.value)}
                    placeholder="Nhập điều khoản chuẩn mới..."
                    onKeyDown={(e) => e.key === "Enter" && addTerm()}
                    className="flex-1 text-xs"
                  />
                  <BaseButton variant="outline" size="sm" onClick={addTerm} className="gap-1 shrink-0">
                    <Plus className="w-4 h-4" /> Thêm
                  </BaseButton>
                </div>
              )}

              {terms.length === 0 ? (
                <div className="py-6 text-center rounded-lg border border-dashed border-border bg-muted/10">
                  <p className="text-xs text-muted-foreground italic">Chưa có điều khoản.</p>
                </div>
              ) : (
                <ol className="space-y-2.5">
                  {terms.map((term, idx) => (
                    <li key={term.id} className="flex items-start gap-2.5">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-800 text-xs font-bold flex items-center justify-center mt-0.5">
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
                            className="flex-1 text-xs h-8"
                          />
                          <BaseButton
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setTerms((prev) => prev.filter((t) => t.id !== term.id))}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </BaseButton>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-800 leading-relaxed flex-1 pt-0.5 font-medium">{term.text}</p>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {/* Premium Commitments Section */}
            <div className="space-y-4">
              <h4 className="text-sm font-extrabold text-amber-800 flex items-center gap-1.5 pb-2 border-b border-border/40">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                Quy chuẩn & Cam kết Premium
                <Badge variant="secondary" className="ml-auto bg-amber-50 text-amber-700 border-amber-200">{premiumTerms.length}</Badge>
              </h4>

              {isEditingTerms && (
                <div className="flex gap-2">
                  <Input
                    value={newPremiumTerm}
                    onChange={(e) => setNewPremiumTerm(e.target.value)}
                    placeholder="Nhập cam kết Premium mới..."
                    onKeyDown={(e) => e.key === "Enter" && addPremiumTerm()}
                    className="flex-1 text-xs"
                  />
                  <BaseButton variant="outline" size="sm" onClick={addPremiumTerm} className="gap-1 shrink-0 border-amber-200 text-amber-700 hover:bg-amber-50">
                    <Plus className="w-4 h-4" /> Thêm
                  </BaseButton>
                </div>
              )}

              {premiumTerms.length === 0 ? (
                <div className="py-6 text-center rounded-lg border border-dashed border-amber-200/50 bg-amber-50/20">
                  <p className="text-xs text-amber-800/60 italic">Chưa có cam kết Premium riêng. Nhấn Chỉnh sửa để thêm.</p>
                </div>
              ) : (
                <ol className="space-y-2.5">
                  {premiumTerms.map((term, idx) => (
                    <li key={term.id} className="flex items-start gap-2.5">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold flex items-center justify-center mt-0.5">
                        {idx + 1}
                      </span>
                      {isEditingTerms ? (
                        <div className="flex-1 flex gap-2">
                          <Input
                            value={term.text}
                            onChange={(e) =>
                              setPremiumTerms((prev) =>
                                prev.map((t) => t.id === term.id ? { ...t, text: e.target.value } : t)
                              )
                            }
                            className="flex-1 text-xs h-8"
                          />
                          <BaseButton
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setPremiumTerms((prev) => prev.filter((t) => t.id !== term.id))}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </BaseButton>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-800 leading-relaxed flex-1 pt-0.5 font-bold">{term.text}</p>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>

          <Separator />

          <div>
            <Label className="font-semibold flex items-center gap-2 mb-2 text-xs">
              <Info className="w-4 h-4 text-blue-500" />
              Ghi chú nội bộ cho gói dịch vụ
            </Label>
            {isEditingTerms ? (
              <Textarea
                value={policyDesc}
                onChange={(e) => setPolicyDesc(e.target.value)}
                rows={4}
                className="resize-none text-xs"
                placeholder="Ghi chú nội bộ cho gói dịch vụ này..."
              />
            ) : (
              <div className="rounded-xl border bg-muted/10 px-4 py-3 min-h-[60px]">
                {policyDesc ? (
                  <p className="text-xs leading-relaxed whitespace-pre-wrap">{policyDesc}</p>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Chưa có ghi chú.</p>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Guarantees Tab ───────────────────────────────────────────────── */}
        <TabsContent value="guarantees" className="mt-5 space-y-5">
          <div>
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Cam kết chất lượng CleanZ (Áp dụng chung)
            </h3>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { icon: ShieldCheck, label: "Bảo hành 48h",          desc: "Làm lại miễn phí nếu chưa đạt",        cls: "bg-emerald-50/60 border-emerald-100 text-emerald-800 dark:bg-emerald-950/20" },
                { icon: Star,        label: "Nhân viên chuyên nghiệp", desc: "Đào tạo bài bản, kiểm tra lý lịch",   cls: "bg-amber-50/60 border-amber-100 text-amber-800 dark:bg-amber-950/20" },
                { icon: FileText,   label: "Hóa chất an toàn",       desc: "An toàn cho gia đình và thú cưng",    cls: "bg-blue-50/60 border-blue-100 text-blue-800 dark:bg-blue-950/20" },
              ].map(({ icon: Icon, label, desc, cls }) => (
                <div key={label} className={`rounded-xl p-4 border ${cls}`}>
                  <Icon className="w-5 h-5 mb-2 opacity-80" />
                  <p className="font-extrabold text-xs">{label}</p>
                  <p className="text-[11px] mt-1 opacity-90 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {premiumTerms.length > 0 && (
            <div className="pt-2">
              <h3 className="font-extrabold text-sm text-amber-800 flex items-center gap-2 mb-3">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                Đặc quyền & Quy chuẩn Premium của gói
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {premiumTerms.map((term, idx) => (
                  <div key={term.id} className="rounded-xl p-4 border border-amber-200 bg-amber-50/30 text-amber-900 flex gap-3 items-start">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-amber-100/80 border border-amber-200 text-amber-800 text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div className="space-y-0.5">
                      <p className="text-xs font-extrabold text-amber-950">Quy chuẩn Premium</p>
                      <p className="text-[11px] leading-relaxed text-amber-800 font-bold">{term.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl bg-muted/20 border border-border/30 px-4 py-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong>Lưu ý:</strong> Cam kết chất lượng Premium hiển thị rõ ràng trên giao diện ứng dụng để khách hàng nắm được quyền lợi đặc quyền của gói. Cấu hình các cam kết này ở tab <strong>Điều khoản & Quy chuẩn Premium</strong>.
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
