export const MAIL_QUEUE = 'mailQueue';

/** Tên job — mỗi loại email một job name để processor dispatch. */
export const MAIL_JOB_TEMP_PASSWORD = 'temp-password';

export const MAIL_JOB_OPTS = {
  attempts: 5,
  backoff: { type: 'exponential' as const, delay: 2000 },
  removeOnComplete: 1000,
  removeOnFail: 5000,
};

export interface TempPasswordJobData {
  email: string;
  fullName: string;
  tempPassword: string;
  loginUrl: string;
}
