import { TIMEZONE } from "@/lib/time";

export type WorkSchedule = {
  clock_in_by: string;
  clock_out_after: string;
  wednesday_clock_in_by: string | null;
};

export const DEFAULT_SCHEDULE: WorkSchedule = {
  clock_in_by: "10:45:00",
  clock_out_after: "19:00:00",
  wednesday_clock_in_by: null,
};

export function scheduleFromProfile(
  profile?: {
    clock_in_by?: string | null;
    clock_out_after?: string | null;
    wednesday_clock_in_by?: string | null;
  } | null
): WorkSchedule {
  return {
    clock_in_by: profile?.clock_in_by || DEFAULT_SCHEDULE.clock_in_by,
    clock_out_after:
      profile?.clock_out_after || DEFAULT_SCHEDULE.clock_out_after,
    wednesday_clock_in_by: profile?.wednesday_clock_in_by ?? null,
  };
}

export function istWeekdayLong(isoDate: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    weekday: "long",
  }).format(new Date(`${isoDate}T12:00:00+05:30`));
}

export function clockInByForDate(schedule: WorkSchedule, isoDate: string) {
  if (
    schedule.wednesday_clock_in_by &&
    istWeekdayLong(isoDate) === "Wednesday"
  ) {
    return schedule.wednesday_clock_in_by;
  }
  return schedule.clock_in_by;
}

export function formatClockTime(value: string) {
  const [hourRaw, minuteRaw] = value.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return value;

  const date = new Date(Date.UTC(2020, 0, 1, hour, minute));
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "UTC",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function isDefaultSchedule(schedule: WorkSchedule) {
  return (
    schedule.clock_in_by.startsWith("10:45") &&
    schedule.clock_out_after.startsWith("19:00") &&
    !schedule.wednesday_clock_in_by
  );
}

export function scheduleForNewEmployee(fullName: string, email: string) {
  const haystack = `${fullName} ${email}`.toLowerCase();
  if (haystack.includes("sneha")) {
    return {
      clock_in_by: "15:45:00",
      clock_out_after: "19:00:00",
      wednesday_clock_in_by: "16:45:00",
    };
  }
  if (haystack.includes("aditya")) {
    return {
      clock_in_by: "14:15:00",
      clock_out_after: "18:00:00",
      wednesday_clock_in_by: null,
    };
  }
  return {};
}

export function clockRuleCopy(schedule: WorkSchedule, isoDate: string) {
  const todayIn = formatClockTime(clockInByForDate(schedule, isoDate));
  const out = formatClockTime(schedule.clock_out_after);

  if (!schedule.wednesday_clock_in_by) {
    return `Clock in by ${todayIn} IST for a full day. Clock out at or after ${out} IST.`;
  }

  const otherIn = formatClockTime(schedule.clock_in_by);
  const wedIn = formatClockTime(schedule.wednesday_clock_in_by);
  const todayIsWednesday = istWeekdayLong(isoDate) === "Wednesday";

  if (todayIsWednesday) {
    return `Clock in by ${wedIn} IST for a full day (${otherIn} other days). Clock out at or after ${out} IST.`;
  }

  return `Clock in by ${otherIn} IST for a full day (${wedIn} on Wednesdays). Clock out at or after ${out} IST.`;
}

export function scheduleSummary(schedule: WorkSchedule) {
  const inTime = formatClockTime(schedule.clock_in_by);
  const outTime = formatClockTime(schedule.clock_out_after);
  if (!schedule.wednesday_clock_in_by) {
    return `${inTime} – ${outTime}`;
  }
  return `${inTime} – ${outTime} · Wed ${formatClockTime(schedule.wednesday_clock_in_by)}`;
}
