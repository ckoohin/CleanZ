"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/hooks/auth.hooks';
import { UserRole } from '@/features/auth/types/user.type';
import { hasAnyRole } from '@/features/auth/permissions';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallback?: React.ReactNode;
  autoRedirect?: boolean;
}

const RoleGuard: React.FC<RoleGuardProps> = ({ 
  children, 
  allowedRoles,
  fallback,
  autoRedirect = true
}) => {
  const { data: user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        if (autoRedirect) {
          const searchParams = new URLSearchParams();
          searchParams.set('callbackUrl', pathname);
          router.push(`/login?${searchParams.toString()}`);
        }
      } else if (!hasAnyRole(user, allowedRoles)) {
        if (autoRedirect && !fallback) {
        }
      }
      setIsChecking(false);
    }
  }, [user, isLoading, allowedRoles, router, pathname, autoRedirect, fallback]);

  if (isLoading || isChecking) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background/50 backdrop-blur-sm z-50">
        <div className="flex flex-col items-center justify-center gap-4 p-8 rounded-3xl bg-card border shadow-xl animate-in fade-in zoom-in duration-300">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground animate-pulse font-medium">
            Đang xác thực quyền truy cập...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!hasAnyRole(user, allowedRoles)) {
    if (fallback) return <>{fallback}</>;
    
    return (
      <div className="min-h-[80vh] w-full flex items-center justify-center bg-background p-4 md:p-8">
        <div className="max-w-md w-full flex flex-col items-center text-center space-y-6 p-8 rounded-[2.5rem] bg-card border border-destructive/20 shadow-2xl shadow-destructive/5 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center relative">
            <div className="absolute inset-0 rounded-full border-4 border-destructive/20 animate-ping" />
            <ShieldAlert className="w-12 h-12 text-destructive" />
          </div>
          
          <div className="space-y-3">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
              Truy Cập Bị Từ Chối
            </h2>
            <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
              Rất tiếc, tài khoản <span className="font-bold text-foreground">{user.role}</span> của bạn không có đủ thẩm quyền để truy cập vào phân hệ này.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full pt-6">
            <Button 
              variant="outline" 
              size="lg"
              className="flex-1 rounded-2xl h-14 border-border font-bold hover:bg-muted"
              onClick={() => router.back()}
            >
              Quay Lại
            </Button>
            <Button 
              size="lg"
              className="flex-1 rounded-2xl h-14 font-bold shadow-lg shadow-primary/20"
              onClick={() => router.push("/")}
            >
              Về Trang Chủ
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default RoleGuard;
