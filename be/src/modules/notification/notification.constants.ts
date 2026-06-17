export const NOTIFICATION_QUEUE = 'notificationQueue';
export const NOTIFICATION_JOB_DISPATCH = 'dispatch';

export const NOTIFICATION_JOB_OPTS = {
  attempts: 5,
  backoff: { type: 'exponential' as const, delay: 2000 },
  removeOnComplete: 1000,
  removeOnFail: 5000,
};

export function toJobId(dedupeKey?: string): string | undefined {
  return dedupeKey ? dedupeKey.replace(/:/g, '-') : undefined;
}

// Event socket.
export const NOTIFICATION_EVENT_NEW = 'notification:new';
export const NOTIFICATION_EVENT_UNREAD = 'notification:unread_count';

// Room theo user .
export function userRoom(userId: string): string {
  return `user:${userId}`;
}
