"use client";
import TopLoadingBar from "@/components/loadings/TopLoadingBar";
import dynamic from "next/dynamic";
const SignUpFlow = dynamic(() => import('@/features/auth/_components/authv1/SignUpFlow'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen">
      <TopLoadingBar />
    </div>
  )
});
export default function Page() {
  return (
    <>
      <SignUpFlow />
    </>
  )

}