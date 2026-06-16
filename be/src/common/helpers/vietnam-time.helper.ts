const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';
const VIETNAM_TIMEZONE_OFFSET = '+07:00';

export function createVietnamDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00${VIETNAM_TIMEZONE_OFFSET}`);
}

export function formatVietnamDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: VIETNAM_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function formatVietnamTime(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: VIETNAM_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}
