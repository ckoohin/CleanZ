"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { HeaderAction } from "./nav.config";
import { cn } from "@/lib/utils";

interface HeaderActionsProps {
  actions: HeaderAction[];
}

export const HeaderActions: React.FC<HeaderActionsProps> = ({ actions }) => {
  return (
    <>
      {actions.map((action, i) => {
        if (action.type === "icon" && action.icon) {
          const Icon = action.icon;

          return (
            <motion.div
              key={i}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <Button
                variant="ghost"
                size="icon"
                className="relative text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground dark:bg-muted dark:shadow-sm dark:shadow-white"
              >
                <Icon className="w-4 h-4" />

                {/* badge animation */}
                <AnimatePresence>
                  {action.badge != null && action.badge > 0 && (
                    <motion.span
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 25 }}
                      className={cn(
                        "absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1",
                        "flex items-center justify-center",
                        "bg-primary text-primary-foreground rounded-full",
                        "text-[9px] font-black leading-none",
                        "shadow-md"
                      )}
                    >
                      {action.badge > 9 ? "9+" : action.badge}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </motion.div>
          );
        }

        if (action.type === "button" && action.label) {
          const buttonContent = (
            <motion.div
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Button
                size="sm"
                variant="outline"
                className={cn(
                  "font-semibold",
                  "border-border/60",
                  "hover:border-primary/40",
                  "hover:bg-primary/5",
                  "transition-colors"
                )}
              >
                {action.label}
              </Button>
            </motion.div>
          );

          return action.href ? (
            <Link key={i} href={action.href}>
              {buttonContent}
            </Link>
          ) : (
            <div key={i} onClick={action.onClick}>
              {buttonContent}
            </div>
          );
        }

        return null;
      })}
    </>
  );
};
