"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { ShieldCheck, RefreshCw, ArrowLeft, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useVerifyOtp } from "@/features/auth/hooks/auth.hooks";
import { toast } from "sonner";
import Footer from "@/features/auth/_components/Footer";
import { useRegisterContext } from "@/features/auth/context/register.context";
import { useLoginContext } from "@/features/auth/context/login.context";

const OTP_LENGTH = 6;
const EXPIRE_SECONDS = 5 * 60;

type Status = "idle" | "loading" | "success" | "error";

export default function OtpVerifyPage() {
  const { formData } = useLoginContext();
  const { mutateAsync: verifyOtp } = useVerifyOtp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId") ?? "";

  if (!userId) {
    router.push("/login");
  }

  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [timeLeft, setTimeLeft] = useState(EXPIRE_SECONDS);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft((v) => v - 1), 1000);
    return () => clearInterval(t);
  }, [timeLeft]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((v) => v - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  useEffect(() => {
    if (otp.length === OTP_LENGTH && status === "idle") {
      handleVerify(otp);
    }
  }, [otp]);

  useEffect(() => {
    if (status !== "success") return;
    const t = setTimeout(() => router.replace("/"), 2000);
    return () => clearTimeout(t);
  }, [status, router]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const handleVerify = async (code: string) => {
    setStatus("loading");
    setErrorMsg("");

    try {
      await verifyOtp({ userId, otp: code });
      toast.success("Chào mừng bạn đến với King Of Service", { duration: 2000 })
      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMsg("Có lỗi xảy ra, vui lòng thử lại.");
      setOtp("");
    }
  };

  const handleResend = () => {
    if (resendCooldown > 0) return;
    setTimeLeft(EXPIRE_SECONDS);
    setResendCooldown(60);
    setOtp("");
    setStatus("idle");
    setErrorMsg("");
  };

  const isExpired = timeLeft <= 0;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-5">

      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div className="bg-card border border-border rounded-2xl overflow-hidden">

          <div className="h-1 bg-primary" />

          <div className="p-7 space-y-6">

            <div className="flex items-center justify-between">
              <Link
                href="/login"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Quay lại
              </Link>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white">K</span>
                </div>
                <span className="text-xs font-semibold text-foreground">King Of Service</span>
              </div>
            </div>

            <div className="flex flex-col items-center text-center gap-3">
              <AnimatePresence mode="wait">
                {status === "success" ? (
                  <motion.div
                    key="success"
                    className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center"
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 18 }}
                  >
                    <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                  </motion.div>
                ) : status === "error" ? (
                  <motion.div
                    key="error"
                    className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center"
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 18 }}
                  >
                    <XCircle className="w-7 h-7 text-destructive" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="idle"
                    className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center"
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 18 }}
                  >
                    <ShieldCheck className="w-7 h-7 text-primary" />
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {status === "success" ? (
                  <motion.div key="s" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                    <p className="text-base font-bold text-foreground">Xác thực thành công!</p>
                    <p className="text-xs text-muted-foreground mt-1">Đang chuyển hướng...</p>
                  </motion.div>
                ) : (
                  <motion.div key="i" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                    <p className="text-base font-bold text-foreground">
                      Xin chào, <span className="text-primary">Bạn</span>!
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Mã OTP đã gửi đến{" "}
                      <span className="font-semibold text-foreground">{formData.email}</span>
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {status !== "success" && (
              <div className="flex flex-col items-center gap-4">
                <InputOTP
                  maxLength={OTP_LENGTH}
                  value={otp}
                  onChange={setOtp}
                  disabled={status === "loading" || isExpired}
                >
                  <InputOTPGroup>
                    {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                      <InputOTPSlot
                        key={i}
                        index={i}
                        className={cn(
                          "w-11 h-12 text-base font-bold border-border",
                          "focus-within:border-primary focus-within:ring-primary/20",
                          status === "error" && "border-destructive"
                        )}
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>

                {/* Timer */}
                <div className="flex items-center gap-1.5">
                  {isExpired ? (
                    <span className="text-xs text-destructive font-medium">Mã OTP đã hết hạn</span>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5 -rotate-90 shrink-0" viewBox="0 0 16 16">
                        <circle cx="8" cy="8" r="6" fill="none" stroke="var(--border)" strokeWidth="2" />
                        <circle
                          cx="8" cy="8" r="6" fill="none"
                          stroke="var(--primary)" strokeWidth="2"
                          strokeDasharray={`${2 * Math.PI * 6}`}
                          strokeDashoffset={`${2 * Math.PI * 6 * (1 - timeLeft / EXPIRE_SECONDS)}`}
                          strokeLinecap="round"
                          className="transition-all duration-1000"
                        />
                      </svg>
                      <span className={cn(
                        "text-xs font-semibold tabular-nums",
                        timeLeft < 60 ? "text-destructive" : "text-muted-foreground"
                      )}>
                        {formatTime(timeLeft)}
                      </span>
                      <span className="text-xs text-muted-foreground">còn lại</span>
                    </>
                  )}
                </div>
              </div>
            )}

            <AnimatePresence>
              {errorMsg && (
                <motion.div
                  className="flex items-center gap-2 bg-destructive/10 text-destructive rounded-xl px-3 py-2.5 text-xs font-medium"
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                >
                  <XCircle className="w-4 h-4 shrink-0" />
                  {errorMsg}
                </motion.div>
              )}
            </AnimatePresence>

            {status !== "success" && (
              <div className="space-y-3">
                <Button
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl h-11"
                  disabled={otp.length < OTP_LENGTH || status === "loading" || isExpired}
                  onClick={() => handleVerify(otp)}
                >
                  {status === "loading" ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" />Đang xác thực...</>
                  ) : (
                    "Xác nhận mã OTP"
                  )}
                </Button>

                <div className="text-center">
                  <span className="text-xs text-muted-foreground">Không nhận được mã? </span>
                  <button
                    onClick={handleResend}
                    disabled={resendCooldown > 0}
                    className={cn(
                      "text-xs font-semibold transition-colors",
                      resendCooldown > 0
                        ? "text-muted-foreground cursor-not-allowed"
                        : "text-primary hover:underline underline-offset-4"
                    )}
                  >
                    {resendCooldown > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" />
                        Gửi lại sau {resendCooldown}s
                      </span>
                    ) : "Gửi lại mã"}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
        
        <Footer/>
      </motion.div>
    </div>
  );
}