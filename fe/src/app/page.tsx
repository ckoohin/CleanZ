'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/auth.hooks";
import { User } from "@/features/auth/types/auth.type";
import TopLoadingBar from "@/components/loadings/TopLoadingBar";

export default function Page() {
  const router = useRouter();

  const { data: me, isLoading } = useAuth() as {
    data: User | undefined;
    isLoading: boolean;
  };

  useEffect(() => {
    if (isLoading) return;

    if (!me) {
      router.replace("/home");
      return;
    }

    if (me.role === "ADMIN") {
      router.replace("/admin");
      return;
    }

    if (me.role === "STAFF") {
      router.replace("/staff");
      return;
    }
    if (me.role === "CUSTOMER") { 
      router.replace("/home");
      return;
    }
    
  }, [me, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <TopLoadingBar />
      </div>
    );
  }

  return null;
}