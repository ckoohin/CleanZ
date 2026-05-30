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
export default function LoginPage() {
  return (
    <>
      <SignInFlow />
    </>
  )

}
