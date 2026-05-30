"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { ScrollText, UserCircle, FolderOpen, PartyPopper, ChevronRight, CheckCircle2 } from "lucide-react";

// Tab Components
import { TabRules } from "./onboarding/TabRules";
import { TabIdentity } from "./onboarding/TabIdentity";
import { TabBackground } from "./onboarding/TabBackground";
import { TabContact } from "./onboarding/TabContact";
import { TabPersonalInfo } from "./onboarding/TabPersonalInfo";
import { TabComplete } from "./onboarding/TabComplete";

const TABS = [
  { id: 0, label: "Nội quy", icon: ScrollText, description: "Điều khoản & Quy định" },
  { id: 1, label: "Thông tin", icon: UserCircle, description: "Hồ sơ cơ bản" },
  { id: 2, label: "Danh tính", icon: UserCircle, description: "CCCD & Avatar" },
  { id: 3, label: "Pháp lý", icon: FolderOpen, description: "Lý lịch tư pháp" },
  { id: 4, label: "Liên hệ", icon: ScrollText, description: "Địa chỉ tạm trú" },
  { id: 5, label: "Hoàn tất", icon: PartyPopper, description: "Nộp hồ sơ" },
];

export function PartnerOnboardingWizard() {
  const [currentTab, setCurrentTab] = useState(0);
  const [completedTabs, setCompletedTabs] = useState<Set<number>>(new Set());

  const markCompleted = (tabIndex: number) => {
    setCompletedTabs(prev => new Set([...prev, tabIndex]));
  };

  const goToTab = (index: number) => {
    // Chỉ cho phép đi tới các tab đã hoàn thành hoặc tab hiện tại + 1
    if (index <= currentTab || completedTabs.has(index - 1)) {
      setCurrentTab(index);
    }
  };

  const handleNext = (tabIndex: number) => {
    markCompleted(tabIndex);
    if (tabIndex < TABS.length - 1) {
      setCurrentTab(tabIndex + 1);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="container max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2 mb-1">
            <ChevronRight className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Đăng ký Đối tác CleanZ</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold font-serif text-primary">Hoàn thiện hồ sơ của bạn</h1>
        </div>

        {/* Tab Bar */}
        <div className="container max-w-5xl mx-auto px-4 pb-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {TABS.map((tab) => {
              const isCompleted = completedTabs.has(tab.id);
              const isActive = currentTab === tab.id;
              const isAccessible = tab.id <= currentTab || completedTabs.has(tab.id - 1);

              return (
                <button
                  key={tab.id}
                  onClick={() => goToTab(tab.id)}
                  disabled={!isAccessible}
                  className={cn(
                    "flex items-center gap-2.5 px-5 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all duration-300",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : isCompleted
                        ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                        : isAccessible
                          ? "bg-muted hover:bg-muted/70 text-foreground"
                          : "bg-muted/30 text-muted-foreground cursor-not-allowed opacity-50"
                  )}
                >
                  {isCompleted && !isActive ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" aria-hidden="true" />
                  ) : (
                    <tab.icon className="w-4 h-4" aria-hidden="true" />
                  )}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Progress bar */}
          <div className="mt-3 h-1 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              animate={{ width: `${((completedTabs.size) / TABS.length) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container max-w-5xl mx-auto px-4 py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            {currentTab === 0 && <TabRules onNext={() => handleNext(0)} />}
            {currentTab === 1 && <TabPersonalInfo onBack={() => goToTab(0)} onNext={() => handleNext(1)} />}
            {currentTab === 2 && <TabIdentity onBack={() => goToTab(1)} onNext={() => handleNext(2)} />}
            {currentTab === 3 && <TabBackground onBack={() => goToTab(2)} onNext={() => handleNext(3)} />}
            {currentTab === 4 && <TabContact onBack={() => goToTab(3)} onNext={() => handleNext(4)} />}
            {currentTab === 5 && <TabComplete onBack={() => goToTab(4)} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
