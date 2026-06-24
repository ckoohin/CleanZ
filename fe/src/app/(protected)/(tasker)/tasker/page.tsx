'use client';

import React from 'react';
import { useTaskerProfile, useUpdatePresence } from '@/features/tasker/hooks/tasker.hooks';
import { useTaskerActionGuard } from '@/features/tasker/hooks/useTaskerActionGuard';
import { TaskerVerificationModal } from '@/features/tasker/_components/TaskerVerificationModal';
import { TaskerStatus } from '@/features/tasker/types/tasker.type';
import { usePathname } from 'next/navigation';
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
import { motion } from 'framer-motion';
import { parseAdminNotes } from '@/features/admin-tasker/_components/AdminRequestInfoModal';

// ─── Status Banner (hiển thị phía trên, không thay thế layout) ───────────────

function StatusBanner({ status, adminNotes }: {
  status: TaskerStatus | undefined;
  adminNotes?: string;
}) {
  if (!status) {
    // Chưa có hồ sơ
    return (
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="w-full rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-orange-600" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-orange-700">Bạn chưa có hồ sơ Đối tác</p>
            <p className="text-xs text-orange-600/70 mt-0.5">Hoàn thiện hồ sơ để bắt đầu nhận đơn và kiếm thu nhập.</p>
          </div>
          <Button asChild size="sm" className="rounded-xl shrink-0 bg-orange-500 hover:bg-orange-600 gap-2">
            <Link href="/tasker/onboarding">
              Nộp hồ sơ ngay <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </motion.div>
    );
  }

  if (status === TaskerStatus.APPROVED) {
    return null; // Không hiện banner khi đã xác minh
  }

  if (status === TaskerStatus.PENDING) {
    return (
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="w-full rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/15 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-yellow-600" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-yellow-700">Hồ sơ đang chờ xét duyệt</p>
            <p className="text-xs text-yellow-600/70 mt-0.5">Admin sẽ phản hồi trong vòng <strong>24h làm việc</strong>. Bạn chưa thể nhận đơn trong thời gian này.</p>
          </div>
          <div className="flex items-center gap-1.5 bg-yellow-500/10 px-3 py-1.5 rounded-full shrink-0">
            <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            <span className="text-[10px] font-bold text-yellow-600 uppercase tracking-widest">Đang xử lý</span>
          </div>
        </div>
      </motion.div>
    );
  }

  if (status === TaskerStatus.NEED_INFO) {
    const parsed = parseAdminNotes(adminNotes);
    return (
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="w-full rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5 flex flex-col sm:flex-row items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
            <Info className="w-5 h-5 text-blue-600" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <p className="font-semibold text-sm text-blue-700">Cần bổ sung thêm thông tin</p>
            {parsed && parsed.itemLabels.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {parsed.itemLabels.map((label) => (
                  <Badge key={label} variant="outline" className="text-[10px] bg-blue-50 border-blue-200 text-blue-700">
                    <ListChecks className="w-2.5 h-2.5 mr-1" aria-hidden="true" />
                    {label}
                  </Badge>
                ))}
              </div>
            )}
            {!parsed && adminNotes && (
              <p className="text-xs text-blue-600/80 italic">{adminNotes}</p>
            )}
          </div>
          <Button asChild size="sm" className="rounded-xl shrink-0 gap-2 bg-blue-600 hover:bg-blue-700">
            <Link href="/tasker/onboarding">
              Bổ sung ngay <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </motion.div>
    );
  }

  if (status === TaskerStatus.REJECTED) {
    return (
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="w-full rounded-2xl border border-red-500/20 bg-red-500/5 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5 text-red-600" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-red-700">Hồ sơ không được duyệt</p>
            {adminNotes && <p className="text-xs text-red-600/70 mt-0.5 italic">Lý do: {adminNotes}</p>}
            <p className="text-xs text-red-600/60 mt-1">Liên hệ hotline <span className="font-bold">1800 6868</span> để được hỗ trợ.</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return null;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

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

// ─── Profile Completion Card ──────────────────────────────────────────────────

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

// ─── Main Dashboard (hiển thị cho MỌI tasker — locked khi chưa verified) ─────

function MainDashboard({
  tasker,
  isVerified,
  onToggleOnline,
}: {
  tasker: NonNullable<ReturnType<typeof useTaskerProfile>['data']>;
  isVerified: boolean;
  onToggleOnline: () => void;
}) {
  const initials = tasker.fullName
    ? tasker.fullName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : 'S';

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'rounded-2xl border p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4',
          isVerified
            ? 'border-emerald-500/20 bg-emerald-500/8'
            : 'border-border bg-muted/30'
        )}
      >
        <Avatar className="w-14 h-14">
          <AvatarImage src={tasker.avatarUrl ?? undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-lg font-black">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-bold truncate">Xin chào, {tasker.fullName ?? 'Đối tác'}!</h2>
            {isVerified ? (
              <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-500/30 text-[10px] font-bold uppercase tracking-widest">
                <CheckCircle2 className="w-3 h-3 mr-1" aria-hidden="true" /> Đã xác minh
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Chưa xác minh
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm">
            {isVerified
              ? 'Sẵn sàng nhận đơn và kiếm thu nhập hôm nay!'
              : 'Hoàn thiện hồ sơ để bắt đầu nhận đơn.'}
          </p>
        </div>
        {isVerified && (
          <Button asChild size="sm" className="rounded-xl shrink-0">
            <Link href="/tasker/schedule" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" aria-hidden="true" /> Xem lịch
            </Link>
          </Button>
        )}
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Briefcase} label="Tổng đơn" value={isVerified ? tasker.totalJobs : '—'} sub="Đã hoàn thành" color="bg-primary/10 text-primary" />
        <StatCard icon={Star} label="Đánh giá TB" value={isVerified && tasker.avgRating > 0 ? tasker.avgRating.toFixed(1) + '★' : '—'} sub="Từ khách hàng" color="bg-yellow-500/10 text-yellow-600" />
        <StatCard icon={DollarSign} label="Thu nhập tháng" value="—" sub="Sắp ra mắt" color="bg-emerald-500/10 text-emerald-600" />
        <StatCard icon={TrendingUp} label="Đơn đang xử lý" value={isVerified ? '0' : '—'} sub="Hôm nay" color="bg-blue-500/10 text-blue-600" />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Activity */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">Đơn hàng gần đây</h3>
            {isVerified && (
              <Button variant="ghost" size="sm" className="text-primary text-xs gap-1">
                Xem tất cả <ChevronRight className="w-3 h-3" aria-hidden="true" />
              </Button>
            )}
          </div>

          {/* Locked overlay khi chưa verified */}
          <div className={cn('rounded-2xl border border-dashed bg-muted/30 p-12 flex flex-col items-center gap-3 text-center relative', !isVerified && 'border-muted')}>
            {!isVerified && (
              <div className="absolute inset-0 rounded-2xl bg-background/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 z-10">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Cần xác minh tài khoản</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl h-8 text-xs mt-1"
                  onClick={onToggleOnline}
                >
                  Bật hoạt động để nhận đơn
                </Button>
              </div>
            )}
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

// ─── Skeleton Loading ─────────────────────────────────────────────────────────

function TaskerPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-6 w-48 bg-muted animate-pulse rounded-lg" />
      <div className="h-20 w-full bg-muted animate-pulse rounded-2xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-muted animate-pulse rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function TaskerPage() {
  const { data: tasker, isLoading } = useTaskerProfile();
  const isVerified = tasker?.approvalStatus === TaskerStatus.APPROVED;
  const updatePresence = useUpdatePresence();

  // Guard hook — dùng chung cho toàn page
  const guard = useTaskerActionGuard(tasker);

  // Handler khi bật hoạt động — gọi guard trước
  const handleToggleOnline = () => {
    guard.requireVerified(() => {
      const currentStatus = tasker?.presenceStatus;
      const newStatus = currentStatus === "ONLINE" ? "OFFLINE" : "ONLINE";
      updatePresence.mutate(newStatus);
    });
  };

  return (
    <>
      <div className="p-5 md:p-8 max-w-6xl mx-auto space-y-6">
        {/* Page header */}
        <div className="space-y-1">
          <h1
            className="text-3xl md:text-4xl font-light leading-tight"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Khu vực <span className="italic text-primary">Đối tác</span>
          </h1>
          {!isLoading && (
            <p className="text-muted-foreground text-sm">
              {isVerified
                ? 'Quản lý lịch trình, thu nhập và đơn hàng của bạn.'
                : 'Theo dõi trạng thái xét duyệt hồ sơ đối tác.'}
            </p>
          )}
        </div>

        {/* Status Banner — CHỈ hiện khi cần, không thay thế layout */}
        {!isLoading && (
          <StatusBanner status={tasker?.approvalStatus} adminNotes={tasker?.adminNotes} />
        )}

        {/* Dashboard content — LUÔN render skeleton hoặc real */}
        {isLoading ? (
          <TaskerPageSkeleton />
        ) : tasker ? (
          <MainDashboard
            tasker={tasker}
            isVerified={isVerified}
            onToggleOnline={handleToggleOnline}
          />
        ) : (
          // null tasker đã được handle bởi StatusBanner (banner cam) + empty dashboard
          <MainDashboard
            tasker={{
              id: '', userId: '', skills: '', experience: '', bio: '',
              avatarUrl: null, approvalStatus: TaskerStatus.PENDING,
              totalJobs: 0, avgRating: 0,
            }}
            isVerified={false}
            onToggleOnline={handleToggleOnline}
          />
        )}
      </div>

      {/* Verification Modal — mount ở root page để không bị clip */}
      <TaskerVerificationModal
        isOpen={guard.isModalOpen}
        onClose={guard.closeModal}
        onCtaClick={(guard as ReturnType<typeof useTaskerActionGuard> & { _handleCtaClick: () => void })._handleCtaClick}
        state={guard.verificationState}
      />
    </>
  );
}

export default TaskerPage;