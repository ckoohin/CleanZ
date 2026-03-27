"use client";

import { AnimatePresence, motion } from "motion/react";
import type { Variants } from "motion/react";
import { Button } from "@/components/ui/button";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";

const panelV: Variants = {
  hidden: { opacity: 0, x: 100 },
  show: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 1,
      delay: 0.3,
      ease: [0.16, 1, 0.3, 1],
      when: "beforeChildren",
      delayChildren: 0.25,
    },
  },
};

const itemV: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  },
};

export default function AuthForm({
  isLogin,
  setIsLogin,
}: {
  isLogin: boolean;
  setIsLogin: (v: boolean) => void;
}) {
  return (
    <motion.div
      className="w-full lg:w-7/12 p-10 lg:p-16 flex flex-col justify-center relative"
      variants={panelV}
      initial="hidden"
      animate="show"
    >
      {/* bg blur */}
      <div className="absolute top-10 right-10 w-32 h-32 bg-[#7FA84F]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-10 left-10 w-40 h-40 bg-[#8FB961]/5 rounded-full blur-3xl" />

      {/* Toggle */}
      <motion.div className="flex gap-3 mb-10 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl" />

        <Button
          type="button"
          onClick={() => setIsLogin(true)}
          variant={isLogin ? "default" : "ghost"}
          className={`relative flex-1 h-12 rounded-xl font-semibold transition-all z-10 ${isLogin
              ? "bg-gradient-to-r from-[#7FA84F] to-[#6B9440] hover:from-[#6B9440] hover:to-[#5A8435] shadow-lg"
              : "hover:bg-transparent"
            }`}
        >
          Đăng nhập
        </Button>

        <Button
          type="button"
          onClick={() => setIsLogin(false)}
          variant={!isLogin ? "default" : "ghost"}
          className={`relative flex-1 h-12 rounded-xl font-semibold transition-all z-10 ${!isLogin
              ? "bg-gradient-to-r from-[#7FA84F] to-[#6B9440] hover:from-[#6B9440] hover:to-[#5A8435] shadow-lg"
              : "hover:bg-transparent"
            }`}
        >
          Đăng ký
        </Button>
      </motion.div>

      {/* Render form theo trạng thái */}
      <AnimatePresence mode="wait">
        {isLogin ? (
          <motion.div
            key="login"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10"
          >
            <LoginForm />
          </motion.div>
        ) : (
          <motion.div
            key="register"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10"
          >
            <RegisterForm />
          </motion.div>
        )}

      </AnimatePresence>
      {/* Decorative floating elements */}
      <motion.div
        className="absolute top-20 right-20 w-16 h-16 bg-gradient-to-br from-[#7FA84F]/20 to-[#6B9440]/20 rounded-2xl rotate-12"
        animate={{
          y: [0, -10, 0],
          rotate: [12, 22, 12],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className="absolute bottom-32 left-16 w-12 h-12 bg-gradient-to-br from-[#8FB961]/20 to-[#A8C686]/20 rounded-full"
        animate={{
          y: [0, 15, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </motion.div>
  );
}