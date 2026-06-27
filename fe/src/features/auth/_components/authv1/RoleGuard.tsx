"use client";

import React, { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/auth.hooks";
import { authApi } from "@/features/auth/services/auth.service";
import { queryKeys } from "@/features/auth/queries/auth.query";
import { UserRole } from "@/features/auth/types/user.type";
import { hasAnyRole } from "@/features/auth/permissions";
import { ROUTES } from "@/constants/routes";
import { usePathname, useRouter } from "next/navigation";
import { ShieldAlert, ArrowLeft, Home, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallback?: React.ReactNode;
  autoRedirect?: boolean;
}

// ─── Loading Screen ───────────────────────────────────────────────────────────
function AuthLoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background overflow-hidden">
      {/* Ambient glow blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-primary/8 blur-[140px] animate-pulse" />
        <div
          className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-cyan-400/5 blur-[120px] animate-pulse"
          style={{ animationDelay: "1.2s" }}
        />
      </div>

      <div className="relative flex flex-col items-center gap-7">
        {/* Robot mascot with orbit ring */}
        <div className="relative flex items-center justify-center">
          {/* Outer orbit ring — rotating dashed */}
          <svg
            className="absolute w-[160px] h-[160px] animate-spin"
            style={{ animationDuration: "6s" }}
            viewBox="0 0 160 160"
            fill="none"
          >
            <circle
              cx="80"
              cy="80"
              r="74"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="10 14"
              strokeLinecap="round"
              className="text-primary/25"
            />
            {/* Glowing dot travelling around orbit */}
            <circle cx="80" cy="6" r="4" className="fill-primary/60" />
          </svg>

          {/* Inner orbit ring — counter-rotating */}
          <svg
            className="absolute w-[126px] h-[126px] animate-spin"
            style={{ animationDuration: "4s", animationDirection: "reverse" }}
            viewBox="0 0 126 126"
            fill="none"
          >
            <circle
              cx="63"
              cy="63"
              r="58"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="4 12"
              strokeLinecap="round"
              className="text-cyan-400/20"
            />
          </svg>

          {/* Scan line sweeping over robot */}
          <div className="absolute w-24 h-24 rounded-full overflow-hidden pointer-events-none z-10">
            <div
              className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent"
              style={{
                animation: "scanDown 2.2s ease-in-out infinite",
                top: "0%",
              }}
            />
          </div>

          {/* Mascot robot */}
          <div className="relative w-24 h-24 drop-shadow-[0_0_18px_rgba(234,88,12,0.35)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/mascot.svg"
              alt="CleanZ Robot"
              className="w-full h-full object-contain"
              draggable={false}
            />
          </div>
        </div>

        {/* Brand text */}
        <div className="text-center space-y-0.5">
          <p className="text-[11px] font-black uppercase tracking-[0.35em] text-primary">
            CleanZ
          </p>
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50">
            King of Service
          </p>
        </div>

        {/* Shimmer progress bar */}
        <div className="w-44 h-[2px] rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, #f97316 50%, transparent 100%)",
              backgroundSize: "200% 100%",
              animation: "shimmerBar 1.6s ease-in-out infinite",
            }}
          />
        </div>

        {/* Status */}
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-foreground/80">
            Đang xác thực quyền truy cập
          </p>
          <p className="text-xs text-muted-foreground/50">
            Vui lòng chờ trong giây lát...
          </p>
        </div>

        {/* Bouncing dots */}
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce"
              style={{ animationDelay: `${i * 0.18}s` }}
            />
          ))}
        </div>
      </div>

      <style jsx global>{`
        @keyframes shimmerBar {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes scanDown {
          0%, 100% { top: 5%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          95%, 100% { top: 90%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}


// ─── Access Denied Screen ─────────────────────────────────────────────────────
function AccessDeniedScreen({
  role,
  onBack,
  onHome,
}: {
  role: string;
  onBack: () => void;
  onHome: () => void;
}) {
  const ROLE_LABELS: Record<string, string> = {
    CUSTOMER: "Khách hàng",
    TASKER: "Nhân viên (Tasker)",
    ADMIN: "Quản trị viên",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-4">
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-destructive/5 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md animate-in fade-in slide-in-from-bottom-6 duration-500">
        {/* Card */}
        <div className="relative overflow-hidden bg-card rounded-[2rem] border border-border/60 shadow-2xl p-8 flex flex-col items-center text-center gap-6">
          {/* Top accent line */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-destructive/40 to-transparent" />

          {/* Brand micro badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-primary" />
            CleanZ · King of Service
          </div>

          {/* Icon */}
          <div className="relative">
            {/* Pulsing rings */}
            <div className="absolute inset-0 rounded-full bg-destructive/10 animate-ping" style={{ animationDuration: "2s" }} />
            <div className="absolute -inset-3 rounded-full border border-destructive/10" />
            <div className="w-24 h-24 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center relative z-10">
              <ShieldAlert className="w-11 h-11 text-destructive" />
            </div>
          </div>

          {/* Text */}
          <div className="space-y-2">
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Truy Cập Bị Từ Chối
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
              Tài khoản{" "}
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-foreground font-bold text-xs">
                {ROLE_LABELS[role] || role}
              </span>{" "}
              không có quyền truy cập vào khu vực này.
            </p>
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />

          {/* Actions */}
          <div className="w-full flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              size="lg"
              className="flex-1 rounded-2xl h-12 font-bold border-border/60 hover:bg-muted gap-2"
              onClick={onBack}
            >
              <ArrowLeft className="w-4 h-4" />
              Quay Lại
            </Button>
            <Button
              size="lg"
              className="flex-1 rounded-2xl h-12 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 gap-2"
              onClick={onHome}
            >
              <Home className="w-4 h-4" />
              Trang Chủ
            </Button>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground/50 mt-4">
          Nếu bạn cho rằng đây là sự nhầm lẫn, vui lòng liên hệ hỗ trợ.
        </p>
      </div>
    </div>
  );
}

// ─── Main RoleGuard ───────────────────────────────────────────────────────────
const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  allowedRoles,
  fallback,
  autoRedirect = true,
}) => {
  const { data: user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  // Role trong access token có thể cũ hơn DB (vd vừa được nâng CUSTOMER→TASKER khi
  // duyệt hồ sơ). Thử refresh token 1 lần để lấy role mới trước khi từ chối truy cập.
  const [roleRecheckDone, setRoleRecheckDone] = useState(false);

  // Side effect: redirect khi auth resolved
  useEffect(() => {
    if (isLoading) return; // chờ auth query xong

    if (!user) {
      if (autoRedirect) {
        const searchParams = new URLSearchParams();
        searchParams.set("callbackUrl", pathname);

        let loginPath = "/login";
        if (pathname.startsWith("/admin")) {
          loginPath = "/login-admin";
        } else if (pathname.startsWith("/tasker")) {
          loginPath = "/login-tasker";
        }

        router.push(`${loginPath}?${searchParams.toString()}`);
      }
      return;
    }

    // Tài khoản do admin tạo bằng mật khẩu tạm: buộc đổi mật khẩu trước khi vào
    // bất kỳ khu vực bảo vệ nào.
    if (user.mustChangePassword) {
      router.replace(ROUTES.AUTH.CHANGE_PASSWORD);
      return;
    }

    if (!hasAnyRole(user, allowedRoles)) {
      // Thử làm mới token 1 lần (refresh strategy đọc role mới từ DB) rồi mới quyết
      // định — giúp role vừa được nâng có hiệu lực ngay mà không cần đăng nhập lại.
      if (!roleRecheckDone) {
        setRoleRecheckDone(true);
        void (async () => {
          try {
            await authApi.refresh();
          } catch {
            // refresh lỗi → xử lý mismatch ở lần chạy effect kế tiếp.
          }
          await queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
        })();
        return;
      }

      if (autoRedirect && !fallback) {
        const roleHomePath =
          user.role === "ADMIN"
            ? "/admin"
            : user.role === "TASKER"
            ? "/tasker"
            : "/customer";
        router.replace(roleHomePath);
      }
    }
  }, [
    user,
    isLoading,
    allowedRoles,
    router,
    pathname,
    autoRedirect,
    fallback,
    roleRecheckDone,
    queryClient,
  ]);

  // Còn đang fetch auth → show loading
  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  // Auth resolved nhưng chưa có user → đang redirect → show loading để tránh flash
  if (!user) return <AuthLoadingScreen />;

  // Đang điều hướng tới màn buộc đổi mật khẩu → tránh nháy nội dung bảo vệ.
  if (user.mustChangePassword) return <AuthLoadingScreen />;

  if (!hasAnyRole(user, allowedRoles)) {
    // Đang thử refresh token để lấy role mới → hiển thị loading, tránh nháy "từ chối".
    if (!roleRecheckDone) return <AuthLoadingScreen />;
    if (fallback) return <>{fallback}</>;

    return (
      <AccessDeniedScreen
        role={user.role}
        onBack={() => router.back()}
        onHome={() => router.push("/")}
      />
    );
  }

  return <>{children}</>;
};

export default RoleGuard;
