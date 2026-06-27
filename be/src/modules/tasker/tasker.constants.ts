export const TASKER_QUEUE = 'taskerQueue';

/** Job tự mở khóa tasker khi hết hạn ban (TEMPORARY). */
export const TASKER_JOB_AUTO_UNBAN = 'auto-unban';

export const TASKER_JOB_OPTS = {
  attempts: 5,
  backoff: { type: 'exponential' as const, delay: 5000 },
  removeOnComplete: 1000,
  removeOnFail: 5000,
};

export interface AutoUnbanJobData {
  taskerId: string;
  /** banEndsAt kỳ vọng (ISO) — chỉ unban nếu trùng, tránh mở khóa nhầm ban mới. */
  expectedBanEndsAt: string;
}
