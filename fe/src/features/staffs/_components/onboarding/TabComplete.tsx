"use client";

import React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  PartyPopper, CheckCircle2, Clock, Bell,
  ArrowRight, Shield, ChevronLeft
} from "lucide-react";
import { useApplyStaff, useStaffProfile } from "@/features/staffs/hooks/staff.hooks";
import { useAuth } from "@/features/auth/hooks/auth.hooks";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface TabCompleteProps {
  onBack: () => void;
}

const TIMELINE = [
  { icon: CheckCircle2, color: "text-emerald-500", label: "Hồ sơ đã nộp", desc: "Tất cả tài liệu đã được gửi đi" },
  { icon: Clock, color: "text-primary", label: "Đang xét duyệt (1-3 ngày)", desc: "Admin CleanZ kiểm tra hồ sơ của bạn" },
  { icon: Bell, color: "text-blue-500", label: "Nhận thông báo kết quả", desc: "Qua email & thông báo ứng dụng" },
  { icon: ArrowRight, color: "text-purple-500", label: "Bắt đầu nhận đơn", desc: "Khi được duyệt, tài khoản kích hoạt ngay" },
];

export function TabComplete({ onBack }: TabCompleteProps) {
  const router = useRouter();
  const { data: user } = useAuth();
  const { data: profile } = useStaffProfile();
  const applyMutation = useApplyStaff();

  const handleSubmitApplication = async () => {
    try {
      if (!profile && user?.id) {
        await applyMutation.mutateAsync(user.id);
      }
      toast.success("Hồ sơ đã được nộp! Chúng tôi sẽ liên hệ trong 1-3 ngày làm việc.");
      router.push("/staff");
    } catch {
      toast.error("Lỗi khi nộp hồ sơ, vui lòng thử lại");
    }
  };

  return (
    <div className="space-y-6">
      {/* Success Hero */}
      <Card className="border-none shadow-xl bg-gradient-to-br from-primary/10 to-primary/5 backdrop-blur-md rounded-[2.5rem] overflow-hidden">
        <CardContent className="p-10 md:p-14 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/20 mb-6"
          >
            <PartyPopper className="w-12 h-12 text-primary" aria-hidden="true" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold font-serif text-primary mb-3">
              Hồ sơ đã sẵn sàng!
            </h2>
            <p className="text-muted-foreground text-lg max-w-md mx-auto text-pretty">
              Bạn đã hoàn thiện đầy đủ thông tin. Nhấn <strong>&ldquo;Nộp hồ sơ xét duyệt&rdquo;</strong> để gửi đến Admin CleanZ.
            </p>
          </motion.div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card className="border-none shadow-lg bg-card/50 backdrop-blur-md rounded-[2.5rem]">
        <CardContent className="p-10">
          <h3 className="text-xl font-bold mb-6 font-serif">Quy trình xét duyệt</h3>
          <div className="space-y-6">
            {TIMELINE.map((step, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-start gap-4"
              >
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-2xl bg-muted flex items-center justify-center ${step.color}`}>
                    <step.icon className="w-5 h-5" aria-hidden="true" />
                  </div>
                  {idx < TIMELINE.length - 1 && (
                    <div className="w-0.5 h-8 bg-border/50 my-1" />
                  )}
                </div>
                <div className="pt-1.5">
                  <p className="font-bold text-base">{step.label}</p>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Security note */}
      <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5">
        <Shield className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-sm text-blue-700 dark:text-blue-300 text-pretty">
          <strong>Bảo mật:</strong> Tất cả hồ sơ và tài liệu của bạn được mã hóa và bảo mật tuyệt đối. Chỉ Admin CleanZ mới có quyền xem để xét duyệt. Chúng tôi cam kết không chia sẻ thông tin với bên thứ ba.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2">
        <Button type="button" variant="outline" size="lg" onClick={onBack} className="h-14 px-8 rounded-full text-base font-bold gap-2 w-full sm:w-auto">
          <ChevronLeft className="w-4 h-4" aria-hidden="true" /> Xem lại tài liệu
        </Button>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            size="lg"
            asChild
            className="h-14 px-8 rounded-full text-base font-bold w-full sm:w-auto"
          >
            <Link href="/staff">Lưu nháp, nộp sau</Link>
          </Button>
          <Button
            type="button"
            size="lg"
            onClick={handleSubmitApplication}
            disabled={applyMutation.isPending}
            className="h-14 px-10 rounded-full text-lg font-bold shadow-lg shadow-primary/30 w-full sm:w-auto gap-2"
          >
            <PartyPopper className="w-5 h-5" aria-hidden="true" />
            {applyMutation.isPending ? "Đang nộp..." : "Nộp hồ sơ xét duyệt"}
          </Button>
        </div>
      </div>
    </div>
  );
}
