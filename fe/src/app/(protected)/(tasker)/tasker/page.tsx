'use client';

import React from 'react';
import { useTaskerProfile } from '@/features/tasker/hooks/tasker.hooks';
import { TaskerStatus } from '@/features/tasker/types/tasker.type';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Info,
  ArrowRight,
  Sparkles,
  FileText,
  Star,
  TrendingUp,
  Briefcase,
  AlertCircle,
  MapPin,
  Phone,
  CreditCard,
  ChevronRight,
  Calendar,
  Zap,
  DollarSign,
  ListChecks,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { TaskerSidebar } from '@/features/tasker/_components/TaskerSidebar';
import { TaskerRegistrationWizard } from '@/features/tasker/_components/TaskerRegistrationWizard';
import { parseAdminNotes } from '@/features/admin-tasker/_components/AdminRequestInfoModal';

// ─── Status Banners (khi chưa được duyệt) ────────────────────────────────────

function NoProfileBanner() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="w-full rounded-2xl border border-border bg-muted/50 p-10 flex flex-col items-center gap-5 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <FileText className="w-8 h-8 text-primary" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold">Bạn chưa có hồ sơ Đối tác</h2>
          <p className="text-muted-foreground leading-relaxed max-w-md">
            Hoàn thiện hồ sơ để bắt đầu nhận đơn và kiếm thu nhập cùng CleanZ.
          </p>
        </div>
        <Button asChild size="lg" className="rounded-xl px-10 h-12 font-bold shadow-lg shadow-primary/20">
          <Link href="/tasker/onboarding" className="flex items-center gap-2">
            Bắt đầu nộp hồ sơ <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </motion.div>
  );
}

