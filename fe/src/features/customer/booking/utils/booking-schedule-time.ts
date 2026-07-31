const VIETNAM_TIMEZONE = "Asia/Ho_Chi_Minh";

export const MINUTE_STEP = 15;
export const DEFAULT_MIN_SCHEDULE_LEAD_MINUTES = 60;

function formatVietnamDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: VIETNAM_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function formatVietnamTime(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: VIETNAM_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.hour === "24" ? "00" : values.hour}:${values.minute}`;
}

export function getEarliestAvailableSchedule(
  now = new Date(),
  minAdvanceMinutes = DEFAULT_MIN_SCHEDULE_LEAD_MINUTES,
): {
  scheduledDate: string;
  scheduledTime: string;
} {
  const minimumStartMs = now.getTime() + minAdvanceMinutes * 60 * 1000;
  const stepMs = MINUTE_STEP * 60 * 1000;
  const roundedStart = new Date(Math.ceil(minimumStartMs / stepMs) * stepMs);

  return {
    scheduledDate: formatVietnamDate(roundedStart),
    scheduledTime: formatVietnamTime(roundedStart),
  };
}
