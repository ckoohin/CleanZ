'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'motion/react';
import {
  User, Phone, MapPin, CreditCard, FileText,
  CheckCircle2, AlertCircle, Camera, Save, Loader2,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useTaskerProfile, useUpdateTaskerProfile } from '@/features/tasker/hooks/tasker.hooks';
import { TaskerSidebar } from '@/features/tasker/_components/TaskerSidebar';

const schema = z.object({
  phone: z.string().min(9, 'Số điện thoại không hợp lệ').optional().or(z.literal('')),
  bio: z.string().max(500, 'Tối đa 500 ký tự').optional().or(z.literal('')),
  experience: z.string().max(500, 'Tối đa 500 ký tự').optional().or(z.literal('')),
  skills: z.string().max(300, 'Tối đa 300 ký tự').optional().or(z.literal('')),
  addressResident: z.string().max(200).optional().or(z.literal('')),
  addressCurrent: z.string().max(200).optional().or(z.literal('')),
  bankName: z.string().max(100).optional().or(z.literal('')),
  bankAccountNumber: z.string().max(30).optional().or(z.literal('')),
  bankAccountName: z.string().max(100).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

function DocBadge({ done, label }: { done: boolean; label: string }) {
  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 rounded-xl border text-sm',
      done
        ? 'border-emerald-500/30 bg-emerald-500/8 text-emerald-700'
        : 'border-border bg-muted/50 text-muted-foreground'
    )}>
      {done
        ? <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
        : <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />}
      {label}
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" aria-hidden="true" />
        </div>
        <h2 className="font-bold text-sm">{title}</h2>
      </div>
      <Separator />
      {children}
    </div>
  );
}

