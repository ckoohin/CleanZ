'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TaskerStatus, TaskerProfile } from '../types/tasker.type';

export type TaskerVerificationState =
  | 'no_profile'   // chưa có hồ sơ
  | 'pending'      // đang chờ duyệt
  | 'need_info'    // cần bổ sung
  | 'rejected'     // bị từ chối
  | 'approved';    // đã xác minh

function getVerificationState(tasker: TaskerProfile | null | undefined): TaskerVerificationState {
  if (!tasker) return 'no_profile';
  switch (tasker.approvalStatus) {
    case TaskerStatus.APPROVED:   return 'approved';
    case TaskerStatus.PENDING:    return 'pending';
    case TaskerStatus.NEED_INFO:  return 'need_info';
    case TaskerStatus.REJECTED:   return 'rejected';
    default:                      return 'no_profile';
  }
}

export const VERIFICATION_MESSAGES: Record<TaskerVerificationState, { title: string; description: string; cta?: string }> = {
  no_profile: {
    title: 'Chưa có hồ sơ Đối tác',
    description: 'Bạn cần hoàn thiện hồ sơ và được xác minh trước khi sử dụng tính năng này.',
    cta: 'Nộp hồ sơ ngay',
  },
  pending: {
    title: 'Hồ sơ đang chờ xét duyệt',
    description: 'Hồ sơ của bạn đang được admin xem xét. Vui lòng chờ trong vòng 24h làm việc.',
  },
  need_info: {
    title: 'Hồ sơ cần bổ sung thêm thông tin',
    description: 'Admin đã yêu cầu bổ sung một số giấy tờ. Hãy cập nhật hồ sơ để tiếp tục.',
    cta: 'Bổ sung hồ sơ ngay',
  },
  rejected: {
    title: 'Hồ sơ không được duyệt',
    description: 'Hồ sơ của bạn đã bị từ chối. Vui lòng liên hệ hotline 1800 6868 để biết thêm chi tiết.',
  },
  approved: {
    title: '',
    description: '',
  },
};

export interface UseTaskerActionGuardReturn {
  /** Gọi fn nếu đã verified, ngược lại hiện modal hoặc redirect */
  requireVerified: (fn?: () => void) => void;
  /** State cho modal */
  isModalOpen: boolean;
  closeModal: () => void;
  verificationState: TaskerVerificationState;
  modalMessage: typeof VERIFICATION_MESSAGES[TaskerVerificationState];
}

/**
 * Hook guard tái sử dụng cho các action của Tasker.
 *
 * @param tasker - Profile tasker từ useTaskerProfile()
 *
 * @example
 * const guard = useTaskerActionGuard(tasker);
 * <button onClick={() => guard.requireVerified(() => setOnline(true))}>
 *   Bật hoạt động
 * </button>
 */
export function useTaskerActionGuard(
  tasker: TaskerProfile | null | undefined
): UseTaskerActionGuardReturn {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const verificationState = getVerificationState(tasker);

  const requireVerified = useCallback(
    (fn?: () => void) => {
      if (verificationState === 'approved') {
        fn?.();
        return;
      }

      // Chưa có hồ sơ → redirect luôn đến onboarding
      if (verificationState === 'no_profile') {
        router.push('/tasker/onboarding');
        return;
      }

      // Pending / need_info / rejected → hiện modal thông báo
      setIsModalOpen(true);
    },
    [verificationState, router]
  );

  const handleCtaClick = useCallback(() => {
    if (verificationState === 'need_info') {
      router.push('/tasker/onboarding');
    }
    setIsModalOpen(false);
  }, [verificationState, router]);

  return {
    requireVerified,
    isModalOpen,
    closeModal: () => setIsModalOpen(false),
    verificationState,
    modalMessage: VERIFICATION_MESSAGES[verificationState],
    // Expose handleCtaClick ở internal — dùng trong TaskerVerificationModal
    _handleCtaClick: handleCtaClick,
  } as UseTaskerActionGuardReturn & { _handleCtaClick: () => void };
}
