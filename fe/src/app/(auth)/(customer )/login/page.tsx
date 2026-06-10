"use client";
import dynamic from "next/dynamic";
import TopLoadingBar from "@/components/loadings/TopLoadingBar";

const SignInFlow = dynamic(() => import('@/features/auth/_components/authv1/SignInFlow'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen">
      <TopLoadingBar />
    </div>
  )
});
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-950 text-white"><TopLoadingBar /></div>}>
      <SignInFlow />
    </Suspense>
  )
}