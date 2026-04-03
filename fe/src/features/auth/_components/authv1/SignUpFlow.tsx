"use client";

import { useEffect, useRef } from 'react';
import { ImageCarousel } from '@/features/auth/_components/authv1/ImageCarousel';
import { MultiStepForm } from '@/features/auth/_components/authv1/MultiStepForm';
import { Toaster, toast } from 'sonner';
import { motion } from "motion/react"
import { fadeUp } from './SignInFlow';

export function SignUpFlow() {
  const shownRef = useRef(false);

  useEffect(() => {
    if (shownRef.current) return;

    toast.info("Bắt đầu hành trình của bạn", {
      description: "Vui lòng nhập thông tin để tạo tài khoản mới.",
      position: "top-right",
      className: "bg-primary text-primary-foreground border-none shadow-lg",
    });

    shownRef.current = true;
  }, []);

  return (
    <>
      <Toaster richColors position="top-right" />

      <div className="flex w-full h-dvh bg-background text-foreground overflow-hidden ">
        <ImageCarousel valueAuthType="signup" />

        <div className="flex-1 flex items-start xl:items-center justify-center p-8 overflow-y-auto bg-background">
          <div className="w-full max-w-md space-y-6">

            {/* Heading */}
            <motion.div
              className="text-center lg:text-left mb-4"
              custom={0} variants={fadeUp} initial="hidden" animate="show"
            >
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
                Đăng ký tài khoản
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base mt-3 leading-relaxed">
                Trở thành thành viên của{" "}
                <span className="font-semibold text-primary">King Of Service</span>{" "}
                ngay hôm nay và khám phá trải nghiệm dịch vụ đỉnh cao.
              </p>
            </motion.div>

            {/* Form */}
            <motion.div
              custom={1} variants={fadeUp} initial="hidden" animate="show"
            >
              <MultiStepForm />
            </motion.div>

          </div>
        </div>
      </div>
    </>
  );
}

export default SignUpFlow;