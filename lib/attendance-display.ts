import type { Attendance } from "@/lib/database.types";
import { formatClockTime, type WorkSchedule } from "@/lib/schedule";

export type DisplayStatus = "Not started" | "In progress" | "Full day" | "Half day";

export function dayDisplayStatus(
  row: Attendance | null,
  schedule?: WorkSchedule | null
) {
  if (!row?.clock_in) {
    return {
      status: "Not started" as const,
      reason: null as string | null,
    };
  }

  if (!row.clock_out) {
    const out = formatClockTime(schedule?.clock_out_after ?? "19:00:00");
    return {
      status: "In progress" as const,
      reason: `Clock out after ${out} for a full day`,
    };
  }

  return {
    status: (row.status ?? "Half day") as "Full day" | "Half day",
    reason: row.status_reason,
  };
}
