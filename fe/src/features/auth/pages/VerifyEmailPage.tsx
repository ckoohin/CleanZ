"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { CheckCircle2, XCircle, Loader2, ArrowRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import http from "@/lib/api/http";
import { useResendVerificationEmail, useVerifyEmail } from "@/features/auth/hooks/auth.hooks";
import { toast } from "@/lib/toast";
import { AxiosError } from "axios";
import Footer from "@/features/auth/_components/Footer";

type Status = "loading" | "success" | "error" | "expired";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [countdown, setCountdown] = useState(5);

  const { mutateAsync: verifyEmail } = useVerifyEmail()

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- đồng bộ state sau mount / khi mở form; giữ nguyên hành vi hiện tại
    if (!token) { setStatus("error"); return; }

    const verify = async () => {
      try {
        const res = await verifyEmail({ token })
        setStatus("success")
      } catch {
        setStatus("expired")
      }
    };
    verify();
  }, [token]);

  useEffect(() => {
    if (status !== "success") return;
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          router.push("/login-tasker?verified=true");
          toast.success("Email đã xác thực! Vui lòng đăng nhập để tiếp tục.", { duration: 2000 })
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [status, router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#0D47A1]/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        className="relative w-full max-w-md"
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">

          <div className="h-1 bg-primary w-full" />

          <div className="p-8 sm:p-10">

            <div className="flex items-center gap-2 mb-10">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-xs font-bold text-white">K</span>
              </div>
              <span className="text-sm font-semibold text-foreground tracking-wide">CleanZ</span>
            </div>

            {status === "loading" && <LoadingState />}
            {status === "success" && <SuccessState countdown={countdown} />}
            {status === "error" && <ErrorState />}
            {status === "expired" && <ExpiredState />}
          </div>
        </div>

        <Footer />
      </motion.div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center text-center py-4">
      <motion.div
        className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6"
        animate={{ rotate: 360 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
      >
        <Loader2 className="w-7 h-7 text-primary" />
      </motion.div>
      <h1 className="text-2xl font-bold text-foreground mb-2">Đang xác thực...</h1>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Vui lòng chờ trong giây lát, chúng tôi đang xác minh email của bạn.
      </p>
      {/* Skeleton bars */}
      <div className="w-full mt-8 space-y-2">
        {[80, 60, 72].map((w, i) => (
          <motion.div
            key={i}
            className="h-2 bg-muted rounded-full mx-auto"
            style={{ width: `${w}%` }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </div>
  );
}

function SuccessState({ countdown }: { countdown: number }) {
  return (
    <div className="flex flex-col items-center text-center py-4">
      <motion.div
        className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mb-6"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
      >
        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h1 className="text-2xl font-bold text-foreground mb-2">Xác thực thành công!</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-8">
          Email của bạn đã được xác minh. Chào mừng bạn đến với{" "}
          <span className="font-semibold text-primary">CleanZ</span>.
        </p>

        <div className="w-full bg-muted rounded-full h-1.5 mb-3 overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: 5, ease: "linear" }}
          />
        </div>
        <p className="text-xs text-muted-foreground mb-6">
          Tự động chuyển đến đăng nhập sau{" "}
          <span className="font-semibold text-foreground">{countdown}s</span>
        </p>

        <Button
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl gap-2"
          asChild
        >
          <Link href="/login-tasker?verified=true">
            Đăng nhập ngay
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </motion.div>
    </div>
  );
}

function ErrorState() {
  return (
    <div className="flex flex-col items-center text-center py-4">
      <motion.div
        className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-6"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
      >
        <XCircle className="w-8 h-8 text-destructive" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h1 className="text-2xl font-bold text-foreground mb-2">Xác thực thất bại</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-8">
          Liên kết xác thực không hợp lệ hoặc đã được sử dụng.
          Vui lòng thử lại hoặc liên hệ hỗ trợ.
        </p>

        <div className="flex flex-col gap-3">
          <Button
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl gap-2"
            asChild
          >
            <Link href="/register">
              Đăng ký lại
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
          <Button variant="outline" className="w-full rounded-xl" asChild>
            <Link href="/">Về trang chủ</Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

function ExpiredState() {
  const [resent, setResent] = useState(false);
  const searchParams = useSearchParams()
  const token = searchParams.get("token");
  const { mutateAsync: resendVerificationEmail, isPending } = useResendVerificationEmail()
  const handleResend = async () => {
    try {
      await resendVerificationEmail({ token: token! });
      setResent(true);
    } catch {
      // Hook xác thực chịu trách nhiệm hiển thị lỗi đã được chuẩn hóa.
    }
  };

  return (
    <div className="flex flex-col items-center text-center py-4">
      <motion.div
        className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mb-6"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
      >
        <RefreshCw className="w-8 h-8 text-accent-foreground" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="w-full"
      >
        <h1 className="text-2xl font-bold text-foreground mb-2">Liên kết đã hết hạn</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-8">
          Liên kết xác thực chỉ có hiệu lực trong <span className="font-semibold text-foreground">5 phút</span>.
          Nhấn bên dưới để nhận email mới.
        </p>

        {resent ? (
          <motion.div
            className="flex items-center justify-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 rounded-xl px-4 py-3 text-sm font-medium mb-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <CheckCircle2 className="w-4 h-4" />
            Email đã được gửi lại! Vui lòng kiểm tra hộp thư.
          </motion.div>
        ) : (
          <Button
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl gap-2 mb-3"
            onClick={handleResend}
          >
            {isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Đang gửi...</>
            ) : (
              <><RefreshCw className="w-4 h-4" /> Gửi lại email xác thực</>
            )}
          </Button>
        )}

        <Button variant="outline" className="w-full rounded-xl" asChild>
          <Link href="/login">Về trang đăng nhập</Link>
        </Button>
      </motion.div>
    </div>
  );
}
