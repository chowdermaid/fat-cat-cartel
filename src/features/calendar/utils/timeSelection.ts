export function initialEventDate(): Date {
  const nextHour = new Date(Date.now() + 60 * 60_000);
  nextHour.setMinutes(0, 0, 0);
  return nextHour;
}

export function timeInputValue(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function dateAndTimeToTimestamp(
  date: Date | undefined,
  time: string,
): number {
  if (!date) return Number.NaN;
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return Number.NaN;
  const next = new Date(date);
  next.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return next.getTime();
}

export function timeHour(time: string): string {
  return time.split(":")[0] ?? "00";
}

export function timeMinute(time: string): string {
  return time.split(":")[1] ?? "00";
}

export function updateTimePart(
  time: string,
  part: "hour" | "minute",
  value: string,
): string {
  const hour = part === "hour" ? value : timeHour(time);
  const minute = part === "minute" ? value : timeMinute(time);
  return `${hour}:${minute}`;
}

export function formatTimeZonePreview(
  timestamp: number,
  timeZone: string,
): string {
  if (!Number.isFinite(timestamp)) return "Pick a date and time";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(new Date(timestamp));
}
