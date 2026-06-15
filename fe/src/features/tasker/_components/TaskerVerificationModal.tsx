'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, X, ArrowRight, Clock, Info, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TaskerVerificationState, VERIFICATION_MESSAGES } from '@/features/tasker/hooks/useTaskerActionGuard';
import { cn } from '@/lib/utils';

interface TaskerVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCtaClick: () => void;
  state: TaskerVerificationState;
}

const STATE_CONFIG: Record<
  Exclude<TaskerVerificationState, 'approved' | 'no_profile'>,
  { icon: React.ElementType; iconBg: string; iconColor: string; borderColor: string; bgColor: string }
> = {
  pending: {
    icon: Clock,
    iconBg: 'bg-yellow-500/15',
    iconColor: 'text-yellow-600',
    borderColor: 'border-yellow-500/30',
    bgColor: 'bg-yellow-500/5',
  },
  need_info: {
    icon: Info,
    iconBg: 'bg-blue-500/15',
    iconColor: 'text-blue-600',
    borderColor: 'border-blue-500/30',
    bgColor: 'bg-blue-500/5',
  },
  rejected: {
    icon: XCircle,
    iconBg: 'bg-red-500/15',
    iconColor: 'text-red-600',
    borderColor: 'border-red-500/30',
    bgColor: 'bg-red-500/5',
  },
};

export function TaskerVerificationModal({
  isOpen,
  onClose,
  onCtaClick,
  state,
}: TaskerVerificationModalProps) {
  const message = VERIFICATION_MESSAGES[state];
  const config = state !== 'approved' && state !== 'no_profile' ? STATE_CONFIG[state] : null;
  const Icon = config?.icon ?? ShieldAlert;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          >
            <div
              className={cn(
                'pointer-events-auto w-full max-w-md rounded-2xl border bg-card shadow-2xl shadow-black/20 overflow-hidden',
                config?.borderColor ?? 'border-border'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className={cn('px-6 pt-6 pb-5', config?.bgColor)}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shrink-0', config?.iconBg)}>
                      <Icon className={cn('w-6 h-6', config?.iconColor)} aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className="font-bold text-base leading-snug">{message.title}</h2>
                      <p className="text-xs text-muted-foreground mt-0.5 font-medium uppercase tracking-widest">
                        Tài khoản chưa được xác minh
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all shrink-0 mt-0.5"
                    aria-label="Đóng"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 py-5 space-y-5">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {message.description}
                </p>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-2.5">
                  {message.cta && (
                    <Button
                      onClick={onCtaClick}
                      className="flex-1 h-11 rounded-xl gap-2 font-semibold"
                    >
                      {message.cta}
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className={cn(
                      'h-11 rounded-xl font-medium',
                      message.cta ? 'sm:w-auto' : 'w-full'
                    )}
                  >
                    Đã hiểu
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
