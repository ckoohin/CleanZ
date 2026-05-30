"use client";

import React, { useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  useAdminStaffDetail, useApproveStaff, useRejectStaff,
  useAdminStaffDocuments, useRequestMoreInfoStaff,
  useAdminStaffPenalties, useBanStaff, useUnbanStaff,
} from "../hooks/admin-staff.hooks";
import { AdminReviewModal } from "./AdminReviewModal";
import { BanStaffModal } from "./BanStaffModal";
import { parseAdminNotes } from "./AdminRequestInfoModal";
import { StaffReviewPanel } from "./StaffReviewPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ClipboardCheck, UserIcon, FileText, Info,
  Phone, MapPin, CreditCard, Star, Briefcase,
  CheckCircle2, XCircle, Clock, AlertCircle, ImageIcon, ZoomIn, ExternalLink,
} from "lucide-react";
import { StaffStatus } from "@/features/staffs/types/staff.type";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StaffDetailModalProps {
  staffId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface StaffPenalty {
  id: string;
  reason: string;
  type: string;
  createdAt: string;
  endsAt?: string;
  createdBy?: {
    fullName?: string;
  };
}

const DOC_TYPE_MAP: Record<string, { label: string; icon: string }> = {
  citizenCard:       { label: "CCCD / CMND",         icon: "🪪" },
  idWithSelfie:      { label: "Selfie + CCCD",        icon: "🤳" },
  criminalRecord:    { label: "Lý lịch tư pháp",      icon: "📋" },
  healthCertificate: { label: "Giấy khám sức khoẻ",  icon: "🏥" },
  certificate:       { label: "Chứng chỉ nghề",       icon: "📜" },
};

// ─── Small helpers ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: StaffStatus }) {
  const MAP = {
    [StaffStatus.PENDING]:   { label: "Chờ duyệt",   cls: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30" },
    [StaffStatus.APPROVED]:  { label: "Đã duyệt",    cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" },
    [StaffStatus.REJECTED]:  { label: "Từ chối",     cls: "bg-red-500/10 text-red-700 border-red-500/30" },
    [StaffStatus.NEED_INFO]: { label: "Cần bổ sung", cls: "bg-blue-500/10 text-blue-700 border-blue-500/30" },
  };
  const cfg = MAP[status] ?? MAP[StaffStatus.PENDING];
  return (
    <Badge variant="outline" className={cn("text-[10px] font-bold px-2 py-0.5 uppercase tracking-widest", cfg.cls)}>
      {cfg.label}
    </Badge>
  );
}

function InfoRow({ icon: Icon, label, value, missing }: {
  icon: React.ElementType; label: string; value?: string | null; missing?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
        missing && !value ? "bg-red-100 text-red-500 dark:bg-red-900/30" : "bg-muted text-muted-foreground"
      )}>
        <Icon className="w-4 h-4" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
        {value
          ? <p className="text-sm mt-0.5 leading-relaxed break-words">{value}</p>
          : <p className="text-sm mt-0.5 text-muted-foreground/60 italic">{missing ? "⚠ Chưa cập nhật" : "—"}</p>
        }
      </div>
    </div>
  );
}

function DocImageCard({ doc, label }: { doc: { fileUrl: string; id: string }; label: string }) {
  return (
    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
      className="group relative aspect-video rounded-xl border border-border overflow-hidden block bg-muted"
    >
      <img src={doc.fileUrl} alt={label}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center">
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 bg-white/90 text-gray-900 rounded-full px-3 py-1.5 text-xs font-semibold shadow">
          <ZoomIn className="w-3.5 h-3.5" aria-hidden="true" /> Xem ảnh gốc
          <ExternalLink className="w-3 h-3" aria-hidden="true" />
        </div>
      </div>
      <Badge className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm border-none text-white text-[10px]">{label}</Badge>
    </a>
  );
}

// ─── Main Sheet ───────────────────────────────────────────────────────────────

