'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/auth.hooks";
import { User } from "@/features/auth/types/auth.type";
import TopLoadingBar from "@/components/loadings/TopLoadingBar";

const ROLE_ROUTES: Record<string, string> = {
  ADMIN: "/admin",
  WORKER: "/worker/home",
  CUSTOMER: "/customer/home",
};

export default function Page() {
  const router = useRouter();

  const { data: me, isLoading } = useAuth() as {
    data: User | undefined;
    isLoading: boolean;
  };

  useEffect(() => {
    if (isLoading) return;

    const route = me?.role ? ROLE_ROUTES[me.role] : "/home";
    router.replace(route ?? "/home");
  }, [me, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <TopLoadingBar />
      </div>
    );
  }

  return null;
}
