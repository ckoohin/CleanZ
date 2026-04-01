"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import ParticlesBg from "./ParticlesBg";
import BrandingPanel from "./BrandingPanel";
import AuthForm from "./AuthForm";
import { Toaster } from "sonner"

type AuthMode = "login" | "register";

export default function AuthScreen({ mode }: { mode: AuthMode }) {
  const [isLogin, setIsLogin] = useState(mode === "login");

  const particles = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 4 + 2,
        duration: Math.random() * 10 + 15,
        delay: Math.random() * 5,
      })),
    []
  );

  return (
    <>
    <Toaster richColors={true} position="top-right"/>
    <div className="min-h-screen bg-gradient-to-br from-[#6B9440] via-[#7FA84F] to-[#5A8435] flex items-center justify-center p-4 overflow-hidden relative">
      <ParticlesBg particles={particles} />

      <div className="w-full max-w-7xl relative">
        <Card className="bg-white backdrop-blur-xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20">
          <div className="flex flex-col lg:flex-row">
            <BrandingPanel />
            <AuthForm isLogin={isLogin} setIsLogin={setIsLogin} />
          </div>
        </Card>
      </div>
    </div>
    </>
  );
}