"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, useAnimation, PanInfo } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SwipeToAcceptProps {
  onConfirm: () => Promise<void> | void;
  isLoading?: boolean;
  label?: string;
  successLabel?: string;
}

export function SwipeToAccept({
  onConfirm,
  isLoading = false,
  label = "Vuốt để nhận đơn",
  successLabel = "Đã nhận đơn",
}: SwipeToAcceptProps) {
  const [isSuccess, setIsSuccess] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const confirmLockRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const controls = useAnimation();

  // The width of the draggable thumb
  const THUMB_WIDTH = 56;

  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
    }

    const handleResize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleDragEnd = async (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    // Determine the max distance the thumb can travel
    const maxDistance = containerWidth - THUMB_WIDTH;

    // If the thumb is dragged more than 80% of the max distance, it's a success
    if (
      maxDistance > 0 &&
      info.offset.x >= maxDistance * 0.8 &&
      !confirmLockRef.current &&
      !isLoading
    ) {
      confirmLockRef.current = true;
      setIsConfirming(true);
      if ("vibrate" in navigator) {
        navigator.vibrate([50, 50, 50]); // Haptic feedback pattern
      }
      try {
        await onConfirm();
        setIsSuccess(true);
      } catch {
        setIsSuccess(false);
      } finally {
        confirmLockRef.current = false;
        setIsConfirming(false);
      }
    } else {
      // Snap back to 0
      void controls.start({
        x: 0,
        transition: { type: "spring", stiffness: 300, damping: 20 },
      });
    }
  };

  const isPending = isLoading || isConfirming;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-14 rounded-2xl flex items-center overflow-hidden transition-colors duration-300",
        isSuccess || isPending
          ? "bg-emerald-500"
          : "bg-primary/10 border border-primary/20",
      )}
    >
      {/* Background text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span
          className={cn(
            "text-sm font-bold transition-all duration-300",
            isSuccess || isPending
              ? "text-white scale-105"
              : "text-primary opacity-80",
          )}
        >
          {isPending ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Đang xử lý...
            </div>
          ) : isSuccess ? (
            successLabel
          ) : (
            label
          )}
        </span>
      </div>

      {/* Shimmer effect when not success */}
      {!isSuccess && !isPending && (
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
      )}

      {/* Draggable thumb */}
      {!isSuccess && !isPending && (
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: containerWidth - THUMB_WIDTH }}
          dragElastic={0.05}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          animate={controls}
          className="absolute left-1 w-12 h-12 bg-primary rounded-xl flex items-center justify-center cursor-grab active:cursor-grabbing shadow-lg"
          style={{ x: 0 }}
        >
          <ChevronRight className="w-6 h-6 text-white" />
          <ChevronRight className="w-6 h-6 text-white/50 -ml-4" />
        </motion.div>
      )}
    </div>
  );
}
