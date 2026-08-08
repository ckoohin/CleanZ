"use client";

import dynamic from "next/dynamic";
import TopLoadingBar from "@/components/loadings/TopLoadingBar";

const SignUpFlow = dynamic(
  () => import("@/features/auth/_components/authv1/SignUpFlow"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen items-center justify-center">
        <TopLoadingBar />
      </div>
    ),
  },
);

export default function RegisterPage() {
  return <SignUpFlow />;
}
