export const TIMEZONE = "Asia/Kolkata";

export function todayIstDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function isIsoDate(value: string | undefined | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  return (
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day
  );
}

export function parseWorkDate(value: string | undefined, fallback = todayIstDate()) {
  return isIsoDate(value) ? value : fallback;
}

export function shiftMonth(isoDate: string, months: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const cursor = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(
    Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0)
  ).getUTCDate();
  const nextDay = Math.min(day, lastDay);
  const yyyy = cursor.getUTCFullYear();
  const mm = String(cursor.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(nextDay).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function formatIstMonth(isoDate: string) {
  const date = new Date(`${isoDate}T12:00:00+05:30`);
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: TIMEZONE,
    month: "long",
    year: "numeric",
  }).format(date);
}

export type CalendarCell = {
  date: string;
  inMonth: boolean;
};

export function monthCalendar(isoDate: string): CalendarCell[] {
  const month = isoDate.slice(0, 7);
  const monthStart = `${month}-01`;
  const [year, monthNumber, day] = monthStart.split("-").map(Number);
  const sundayIndex = new Date(Date.UTC(year, monthNumber - 1, day)).getUTCDay();
  const mondayIndex = (sundayIndex + 6) % 7;
  const gridStart = addDays(monthStart, -mondayIndex);

  const cells = Array.from({ length: 42 }, (_, index) => {
    const date = addDays(gridStart, index);
    return { date, inMonth: date.startsWith(`${month}-`) };
  });
  const lastInMonth = cells.reduce(
    (last, cell, index) => (cell.inMonth ? index : last),
    0
  );
  return cells.slice(0, Math.ceil((lastInMonth + 1) / 7) * 7);
}

export function formatIstDate(
  isoDate: string,
  options?: Intl.DateTimeFormatOptions
) {
  const date = new Date(`${isoDate}T12:00:00+05:30`);
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    ...options,
  }).format(date);
}

export function formatIstTime(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

export function istDateTime(isoDate: string, time: string) {
  const hhmmss = time.length === 5 ? `${time}:00` : time;
  return new Date(`${isoDate}T${hhmmss}+05:30`);
}

export function istNowTime() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
}

export function timeToMinutes(value: string) {
  const [hourRaw, minuteRaw] = value.split(":");
  return Number(hourRaw) * 60 + Number(minuteRaw);
}

export function minutesToTime(total: number) {
  const wrapped = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(wrapped / 60);
  const minutes = wrapped % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function defaultDelayEta(clockInBy: string, nowTime = istNowTime()) {
  const start = Math.max(timeToMinutes(clockInBy), timeToMinutes(nowTime));
  return minutesToTime(start + 10);
}

export function formatWorkedHours(clockIn: string | null, clockOut: string | null) {
  if (!clockIn || !clockOut) return "—";
  const ms = new Date(clockOut).getTime() - new Date(clockIn).getTime();
  if (ms < 0) return "—";
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function recentDateRange(days = 8) {
  const today = todayIstDate();
  return Array.from({ length: days }, (_, index) => addDays(today, -index));
}
