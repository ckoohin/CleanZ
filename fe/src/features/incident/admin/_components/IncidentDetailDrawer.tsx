"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, Clock, FileText, ClipboardCheck, MessageSquare } from "lucide-react";
import { useAdminIncidentDetail } from "../hooks/useAdminIncident";
import {
  IncidentStatusBadge,
  SeverityBadge,
} from "@/features/incident/shared/_components/badges";
import { StatementThread } from "@/features/incident/shared/_components/StatementThread";
import {
  formatVnd,
  COMP_SOURCE_LABEL,
  VERIFICATION_STATUS_LABEL,
} from "@/features/incident/shared/incident.labels";
import { AcceptPanel } from "./panels/AcceptPanel";
import { DecisionPanel } from "./panels/DecisionPanel";
import {
  CompensatePanel,
  ReverseCompensationPanel,
  WithdrawDecisionPanel,
  WriteOffDebtPanel,
} from "./panels/CompensationPanels";
import { DecisionResponseHistory } from "./panels/DecisionResponseHistory";
import { UnlockReporterButton } from "./UnlockReporterButton";

function fmt(d: string | null | undefined) {
  return d ? new Date(d).toLocaleString("vi-VN") : "—";
}
function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--c-muted)]">{label}</p>
      <div className="text-sm text-[var(--c-ink-soft)]">{children}</div>
    </div>
  );
}
function SectionTitle({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--c-muted)]">
      <Icon className="size-3.5 text-[var(--c-primary-strong)]" /> {children}
    </p>
  );
}

