"use client";
import { LoginForm } from "@/src/features/auth/_components/authv1/login-form";
import AuthScreen from "@/src/features/auth/_components/AuthScreen";
import { GalleryVerticalEndIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast, Toaster } from "sonner";

export default function LoginPage() {
  const params = useSearchParams();

  useEffect(() => {
    const error = params.get("error");

    if (error === "unauthorized") {
      toast.error("Bạn không có quyền truy cập");
    }
  }, [params]);

  return (
    <>
      <div className="grid min-h-svh lg:grid-cols-2">
        <div className="flex flex-col gap-4 p-6 md:p-10">
          <div className="flex justify-center gap-2 md:justify-start">
            <a href="#" className="flex items-center gap-2 font-medium">
              <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <GalleryVerticalEndIcon className="size-4" />
              </div>
              Acme Inc.
            </a>
          </div>
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-xs">
              <LoginForm />
            </div>
          </div>
        </div>
        <div className="relative hidden bg-muted lg:block">
          <img
            src="/placeholder.svg"
            alt="Image"
            className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
          />
        </div>
      </div>
    </>
  )

}