export const StaffDetailModal: React.FC<StaffDetailModalProps> = ({ staffId, isOpen, onClose }) => {
  const { data: staff, isLoading: isStaffLoading } = useAdminStaffDetail(staffId);
  const { data: docsData, isLoading: isDocsLoading } = useAdminStaffDocuments(staffId);
  const approveMutation     = useApproveStaff();
  const rejectMutation      = useRejectStaff();
  const requestInfoMutation = useRequestMoreInfoStaff();
  const { data: penalties, isLoading: isPenaltiesLoading } = useAdminStaffPenalties(staffId);
  const banMutation = useBanStaff();
  const unbanMutation = useUnbanStaff();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [banOpen, setBanOpen] = useState(false);

  const parsedNotes = parseAdminNotes(staff?.adminNotes);
  const docs: Array<{ id: string; type: string; fileUrl: string }> = docsData?.documents ?? [];
  const getDocsByType = (type: string) => docs.filter((d) => d.type === type);

  const isPending  = staff?.approvalStatus === StaffStatus.PENDING;
  const isNeedInfo = staff?.approvalStatus === StaffStatus.NEED_INFO;
  const canReview  = isPending || isNeedInfo;

  const initials = (staff as { fullName?: string } | undefined)?.fullName
    ? (staff as { fullName?: string }).fullName!.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "S";

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col gap-0">

          {/* Header */}
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
            <div className="flex items-center gap-4 pr-6">
              {isStaffLoading ? <Skeleton className="w-14 h-14 rounded-2xl shrink-0" /> : (
                <Avatar className="w-14 h-14 rounded-2xl shrink-0">
                  <AvatarImage src={staff?.avatarUrl ?? undefined} />
                  <AvatarFallback className="rounded-2xl bg-primary/10 text-primary text-xl font-black">{initials}</AvatarFallback>
                </Avatar>
              )}
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-xl font-bold truncate">
                  {isStaffLoading ? <Skeleton className="h-6 w-40" /> : ((staff as { fullName?: string } | undefined)?.fullName ?? "Đối tác")}
                </SheetTitle>
                <SheetDescription className="flex items-center gap-2 mt-1">
                  {isStaffLoading ? <Skeleton className="h-5 w-24" /> : staff ? (
                    <>
                      <StatusBadge status={staff.approvalStatus} />
                      {staff.createdAt && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(staff.createdAt).toLocaleDateString("vi-VN")}
                        </span>
                      )}
                    </>
                  ) : null}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* Tabs */}
          <ScrollArea className="flex-1">
            {isStaffLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
              </div>
            ) : staff ? (
              <div className="p-6">
                <Tabs defaultValue={canReview ? "review" : "info"}>
                  <TabsList className="w-full rounded-xl mb-5 h-10">
                    {canReview && (
                      <TabsTrigger value="review" className="flex-1 text-xs font-semibold gap-1.5">
                        <ClipboardCheck className="w-3.5 h-3.5" aria-hidden="true" /> Xét duyệt
                      </TabsTrigger>
                    )}
                    <TabsTrigger value="info" className="flex-1 text-xs font-semibold gap-1.5">
                      <UserIcon className="w-3.5 h-3.5" aria-hidden="true" /> Hồ sơ
                    </TabsTrigger>
                    <TabsTrigger value="docs" className="flex-1 text-xs font-semibold gap-1.5">
                      <FileText className="w-3.5 h-3.5" aria-hidden="true" /> Giấy tờ
                    </TabsTrigger>
                    <TabsTrigger value="status" className="flex-1 text-xs font-semibold gap-1.5">
                      <Info className="w-3.5 h-3.5" aria-hidden="true" /> Lịch sử
                    </TabsTrigger>
                    <TabsTrigger value="penalties" className="flex-1 text-xs font-semibold gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" /> Kỷ luật
                    </TabsTrigger>
                  </TabsList>

                  {/* ── Tab: Xét duyệt ── */}
                  {canReview && (
                    <TabsContent value="review" className="mt-0">
                      <StaffReviewPanel
                        staff={staff}
                        docs={docs}
                        isApproving={approveMutation.isPending}
                        isRequesting={requestInfoMutation.isPending}
                        onApprove={() => approveMutation.mutate(staffId, { onSuccess: onClose })}
                        onReject={() => setRejectOpen(true)}
                        onRequestInfo={(serializedNotes) =>
                          requestInfoMutation.mutate({ id: staffId, notes: serializedNotes }, {
                            onSuccess: onClose,
                          })
                        }
                      />
                    </TabsContent>
                  )}

                  {/* ── Tab: Hồ sơ ── */}
                  <TabsContent value="info" className="space-y-4 mt-0">
                    <div className="rounded-xl border border-border p-4 space-y-0.5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Cá nhân</p>
                      <InfoRow icon={Phone}  label="Số điện thoại"     value={staff.phone}          missing={!staff.phone} />
                      <Separator />
                      <InfoRow icon={MapPin} label="Địa chỉ thường trú" value={staff.addressResident} />
                      <Separator />
                      <InfoRow icon={MapPin} label="Địa chỉ hiện tại"  value={staff.addressCurrent}  missing={!staff.addressCurrent} />
                    </div>
                    <div className="rounded-xl border border-border p-4 space-y-0.5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Nghề nghiệp</p>
                      <InfoRow icon={Briefcase} label="Kinh nghiệm"         value={staff.experience} />
                      <Separator />
                      <InfoRow icon={Star}      label="Kỹ năng"             value={staff.skills} />
                      <Separator />
                      <InfoRow icon={UserIcon}  label="Giới thiệu bản thân" value={staff.bio} />
                    </div>
                    <div className="rounded-xl border border-border p-4 space-y-0.5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Ngân hàng</p>
                      <InfoRow icon={CreditCard} label="Ngân hàng"     value={staff.bankName}          missing={!staff.bankName} />
                      <Separator />
                      <InfoRow icon={CreditCard} label="Số tài khoản"  value={staff.bankAccountNumber} />
                      <Separator />
                      <InfoRow icon={CreditCard} label="Chủ tài khoản" value={staff.bankAccountName} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-border p-4 text-center">
                        <p className="text-2xl font-black">{staff.totalJobs ?? 0}</p>
                        <p className="text-xs text-muted-foreground mt-1">Tổng đơn xong</p>
                      </div>
                      <div className="rounded-xl border border-border p-4 text-center">
                        <p className="text-2xl font-black">
                          {staff.avgRating > 0 ? staff.avgRating.toFixed(1) : "—"}
                          {staff.avgRating > 0 && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 inline ml-0.5" aria-hidden="true" />}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Đánh giá TB</p>
                      </div>
                    </div>
                  </TabsContent>

                  {/* ── Tab: Giấy tờ ── */}
                  <TabsContent value="docs" className="space-y-5 mt-0">
                    {/* Overview */}
                    <div className="grid grid-cols-5 gap-1.5">
                      {([
                        { id: "citizenCard", has: !!staff.hasCitizenCardImage, label: "CCCD" },
                        { id: "idWithSelfie", has: !!staff.hasIdWithSelfieImage, label: "Selfie" },
                        { id: "criminalRecord", has: !!staff.hasCriminalRecordImage, label: "Tư pháp" },
                        { id: "healthCertificate", has: !!staff.hasHealthCertificateImage, label: "Sức khoẻ" },
                        { id: "certificate", has: !!staff.hasCertificateImage, label: "Chứng chỉ" },
                      ] as const).map((f) => (
                        <div key={f.id} className={cn(
                          "flex flex-col items-center gap-1 p-2 rounded-xl border text-[10px] font-semibold text-center",
                          f.has ? "border-emerald-500/30 bg-emerald-500/8 text-emerald-700"
                               : "border-red-300/50 bg-red-50/60 dark:bg-red-950/20 text-red-600"
                        )}>
                          {f.has ? <CheckCircle2 className="w-5 h-5" aria-hidden="true" /> : <XCircle className="w-5 h-5" aria-hidden="true" />}
                          {f.label}
                        </div>
                      ))}
                    </div>

                    {isDocsLoading ? (
                      <div className="grid grid-cols-2 gap-3">
                        {[...Array(4)].map((_, i) => <Skeleton key={i} className="aspect-video rounded-xl" />)}
                      </div>
                    ) : docs.length > 0 ? (
                      Object.entries(DOC_TYPE_MAP).map(([type, cfg]) => {
                        const typeDocs = getDocsByType(type);
                        if (typeDocs.length === 0) return null;
                        return (
                          <div key={type} className="space-y-2">
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                              <span>{cfg.icon}</span> {cfg.label}
                              <Badge variant="outline" className="text-[10px] ml-1">{typeDocs.length} ảnh</Badge>
                            </p>
                            <div className={cn("grid gap-3", typeDocs.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
                              {typeDocs.map((doc, idx) => (
                                <DocImageCard key={doc.id} doc={doc}
                                  label={typeDocs.length > 1 ? `Trang ${idx + 1}` : cfg.label}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="border border-dashed border-border rounded-xl p-12 flex flex-col items-center gap-3 text-center">
                        <ImageIcon className="w-10 h-10 text-muted-foreground" aria-hidden="true" />
                        <p className="font-semibold text-muted-foreground">Chưa có giấy tờ nào</p>
                      </div>
                    )}
                  </TabsContent>

                  {/* ── Tab: Lịch sử ── */}
                  <TabsContent value="status" className="space-y-4 mt-0">
                    <div className="rounded-xl border border-border p-4 flex items-center gap-4">
                      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                        isPending ? "bg-yellow-500/10" : isNeedInfo ? "bg-blue-500/10" :
                        staff.approvalStatus === StaffStatus.APPROVED ? "bg-emerald-500/10" : "bg-red-500/10"
                      )}>
                        {isPending ? <Clock className="w-6 h-6 text-yellow-600" aria-hidden="true" /> :
                         isNeedInfo ? <Info className="w-6 h-6 text-blue-600" aria-hidden="true" /> :
                         staff.approvalStatus === StaffStatus.APPROVED
                           ? <CheckCircle2 className="w-6 h-6 text-emerald-600" aria-hidden="true" />
                           : <XCircle className="w-6 h-6 text-red-600" aria-hidden="true" />}
                      </div>
                      <div>
                        <StatusBadge status={staff.approvalStatus} />
                        {staff.lastChangedByAdminName && (
                          <p className="text-xs text-muted-foreground mt-1.5">
                            Cập nhật bởi: <span className="font-semibold">{staff.lastChangedByAdminName}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {staff.adminNotes && (
                      <div className={cn("rounded-xl border-l-4 p-4",
                        staff.approvalStatus === StaffStatus.REJECTED
                          ? "bg-red-50 dark:bg-red-950/20 border-red-500"
                          : "bg-blue-50 dark:bg-blue-950/20 border-blue-500"
                      )}>
                        <p className="text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                          <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                          {staff.approvalStatus === StaffStatus.REJECTED ? "Lý do từ chối" : "Yêu cầu bổ sung lần trước"}
                        </p>
                        {parsedNotes ? (
                          <div className="space-y-3">
                            {parsedNotes.itemLabels.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {parsedNotes.itemLabels.map((label) => (
                                  <Badge key={label} variant="outline" className="text-xs bg-white/60 dark:bg-white/10">{label}</Badge>
                                ))}
                              </div>
                            )}
                            {parsedNotes.note && (
                              <p className="text-sm leading-relaxed italic">&ldquo;{parsedNotes.note}&rdquo;</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{staff.adminNotes}</p>
                        )}
                      </div>
                    )}
                  </TabsContent>

                  {/* ── Tab: Kỷ luật ── */}
                  <TabsContent value="penalties" className="space-y-4 mt-0">
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Lịch sử kỷ luật</p>
                      <Button variant="destructive" size="sm" onClick={() => setBanOpen(true)} className="text-xs h-8">
                        <AlertCircle className="w-3.5 h-3.5 mr-1" /> Xử lý vi phạm
                      </Button>
                    </div>

                    {isPenaltiesLoading ? (
                      <div className="space-y-3">
                        <Skeleton className="h-20 w-full rounded-xl" />
                        <Skeleton className="h-20 w-full rounded-xl" />
                      </div>
                    ) : penalties && penalties.length > 0 ? (
                      <div className="space-y-3">
                        {penalties.map((p: StaffPenalty) => (
                          <div key={p.id} className="rounded-xl border border-border p-4 space-y-2 bg-card">
                            <div className="flex justify-between items-start">
                              <Badge variant="outline" className={cn(
                                "text-[10px] font-bold px-2 py-0.5 uppercase tracking-widest",
                                p.type === "PERMANENT" ? "bg-red-500/10 text-red-700 border-red-500/30" : "bg-yellow-500/10 text-yellow-700 border-yellow-500/30"
                              )}>
                                {p.type === "DAYS_2" ? "Khóa 2 ngày" : p.type === "DAYS_7" ? "Khóa 7 ngày" : "Khóa vĩnh viễn"}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(p.createdAt).toLocaleDateString("vi-VN")}
                              </span>
                            </div>
                            <p className="text-sm text-foreground font-medium leading-relaxed">{p.reason}</p>
                            <div className="text-[11px] text-muted-foreground flex justify-between pt-1 border-t border-border/50">
                              <span>Người xử lý: <span className="font-semibold text-foreground">{p.createdBy?.fullName || "Admin"}</span></span>
                              {p.endsAt && (
                                <span>Hết hạn: <span className="font-semibold text-foreground">{new Date(p.endsAt).toLocaleDateString("vi-VN")}</span></span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="border border-dashed border-border rounded-xl p-12 flex flex-col items-center gap-3 text-center bg-muted/30">
                        <AlertCircle className="w-10 h-10 text-muted-foreground/60" aria-hidden="true" />
                        <p className="font-semibold text-muted-foreground">Chưa có bản ghi kỷ luật nào</p>
                        <p className="text-xs text-muted-foreground/60 max-w-[250px]">Nếu đối tác vi phạm quy định, bạn có thể áp dụng các hình thức kỷ luật tại đây.</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            ) : null}
          </ScrollArea>

          {/* Approved: quick action footer */}
          {staff?.approvalStatus === StaffStatus.APPROVED && (
            <div className="shrink-0 px-6 py-3 border-t border-border bg-emerald-500/5">
              <p className="text-xs text-emerald-700 font-semibold text-center flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                Đã phê duyệt — Staff đang hoạt động và nhận booking
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Reject modal */}
      <AdminReviewModal
        isOpen={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Xác nhận từ chối hồ sơ"
        description="Nêu rõ lý do cụ thể để nhân viên hiểu và có thể cải thiện."
        isLoading={rejectMutation.isPending}
        onConfirm={(notes) =>
          rejectMutation.mutate({ id: staffId, notes }, {
            onSuccess: () => { setRejectOpen(false); onClose(); },
          })
        }
      />

      {/* Ban modal */}
      <BanStaffModal
        isOpen={banOpen}
        onClose={() => setBanOpen(false)}
        isLoading={banMutation.isPending}
        onConfirm={(reason, type) =>
          banMutation.mutate({ id: staffId, reason, type }, {
            onSuccess: () => { setBanOpen(false); onClose(); },
          })
        }
      />
    </>
  );
};
