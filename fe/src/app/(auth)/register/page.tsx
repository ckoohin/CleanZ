"use client";
import AuthScreen from "@/features/auth/_components/AuthScreen";
import { SignUpFlow } from "@/features/auth/_components/authv1/SignUpFlow";

export default function Page() {
  return (
    <>
      {/* <AuthScreen mode="register" />; */}
      <SignUpFlow />
    </>
  )

}