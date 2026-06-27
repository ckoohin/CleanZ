"use client";

import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, Clock, FileText } from "lucide-react";
import { useAdminIncidentDetail } from "../hooks/useAdminIncident";
import {
  IncidentStatusBadge,
  CompensationBadge,
  SeverityBadge,
} from "@/features/incident/shared/_components/badges";
import { StatementThread } from "@/features/incident/shared/_components/StatementThread";
import { formatVnd, COMP_SOURCE_LABEL } from "@/features/incident/shared/incident.labels";
import { adminActions } from "@/features/incident/shared/incident.machine";
import { AcceptPanel } from "./panels/AcceptPanel";
import { VerifyItemsPanel } from "./panels/VerifyItemsPanel";
import { DecisionPanel } from "./panels/DecisionPanel";
import {
  ApproveCompensationPanel,
  CompensatePanel,
} from "./panels/CompensationPanels";
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

interface Props {
  incidentId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function IncidentDetailDrawer({ incidentId, isOpen, onClose }: Props) {
  const { data: inc, isLoading } = useAdminIncidentDetail(incidentId);
  const gate = inc
    ? adminActions({
        status: inc.status,
        compensationStatus: inc.compensationStatus,
        claimedAmount: inc.claimedAmount,
        coolingUntil: inc.coolingUntil,
      })
    : null;

  const noAction =
    gate && !gate.canAccept && !gate.canVerify && !gate.canDecide && !gate.canApproveCompensation && !gate.canCompensate;

  return (
    <Sheet open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="cz-admin flex w-full flex-col p-0 sm:max-w-2xl bg-[var(--c-card)] text-[var(--c-ink)]">
        <SheetHeader className="border-b border-[var(--c-line)] px-6 pb-4 pt-6">
          <SheetTitle className="flex items-center gap-2 text-base font-bold text-[var(--c-ink)]">
            <FileText className="size-4 text-[var(--c-primary-strong)]" />
            {isLoading ? <Skeleton className="h-5 w-32" /> : inc?.incidentCode ?? "Chi tiết sự cố"}
          </SheetTitle>
          <SheetDescription asChild>
            <span className="line-clamp-1 text-xs text-[var(--c-muted)]">
              {isLoading ? <Skeleton className="mt-1 h-3 w-48" /> : inc?.title}
            </span>
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-3 p-6 bg-[var(--c-card)]">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : inc && gate ? (
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-5 p-6">
              <div className="flex flex-wrap items-center gap-2">
                <SeverityBadge severity={inc.severity} />
                <IncidentStatusBadge status={inc.status} />
                <CompensationBadge status={inc.compensationStatus} />
              </div>

              <Tabs defaultValue="overview">
                <TabsList className="w-full rounded-xl bg-[var(--c-card-2)]">
                  <TabsTrigger value="overview" className="flex-1 text-xs">Tổng quan</TabsTrigger>
                  <TabsTrigger value="actions" className="flex-1 text-xs">Thẩm định</TabsTrigger>
                  <TabsTrigger value="statements" className="flex-1 text-xs">
                    Giải trình ({inc.statements.length})
                  </TabsTrigger>
                </TabsList>

                {/* Tổng quan */}
                <TabsContent value="overview" className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Item label="Khách hàng">{inc.customer.fullName ?? "—"}</Item>
                    <Item label="Tasker">{inc.tasker.fullName ?? "—"}</Item>
                    <Item label="Cọc khả dụng (Tasker)">{formatVnd(inc.tasker.availableDeposit)}</Item>
                    <Item label="Số dư cọc (Tasker)">{formatVnd(inc.tasker.currentDepositBalance)}</Item>
                    <Item label="Cửa sổ báo cáo">{fmt(inc.reportWindowUntil)}</Item>
                    <Item label="Hạn quyết định (SLA)">{fmt(inc.decisionDueAt)}</Item>
                    <Item label="Hạn giải trình">{fmt(inc.statementDueAt)}</Item>
                    <Item label="Cooling đến">{fmt(inc.coolingUntil)}</Item>
                  </div>

                  <div className="rounded-xl border border-[var(--c-line)] bg-[var(--c-card-2)] p-3 text-sm">
                    <p className="mb-1 text-xs font-bold text-[var(--c-muted)]">Mô tả</p>
                    {inc.description}
                  </div>

                  {/* Damage items */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wide text-[var(--c-muted)]">Hạng mục thiệt hại</p>
                    {inc.damageItems.map((it) => (
                      <div key={it.id} className="rounded-lg border border-[var(--c-line)] p-2.5 text-sm">
                        <p className="font-medium">{it.description}</p>
                        <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-[var(--c-muted)]">
                          <span>Yêu cầu {formatVnd(it.claimedAmount)}</span>
                          {it.verifiedAmount != null && <span>Xác minh {formatVnd(it.verifiedAmount)}</span>}
                          {it.approvedAmount != null && <span className="text-[#0E9F6E]">Duyệt {formatVnd(it.approvedAmount)}</span>}
                        </div>
                        {it.evidences.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {it.evidences.map((ev) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img key={ev.id} src={ev.url} alt="bằng chứng" className="size-12 rounded border border-[var(--c-line)] object-cover" />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Allocation + deposit */}
                  {(inc.taskerBorneAmount != null || inc.platformBorneAmount != null) && (
                    <div className="grid grid-cols-2 gap-3 rounded-xl border border-[var(--c-line)] p-3 text-sm">
                      <Item label="Tasker chịu">{formatVnd(inc.taskerBorneAmount)}</Item>
                      <Item label="Quỹ chịu">{formatVnd(inc.platformBorneAmount)}</Item>
                      {inc.compensationSource && (
                        <Item label="Nguồn bồi thường">
                          <span className="flex items-center gap-1"><Wallet className="size-3.5" /> {COMP_SOURCE_LABEL[inc.compensationSource]}</span>
                        </Item>
                      )}
                      {inc.allocationReason && <Item label="Lý do phân bổ">{inc.allocationReason}</Item>}
                    </div>
                  )}
                </TabsContent>

                {/* Thẩm định */}
                <TabsContent value="actions" className="mt-4 space-y-5">
                  {gate.canAccept && <AcceptPanel id={inc.id} defaultSeverity={inc.severity} />}
                  {gate.canVerify && <VerifyItemsPanel id={inc.id} items={inc.damageItems} />}
                  {gate.canDecide && <DecisionPanel id={inc.id} items={inc.damageItems} />}
                  {gate.canApproveCompensation && <ApproveCompensationPanel id={inc.id} />}
                  {inc.status === "APPROVED" && (
                    <CompensatePanel
                      id={inc.id}
                      amount={inc.approvedAmount}
                      blockedReason={gate.canCompensate ? undefined : gate.compensateReason}
                    />
                  )}
                  {noAction && (
                    <p className="rounded-lg border border-[var(--c-line)] bg-[var(--c-card-2)] p-3 text-xs text-[var(--c-muted)]">
                      <Clock className="mr-1 inline size-3.5" /> Không có hành động khả dụng ở trạng thái hiện tại.
                    </p>
                  )}
                  {(inc.status === "REJECTED" || inc.status === "CLOSED") && (
                    <UnlockReporterButton id={inc.id} />
                  )}
                </TabsContent>

                {/* Giải trình */}
                <TabsContent value="statements" className="mt-4">
                  <StatementThread statements={inc.statements} />
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        ) : (
          <div className="p-6 text-center text-sm text-[var(--c-muted)]">Không tìm thấy sự cố</div>
        )}
      </SheetContent>
    </Sheet>
  );
}