export default function TaskerProfilePage() {
  const { data: tasker, isLoading } = useTaskerProfile();
  const updateProfile = useUpdateTaskerProfile();
  const [saved, setSaved] = useState(false);

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      phone: tasker?.phone ?? '',
      bio: tasker?.bio ?? '',
      experience: tasker?.experience ?? '',
      skills: tasker?.skills ?? '',
      addressResident: tasker?.addressResident ?? '',
      addressCurrent: tasker?.addressCurrent ?? '',
      bankName: tasker?.bankName ?? '',
      bankAccountNumber: tasker?.bankAccountNumber ?? '',
      bankAccountName: tasker?.bankAccountName ?? '',
    },
  });

  const onSubmit = async (data: FormValues) => {
    if (!tasker?.id) return;
    await updateProfile.mutateAsync({ id: tasker.id, data });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const initials = tasker?.fullName
    ? tasker.fullName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : 'S';

  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        <TaskerSidebar />
        <main className="flex-1 p-8">
          <div className="max-w-3xl mx-auto space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <TaskerSidebar />

      <main className="flex-1 min-w-0 pt-14 lg:pt-0">
        <div className="p-5 md:p-8 max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2 text-muted-foreground">
              <Link href="/tasker" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Quay lại Dashboard
              </Link>
            </Button>
            <h1
              className="text-3xl font-light leading-tight"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Hồ sơ <span className="italic text-primary">cá nhân</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Cập nhật thông tin để tăng tỷ lệ nhận đơn hàng.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Avatar & Identity */}
            <SectionCard title="Thông tin cơ bản" icon={User}>
              <div className="flex items-center gap-5">
                <div className="relative">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={tasker?.avatarUrl ?? undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl font-black">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    type="button"
                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
                    aria-label="Đổi ảnh đại diện"
                  >
                    <Camera className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
                <div>
                  <p className="font-bold text-lg">{tasker?.fullName ?? '—'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px] uppercase tracking-widest">
                      Đối tác CleanZ
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="prof-phone">Số điện thoại</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                    <Input
                      id="prof-phone"
                      {...register('phone')}
                      placeholder="0901 234 567"
                      className="pl-10 h-11 rounded-xl"
                    />
                  </div>
                  {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="prof-bio">Giới thiệu bản thân</Label>
                  <Textarea
                    id="prof-bio"
                    {...register('bio')}
                    placeholder="Chia sẻ kinh nghiệm và điểm mạnh của bạn..."
                    rows={3}
                    className="rounded-xl resize-none"
                  />
                  {errors.bio && <p className="text-xs text-destructive">{errors.bio.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="prof-exp">Kinh nghiệm làm việc</Label>
                  <Textarea
                    id="prof-exp"
                    {...register('experience')}
                    placeholder="Mô tả kinh nghiệm dọn dẹp của bạn..."
                    rows={3}
                    className="rounded-xl resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="prof-skills">Kỹ năng đặc biệt</Label>
                  <Input
                    id="prof-skills"
                    {...register('skills')}
                    placeholder="VD: Dọn nhà, Vệ sinh văn phòng, Giặt thảm..."
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>
            </SectionCard>

            {/* Address */}
            <SectionCard title="Địa chỉ" icon={MapPin}>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="prof-addr-resident">Địa chỉ thường trú</Label>
                  <Input
                    id="prof-addr-resident"
                    {...register('addressResident')}
                    placeholder="Số nhà, đường, phường, quận, tỉnh/thành"
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prof-addr-current">Địa chỉ hiện tại <span className="text-muted-foreground text-xs">(dùng để tìm việc gần đây)</span></Label>
                  <Input
                    id="prof-addr-current"
                    {...register('addressCurrent')}
                    placeholder="Số nhà, đường, phường, quận, tỉnh/thành"
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>
            </SectionCard>

            {/* Bank */}
            <SectionCard title="Thông tin ngân hàng" icon={CreditCard}>
              <p className="text-xs text-muted-foreground -mt-2">
                Dùng để nhận thanh toán từ CleanZ sau mỗi đơn hoàn thành.
              </p>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="prof-bank-name">Tên ngân hàng</Label>
                  <Input
                    id="prof-bank-name"
                    {...register('bankName')}
                    placeholder="VD: Vietcombank, Techcombank..."
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prof-bank-num">Số tài khoản</Label>
                  <Input
                    id="prof-bank-num"
                    {...register('bankAccountNumber')}
                    placeholder="Nhập số tài khoản..."
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prof-bank-owner">Chủ tài khoản</Label>
                  <Input
                    id="prof-bank-owner"
                    {...register('bankAccountName')}
                    placeholder="Tên chủ tài khoản (in hoa)"
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>
            </SectionCard>

            {/* Documents status */}
            <SectionCard title="Giấy tờ đã nộp" icon={FileText}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <DocBadge done={!!tasker?.hasCitizenCardImage} label="Ảnh CCCD" />
                <DocBadge done={!!tasker?.hasIdWithSelfieImage} label="Selfie + CCCD" />
                <DocBadge done={!!tasker?.hasCriminalRecordImage} label="Lý lịch tư pháp" />
                <DocBadge done={!!tasker?.hasHealthCertificateImage} label="Khám sức khoẻ" />
                <DocBadge done={!!tasker?.hasCertificateImage} label="Chứng chỉ nghề" />
              </div>
              <Button asChild variant="outline" size="sm" className="rounded-xl h-9 w-fit">
                <Link href="/tasker/onboarding">Cập nhật giấy tờ</Link>
              </Button>
            </SectionCard>

            {/* Submit */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-4 pb-8"
            >
              <Button
                type="submit"
                disabled={!isDirty || updateProfile.isPending}
                className="rounded-xl h-12 px-8 font-bold shadow-md shadow-primary/20"
              >
                {updateProfile.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" aria-hidden="true" />Đang lưu...</>
                ) : saved ? (
                  <><CheckCircle2 className="w-4 h-4 mr-2" aria-hidden="true" />Đã lưu!</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" aria-hidden="true" />Lưu thay đổi</>
                )}
              </Button>
              {!isDirty && (
                <p className="text-xs text-muted-foreground">Chưa có thay đổi</p>
              )}
            </motion.div>
          </form>
        </div>
      </main>
    </div>
  );
}