function PendingReviewView({ tasker }: { tasker: {
  fullName?: string;
  phone?: string;
  bankName?: string;
  bankAccountNumber?: string;
  hasCitizenCardImage?: boolean;
  hasIdWithSelfieImage?: boolean;
  hasCriminalRecordImage?: boolean;
  hasHealthCertificateImage?: boolean;
} }) {
  if (!tasker) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="w-full rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-8 space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-yellow-500/20 flex items-center justify-center shrink-0">
            <Clock className="h-7 w-7 text-yellow-600" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-yellow-700 mb-1">Hồ sơ đang chờ xét duyệt</h2>
            <p className="text-yellow-600/80 leading-relaxed text-sm">
              Chúng tôi đã nhận được hồ sơ của bạn. Admin sẽ xem xét và phản hồi trong vòng <strong>24h làm việc</strong>. Bạn có thể xem lại thông tin đã nộp bên dưới.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 bg-yellow-500/10 px-3 py-1.5 rounded-full">
            <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            <span className="text-xs font-semibold text-yellow-600 uppercase tracking-widest">Đang xử lý</span>
          </div>
        </div>bg-linear-to-br

        <div className="border-t border-yellow-500/10 pt-6">
          <h3 className="font-bold text-sm mb-4 text-foreground">Thông tin đã nộp</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-card p-4 rounded-xl border border-border space-y-1">
              <p className="text-xs text-muted-foreground">Họ và tên</p>
              <p className="text-sm font-semibold">{tasker.fullName || 'Chưa cập nhật'}</p>
            </div>
            <div className="bg-white dark:bg-card p-4 rounded-xl border border-border space-y-1">
              <p className="text-xs text-muted-foreground">Số điện thoại</p>
              <p className="text-sm font-semibold">{tasker.phone || 'Chưa cập nhật'}</p>
            </div>
            <div className="bg-white dark:bg-card p-4 rounded-xl border border-border space-y-1">
              <p className="text-xs text-muted-foreground">Tài khoản ngân hàng</p>
              <p className="text-sm font-semibold">
                {tasker.bankName ? `${tasker.bankName} - ${tasker.bankAccountNumber}` : 'Chưa cập nhật'}
              </p>
            </div>
            <div className="bg-white dark:bg-card p-4 rounded-xl border border-border space-y-1">
              <p className="text-xs text-muted-foreground">Giấy tờ đính kèm</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {tasker.hasCitizenCardImage ? (
                  <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">CCCD: Đã nộp</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">CCCD: Thiếu</Badge>
                )}
                {tasker.hasIdWithSelfieImage ? (
                  <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">Selfie: Đã nộp</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">Selfie: Thiếu</Badge>
                )}
                {tasker.hasCriminalRecordImage && (
                  <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">LLTP: Đã nộp</Badge>
                )}
                {tasker.hasHealthCertificateImage && (
                  <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">Sức khỏe: Đã nộp</Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function NeedInfoBanner({ adminNotes }: { adminNotes?: string }) {
  const parsed = parseAdminNotes(adminNotes);

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
      <div className="w-full rounded-2xl border border-blue-500/20 bg-blue-500/8 p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <Info className="w-40 h-40 -mr-20 -mt-20 rotate-12 text-blue-600" aria-hidden="true" />
        </div>
        <div className="flex flex-col md:flex-row items-start gap-6">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center shrink-0">
            <Info className="h-7 w-7 text-blue-600" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-blue-700">Cần bổ sung thêm thông tin</h2>
              <p className="text-blue-600/70 text-sm mt-0.5">Admin đã xem xét hồ sơ và có yêu cầu cụ thể bên dưới</p>
            </div>

            {/* Structured items (v2 JSON) */}
            {parsed && parsed.itemLabels.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-200 dark:border-blue-800 space-y-3">
                <p className="font-semibold text-[10px] uppercase tracking-widest text-blue-500 flex items-center gap-1.5">
                  <ListChecks className="w-3 h-3" aria-hidden="true" /> Các mục cần bổ sung:
                </p>
                <div className="flex flex-wrap gap-2">
                  {parsed.itemLabels.map((label) => (
                    <Badge key={label} variant="outline" className="bg-white/60 dark:bg-white/10 border-blue-300 text-blue-700 text-xs">
                      {label}
                    </Badge>
                  ))}
                </div>
                {parsed.note && (
                  <p className="text-blue-700 dark:text-blue-300 leading-relaxed italic text-sm border-t border-blue-200 dark:border-blue-700 pt-3">
                    &ldquo;{parsed.note}&rdquo;
                  </p>
                )}
              </div>
            )}

            {/* Fallback: plain text notes (v1) */}
            {!parsed && adminNotes && (
              <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                <p className="font-semibold text-[10px] uppercase tracking-widest text-blue-500 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" aria-hidden="true" /> Ghi chú từ Admin:
                </p>
                <p className="text-blue-700 dark:text-blue-300 leading-relaxed italic text-sm">
                  &ldquo;{adminNotes}&rdquo;
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <Button asChild className="rounded-xl bg-blue-600 hover:bg-blue-700 px-6 h-11 shadow-md shadow-blue-500/20 group">
                <Link href="/tasker/onboarding" className="flex items-center gap-2">
                  Bổ sung hồ sơ ngay
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </Link>
              </Button>
              <p className="text-xs text-blue-600/60 italic">Sau khi cập nhật, hồ sơ sẽ được xét duyệt lại.</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function RejectedBanner({ adminNotes }: { adminNotes?: string }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="w-full rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800/50 p-8 flex flex-col md:flex-row items-start gap-6">
        <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
          <XCircle className="h-7 w-7 text-red-600" aria-hidden="true" />
        </div>
        <div className="flex-1 space-y-3">
          <h2 className="text-lg font-bold text-red-800 dark:text-red-300">Hồ sơ không được duyệt</h2>
          <div className="bg-white/60 dark:bg-white/5 p-4 rounded-xl border border-red-100 dark:border-red-800/30">
            <span className="font-bold text-red-700 dark:text-red-400">Lý do: </span>
            <span className="text-red-700 dark:text-red-400 leading-relaxed italic text-sm">
              {adminNotes || 'Không có lý do cụ thể.'}
            </span>
          </div>
          <p className="text-red-700/70 dark:text-red-400/70 text-sm leading-relaxed">
            Nếu có thắc mắc, vui lòng liên hệ hỗ trợ qua Hotline{' '}
            <span className="font-bold underline">1800 6868</span>.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── APPROVED Dashboard ───────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-5 space-y-3 hover:shadow-md transition-shadow"
    >
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', color)}>
        <Icon className="w-5 h-5" aria-hidden="true" />
      </div>
      <div>
        <p className="text-2xl font-black">{value}</p>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

function ProfileCompletionCard({ tasker }: { tasker: ReturnType<typeof useTaskerProfile>['data'] }) {
  if (!tasker) return null;

  const checks = [
    { label: 'Ảnh CCCD', done: !!tasker.hasCitizenCardImage },
    { label: 'Ảnh selfie + CCCD', done: !!tasker.hasIdWithSelfieImage },
    { label: 'Lý lịch tư pháp', done: !!tasker.hasCriminalRecordImage },
    { label: 'Giấy khám sức khoẻ', done: !!tasker.hasHealthCertificateImage },
    { label: 'Số điện thoại', done: !!tasker.phone },
    { label: 'Địa chỉ hiện tại', done: !!tasker.addressCurrent },
    { label: 'Thông tin ngân hàng', done: !!tasker.bankName },
  ];

  const completed = checks.filter((c) => c.done).length;
  const pct = Math.round((completed / checks.length) * 100);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm">Hoàn thiện hồ sơ</h3>
        <span className="text-sm font-black text-primary">{pct}%</span>
      </div>
      <Progress value={pct} className="h-2" />
      <div className="space-y-2">
        {checks.map((c) => (
          <div key={c.label} className="flex items-center gap-2 text-sm">
            <div className={cn('w-4 h-4 rounded-full flex items-center justify-center shrink-0',
              c.done ? 'bg-emerald-500/20 text-emerald-600' : 'bg-muted text-muted-foreground'
            )}>
              {c.done ? <CheckCircle2 className="w-3 h-3" aria-hidden="true" /> : <AlertCircle className="w-3 h-3" aria-hidden="true" />}
            </div>
            <span className={c.done ? 'text-foreground' : 'text-muted-foreground'}>{c.label}</span>
          </div>
        ))}
      </div>
      {pct < 100 && (
        <Button asChild size="sm" variant="outline" className="w-full rounded-xl h-9">
          <Link href="/tasker/profile">Cập nhật ngay</Link>
        </Button>
      )}
    </div>
  );
}

function ApprovedDashboard({ tasker }: { tasker: NonNullable<ReturnType<typeof useTaskerProfile>['data']> }) {
  const initials = tasker.fullName
    ? tasker.fullName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : 'S';

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-emerald-500/20 bg-emerald-500/8 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4"
      >
        <Avatar className="w-14 h-14">
          <AvatarImage src={tasker.avatarUrl ?? undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-lg font-black">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-bold truncate">Chào mừng, {tasker.fullName ?? 'Đối tác'}!</h2>
            <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-500/30 text-[10px] font-bold uppercase tracking-widest">
              <CheckCircle2 className="w-3 h-3 mr-1" aria-hidden="true" /> Đã xác minh
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">Sẵn sàng nhận đơn và kiếm thu nhập hôm nay!</p>
        </div>
        <Button asChild size="sm" className="rounded-xl shrink-0">
          <Link href="/tasker/schedule" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" aria-hidden="true" /> Xem lịch
          </Link>
        </Button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Briefcase} label="Tổng đơn" value={tasker.totalJobs} sub="Đã hoàn thành" color="bg-primary/10 text-primary" />
        <StatCard icon={Star} label="Đánh giá TB" value={tasker.avgRating > 0 ? tasker.avgRating.toFixed(1) + '★' : '—'} sub="Từ khách hàng" color="bg-yellow-500/10 text-yellow-600" />
        <StatCard icon={DollarSign} label="Thu nhập tháng" value="—" sub="Sắp ra mắt" color="bg-emerald-500/10 text-emerald-600" />
        <StatCard icon={TrendingUp} label="Đơn đang xử lý" value="0" sub="Hôm nay" color="bg-blue-500/10 text-blue-600" />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Activity / Jobs placeholder */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">Đơn hàng gần đây</h3>
            <Button variant="ghost" size="sm" className="text-primary text-xs gap-1">
              Xem tất cả <ChevronRight className="w-3 h-3" aria-hidden="true" />
            </Button>
          </div>
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-12 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
              <Zap className="w-7 h-7 text-muted-foreground" aria-hidden="true" />
            </div>
            <p className="font-semibold text-muted-foreground">Chưa có đơn hàng nào</p>
            <p className="text-sm text-muted-foreground/70">Bật trạng thái hoạt động để bắt đầu nhận đơn</p>
          </div>

          {/* Quick info */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <h3 className="font-bold text-sm">Thông tin nhanh</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Phone className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{tasker.phone ?? 'Chưa cập nhật'}</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <MapPin className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{tasker.addressCurrent ?? 'Chưa cập nhật'}</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <CreditCard className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{tasker.bankName ? `${tasker.bankName} ••••${tasker.bankAccountNumber?.slice(-4)}` : 'Chưa liên kết ngân hàng'}</span>
              </div>
            </div>
            <Button asChild variant="outline" size="sm" className="rounded-xl h-9">
              <Link href="/tasker/profile" className="flex items-center gap-2">
                <Info className="w-3.5 h-3.5" aria-hidden="true" /> Chỉnh sửa hồ sơ
              </Link>
            </Button>
          </div>
        </div>

        {/* Right: Profile completion */}
        <div>
          <ProfileCompletionCard tasker={tasker} />
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function TaskerPage() {
  const { data: tasker, isLoading } = useTaskerProfile();
  const isApproved = tasker?.approvalStatus === TaskerStatus.APPROVED;

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
          <div className="h-28 w-full bg-muted animate-pulse rounded-2xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        </div>
      );
    }

    if (!tasker) return <NoProfileBanner />;

    switch (tasker.approvalStatus) {
      case TaskerStatus.PENDING:    return <PendingReviewView tasker={tasker} />;
      case TaskerStatus.NEED_INFO:  return (
        <div className="space-y-6">
          <NeedInfoBanner adminNotes={tasker.adminNotes} />
          <TaskerRegistrationWizard />
        </div>
      );
      case TaskerStatus.REJECTED:   return <RejectedBanner adminNotes={tasker.adminNotes} />;
      case TaskerStatus.APPROVED:   return <ApprovedDashboard tasker={tasker} />;
      default:                     return <NoProfileBanner />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar chỉ hiển thị khi đã được duyệt */}
      {isApproved && <TaskerSidebar />}

      {/* Main content */}
      <main className={cn('flex-1 min-w-0', isApproved && 'lg:pt-0 pt-14')}>
        <div className="p-5 md:p-8 max-w-6xl mx-auto">
          {/* Page header */}
          <div className="mb-8 space-y-1">
            <h1
              className="text-3xl md:text-4xl font-light leading-tight"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              {isApproved ? (
                <>Khu vực <span className="italic text-primary">Đối tác</span></>
              ) : (
                <>Tài khoản <span className="italic text-primary">Đối tác CleanZ</span></>
              )}
            </h1>
            {!isLoading && (
              <p className="text-muted-foreground text-sm">
                {isApproved
                  ? 'Quản lý lịch trình, thu nhập và đơn hàng của bạn.'
                  : 'Theo dõi trạng thái xét duyệt hồ sơ đối tác.'}
              </p>
            )}
          </div>

          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default TaskerPage;