interface Props {
  incidentId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function IncidentDetailDrawer({ incidentId, isOpen, onClose }: Props) {
  const { data: inc, isLoading } = useAdminIncidentDetail(incidentId);
  const actions = inc?.decision.allowedActions ?? [];
  const canAccept = inc?.status === "REPORTED";
  // Thẩm định hạng mục nay nằm trong form quyết định — không còn bước "Xác minh" riêng.
  const showDecision =
    inc?.status === "REVIEWING" || inc?.status === "AWAITING_RESPONSE";
  const canCompensate = actions.includes("COMPENSATE" as never);
  const canReverse = actions.includes("REVERSE" as never);
  const noAction =
    inc && !canAccept && !showDecision && !canCompensate && !canReverse;

  const responses = inc?.decisionResponses ?? [];
  const appendixCount = (inc?.statements.length ?? 0) + responses.length;

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="cz-admin flex h-[88vh] w-[80vw] max-w-none sm:max-w-none flex-col gap-0 overflow-hidden rounded-2xl p-0 bg-[var(--c-card)] text-[var(--c-ink)]"
      >
        <DialogHeader className="space-y-2 border-b border-[var(--c-line)] px-6 py-4 text-left">
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-[var(--c-ink)]">
            <FileText className="size-4 text-[var(--c-primary-strong)]" />
            {isLoading ? <Skeleton className="h-5 w-32" /> : inc?.incidentCode ?? "Chi tiết sự cố"}
            {inc && (
              <span className="flex flex-wrap items-center gap-1.5 pl-2">
                <SeverityBadge severity={inc.severity} />
                <IncidentStatusBadge status={inc.status} />
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="line-clamp-1 text-xs text-[var(--c-muted)]">
            {isLoading ? <Skeleton className="h-3 w-48" /> : inc?.title}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : inc ? (
          <Tabs defaultValue="overview" className="flex min-h-0 flex-1 flex-col gap-0">
            {/* Menu ngang điều hướng các phụ lục trong form */}
            <div className="border-b border-[var(--c-line)] px-6 py-3">
              <TabsList className="w-full rounded-xl bg-[var(--c-card-2)]">
                <TabsTrigger value="overview" className="flex-1 gap-1.5 text-xs">
                  <FileText className="size-3.5" /> Tổng quan
                </TabsTrigger>
                <TabsTrigger value="assessment" className="flex-1 gap-1.5 text-xs">
                  <ClipboardCheck className="size-3.5" /> Thẩm định &amp; xử lý
                </TabsTrigger>
                <TabsTrigger value="appendix" className="flex-1 gap-1.5 text-xs">
                  <MessageSquare className="size-3.5" /> Phản hồi &amp; Giải trình
                  {appendixCount > 0 && (
                    <span className="ml-0.5 rounded-full bg-[var(--c-primary)]/15 px-1.5 text-[10px] font-bold text-[var(--c-primary-strong)]">
                      {appendixCount}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Phụ lục 1: Tổng quan */}
            <TabsContent value="overview" className="min-h-0 flex-1 overflow-y-auto p-6">
              <div className="mx-auto w-full max-w-5xl space-y-5">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <Item label="Khách hàng">{inc.customer.fullName ?? "—"}</Item>
                  <Item label="Tasker">{inc.tasker.fullName ?? "—"}</Item>
                  <Item label="Số dư ví (Tasker)">{formatVnd(inc.tasker.walletBalance)}</Item>
                  <Item label="Cửa sổ báo cáo">{fmt(inc.reportWindowUntil)}</Item>
                  <Item label="Hạn quyết định (SLA)">{fmt(inc.decisionDueAt)}</Item>
                  <Item label="Hạn giải trình">{fmt(inc.statementDueAt)}</Item>
                  <Item label="Hạn Tasker phản biện">{fmt(inc.decision.taskerResponseDeadline)}</Item>
                </div>

                {/* Tình trạng tiền: phần ví đang tạm giữ chờ xử lý bồi thường */}
                {(inc.taskerWalletHoldAmount ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#3B82F6]/15 px-2.5 py-1 text-xs font-semibold text-[#1D4ED8]">
                      <Wallet className="size-3.5" /> Đang tạm giữ ví: {formatVnd(inc.taskerWalletHoldAmount)}
                    </span>
                  </div>
                )}

                <div className="rounded-xl border border-[var(--c-line)] bg-[var(--c-card-2)] p-3 text-sm">
                  <p className="mb-1 text-xs font-bold text-[var(--c-muted)]">Mô tả</p>
                  <p className="whitespace-pre-wrap">{inc.description}</p>
                </div>

                {/* Damage items */}
                <div className="space-y-2">
                  <SectionTitle icon={FileText}>Hạng mục thiệt hại</SectionTitle>
                  <div className="grid gap-2 md:grid-cols-2">
                    {inc.damageItems.map((it) => (
                      <div key={it.id} className="rounded-lg border border-[var(--c-line)] p-2.5 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium">{it.description}</p>
                          <span
                            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${it.verificationStatus === "VERIFIED"
                                ? "bg-[#10B981]/15 text-[#047857]"
                                : it.verificationStatus === "REJECTED"
                                  ? "bg-[#DC2626]/15 text-[#B91C1C]"
                                  : "bg-[#F59E0B]/15 text-[#B45309]"
                              }`}
                          >
                            {VERIFICATION_STATUS_LABEL[it.verificationStatus] ?? it.verificationStatus}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-[var(--c-muted)]">
                          <span>Yêu cầu {formatVnd(it.claimedAmount)}</span>
                          {it.verifiedAmount != null && <span>Xác minh {formatVnd(it.verifiedAmount)}</span>}
                          {it.approvedAmount != null && <span className="text-[#0E9F6E]">Duyệt {formatVnd(it.approvedAmount)}</span>}
                        </div>
                        {it.evidences.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {it.evidences.map((ev) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img key={ev.id} src={ev.url} alt="bằng chứng" className="size-14 rounded border border-[var(--c-line)] object-cover" />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Allocation + deposit */}
                {(inc.taskerBorneAmount != null || inc.platformBorneAmount != null) && (
                  <div className="grid grid-cols-2 gap-3 rounded-xl border border-[var(--c-line)] p-3 text-sm md:grid-cols-4">
                    <Item label="Tasker chịu">{formatVnd(inc.taskerBorneAmount)}</Item>
                    <Item label="Quỹ chịu">{formatVnd(inc.platformBorneAmount)}</Item>
                    {inc.compensationSource && (
                      <Item label="Nguồn bồi thường">
                        <span className="flex items-center gap-1"><Wallet className="size-3.5" /> {COMP_SOURCE_LABEL[inc.compensationSource]}</span>
                      </Item>
                    )}
                    {inc.allocationReason && <Item label="Lý do phân bổ">{inc.allocationReason}</Item>}
                    {inc.decision.recoverableFromDepositAmount != null && (
                      <Item label="Đã trừ ví/cọc Tasker">{formatVnd(inc.decision.recoverableFromDepositAmount)}</Item>
                    )}
                    {inc.decision.uncoveredLiabilityAmount != null && inc.decision.uncoveredLiabilityAmount > 0 && (
                      <>
                        <Item label="Nợ đã thu hồi">{formatVnd(inc.uncoveredRecoveredAmount)}</Item>
                        <Item label="Nợ còn lại (Tasker)">
                          <span className="font-semibold text-[#B45309]">
                            {formatVnd(
                              inc.decision.uncoveredLiabilityAmount - inc.uncoveredRecoveredAmount,
                            )}
                          </span>
                        </Item>
                      </>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Phụ lục 2: Thẩm định & xử lý */}
            <TabsContent value="assessment" className="min-h-0 flex-1 overflow-y-auto p-6">
              <div className="mx-auto w-full max-w-3xl space-y-5">
                {canAccept && <AcceptPanel id={inc.id} severity={inc.severity} />}
                {showDecision && <DecisionPanel incident={inc} />}
                {inc.status === "AWAITING_PAYOUT" && (
                  <CompensatePanel
                    id={inc.id}
                    code={inc.incidentCode}
                    amount={inc.approvedAmount}
                    preview={inc.payoutPreview}
                    blockedReason={
                      canCompensate
                        ? undefined
                        : inc.decision.blockedReasons?.join(" · ") ||
                          "Quyết định phải được chốt trước khi chi trả bồi thường"
                    }
                  />
                )}
                {(inc.transferProofEvidences?.length ?? 0) > 0 && (
                  <div className="space-y-1.5 rounded-lg border border-[var(--c-line)] bg-[var(--c-card-2)] p-2.5">
                    <p className="text-xs font-bold uppercase text-[var(--c-muted)]">
                      Minh chứng chuyển khoản thủ công ({inc.transferProofEvidences.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {inc.transferProofEvidences.map((ev) => (
                        <a key={ev.id} href={ev.url} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={ev.url} alt="minh chứng chuyển khoản" className="size-16 rounded border border-[var(--c-line)] object-cover transition hover:opacity-80" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {actions.includes("WITHDRAW_DECISION") && (
                  <WithdrawDecisionPanel id={inc.id} decisionVersion={inc.decision.version} />
                )}
                {/* Nút đảo bám theo allowedActions: BE biết trước 72h/chi thủ công/đã thu nợ
                    thì không đảo được, nên không bật nút rồi để Admin ăn 409 sau khi gõ lý do. */}
                {inc.status === "COMPENSATED" && (
                  <ReverseCompensationPanel
                    id={inc.id}
                    decisionVersion={inc.decision.version}
                    blockedReasons={
                      actions.includes("REVERSE") ? [] : (inc.decision.blockedReasons ?? [])
                    }
                  />
                )}
                <WriteOffDebtPanel
                  id={inc.id}
                  outstanding={inc.outstandingDebtAmount}
                  canWriteOff={inc.canWriteOffDebt}
                  writeOff={inc.debtWriteOff}
                />
                {noAction && inc.status !== "COMPENSATED" && (
                  <p className="rounded-lg border border-[var(--c-line)] bg-[var(--c-card-2)] p-3 text-xs text-[var(--c-muted)]">
                    <Clock className="mr-1 inline size-3.5" /> Không có hành động khả dụng ở trạng thái hiện tại.
                  </p>
                )}
                {(inc.status === "REJECTED" || inc.status === "CLOSED") && (
                  <UnlockReporterButton
                    id={inc.id}
                    customerName={inc.customer.fullName}
                    lockedUntil={inc.customer.reportingLockedUntil}
                  />
                )}
              </div>
            </TabsContent>

            {/* Phụ lục 3: Phản hồi & Giải trình */}
            <TabsContent value="appendix" className="min-h-0 flex-1 overflow-y-auto p-6">
              <div className="mx-auto w-full max-w-3xl space-y-6">
                <section className="space-y-2">
                  <SectionTitle icon={ClipboardCheck}>
                    Phản hồi quyết định của Tasker ({responses.length})
                  </SectionTitle>
                  <DecisionResponseHistory responses={responses} />
                </section>
                <section className="space-y-2">
                  <SectionTitle icon={MessageSquare}>
                    Giải trình ({inc.statements.length})
                  </SectionTitle>
                  <StatementThread statements={inc.statements} />
                  {(inc.statementEvidences?.length ?? 0) > 0 && (
                    <div className="space-y-1.5 rounded-lg border border-[var(--c-line)] bg-[var(--c-card-2)] p-2.5">
                      <p className="text-xs font-semibold text-[var(--c-ink)]">
                        Ảnh đính kèm giải trình ({inc.statementEvidences.length})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {inc.statementEvidences.map((ev) => (
                           
                          <a key={ev.id} href={ev.url} target="_blank" rel="noreferrer">
                            <img
                              src={ev.url}
                              alt="ảnh giải trình"
                              className="size-16 rounded border border-[var(--c-line)] object-cover transition hover:opacity-80"
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="p-6 text-center text-sm text-[var(--c-muted)]">Không tìm thấy sự cố</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
