"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Mail, ArrowLeft, Send, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useForgotPassword } from "@/features/auth/hooks/auth.hooks";
import { z } from "zod";

type Status = "idle" | "loading" | "success" | "error";

export default function ForgotPasswordPage() {
  const forgotPassword = useForgotPassword();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const forgotPasswordSchema = z
    .string()
    .trim()
    .min(1, "Email không được để trống")
    .email("Email không đúng định dạng");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = forgotPasswordSchema.safeParse(email);
    if (!validation.success) {
      setErrorMsg(validation.error.issues[0].message);
      return; 
    }
    
    setStatus("loading");
    setErrorMsg("");

    try {
      await forgotPassword.mutateAsync({ email });
      setStatus("success");
    } catch {
      // Lỗi từ server đã được interceptor hiện toast với message thật; không
      // ghi thêm câu chung chung ở đây để tránh báo lỗi hai lớp.
      // errorMsg chỉ dành cho lỗi validate phía client (ở trên).
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-5">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-primary/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-[#0D47A1]/8 rounded-full blur-3xl" />
      </div>

      <motion.div
        className="relative w-full max-w-sm"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">

          {/* Top accent */}
          <div className="h-1 bg-primary" />

          <div className="p-7 space-y-6">

            {/* Header */}
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
                <span className="text-xs font-semibold text-foreground">CleanZ</span>
              </div>
            </div>

            {/* Icon + Title */}
            <div className="flex flex-col items-center text-center gap-3">
              <AnimatePresence mode="wait">
                {status === "success" ? (
                  <motion.div
                    key="success"
                    className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 18 }}
                  >
                    <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="idle"
                    className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 18 }}
                  >
                    <Mail className="w-7 h-7 text-primary" />
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {status === "success" ? (
                  <motion.div
                    key="s"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-1"
                  >
                    <p className="text-base font-bold text-foreground">Email đã được gửi!</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Kiểm tra hộp thư{" "}
                      <span className="font-semibold text-foreground">{email}</span>
                      {" "}và làm theo hướng dẫn để đặt lại mật khẩu.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="i"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-1"
                  >
                    <p className="text-base font-bold text-foreground">Quên mật khẩu?</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Nhập email đăng ký, chúng tôi sẽ gửi link đặt lại mật khẩu cho bạn.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Form */}
            <AnimatePresence mode="wait">
              {status !== "success" ? (
                <motion.form
                  key="form"
                  onSubmit={handleSubmit}
                  className="space-y-4"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  {/* Email input */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Địa chỉ email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="text"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (status === "error") {
                            setStatus("idle");
                            setErrorMsg("");
                          }
                        }}
                        disabled={status === "loading"}
                        className={cn(
                          "pl-10 bg-background border-border focus-visible:ring-primary",
                          status === "error" && "border-destructive focus-visible:ring-destructive"
                        )}
                        autoFocus
                      />
                    </div>

                    {/* Error message */}
                    <AnimatePresence>
                      {errorMsg && (
                        <motion.div
                          className="flex items-center gap-2 text-destructive text-xs font-medium"
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                        >
                          <XCircle className="w-3.5 h-3.5 shrink-0" />
                          {errorMsg}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Submit */}
                  <Button
                    type="submit"
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl h-11 gap-2"
                  >
                    {forgotPassword.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Đang gửi...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Gửi link đặt lại mật khẩu
                      </>
                    )}
                  </Button>
                </motion.form>
              ) : (
                <motion.div
                  key="done"
                  className="space-y-3"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Info box */}
                  <div className="bg-muted/50 border border-border rounded-xl px-4 py-3 space-y-1.5">
                    {[
                      "Kiểm tra hộp thư đến và thư rác",
                      "Link có hiệu lực trong 15 phút",
                      "Mỗi link chỉ dùng được một lần",
                    ].map((tip) => (
                      <div key={tip} className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-primary shrink-0" />
                        <span className="text-xs text-muted-foreground">{tip}</span>
                      </div>
                    ))}
                  </div>

                  {/* Resend */}
                  <p className="text-center text-xs text-muted-foreground">
                    Không nhận được?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setStatus("idle");
                        setEmail("");
                      }}
                      className="text-primary font-semibold hover:underline underline-offset-4"
                    >
                      Thử lại với email khác
                    </button>
                  </p>

                  <Button
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl h-11"
                    onClick={() => router.push("/login")}
                  >
                    Về trang đăng nhập
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          © 2025 CleanZ
        </p>
      </motion.div>
    </div>
  );
}
